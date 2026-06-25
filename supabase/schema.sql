-- =============================================================================
-- Autocar Location — Schéma Supabase (PostgreSQL)
-- À exécuter dans Supabase : SQL Editor → coller → Run.
-- 7 tables + enums + RLS + seed des matrices de pricing.
-- Sécurité : un client ne voit que ses données (RLS) ; l'agent n8n et le
-- dashboard admin utilisent la SERVICE ROLE KEY (côté serveur, bypass RLS).
-- =============================================================================

create extension if not exists pgcrypto;

-- ----------------------------- ENUMS ----------------------------------------
do $$ begin
  create type statut_demande as enum
    ('nouveau_lead','incomplete','qualifiee','devis_envoye',
     'relance_1','relance_2','accepte','refuse','cas_complexe','cloture');
exception when duplicate_object then null; end $$;

do $$ begin
  create type statut_devis as enum ('brouillon','envoye','accepte','refuse','expire');
exception when duplicate_object then null; end $$;

do $$ begin
  create type type_relance as enum ('J2','J3','J7');
exception when duplicate_object then null; end $$;

-- --------------------------- PROFILES (rôle) --------------------------------
-- Lie un compte Auth à un rôle. role='admin' = direction/commerciaux.
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'client' check (role in ('client','admin')),
  created_at  timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- ------------------------------ CLIENTS -------------------------------------
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid references auth.users(id) on delete set null,
  email         text not null,
  type_client   text,                         -- particulier, association, entreprise, collectivité
  prenom        text,
  nom           text,
  telephone     text,
  adresse       text,                          -- adresse de facturation
  code_postal   text,
  ville         text,
  consentement  boolean not null default false, -- RGPD : consentement minimal
  created_at    timestamptz not null default now()
);
create unique index if not exists clients_email_key on clients (lower(email));

-- ------------------------------ DEMANDES ------------------------------------
create table if not exists demandes (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references clients(id) on delete cascade,
  depart         text,
  destination    text,
  date_depart    date,
  date_retour    date,
  aller_retour   boolean not null default false,
  nb_passagers   integer,
  type_trajet    text,
  urgence        text,                          -- normal, urgent, prioritaire
  distance_km    numeric,
  options        jsonb not null default '[]'::jsonb,
  statut         statut_demande not null default 'nouveau_lead',
  score_completude integer,                     -- 0..100
  commentaire    text,
  created_at     timestamptz not null default now()
);
create index if not exists demandes_client_idx on demandes(client_id);
create index if not exists demandes_statut_idx on demandes(statut);

-- ------------------------------- DEVIS --------------------------------------
create table if not exists devis (
  id               uuid primary key default gen_random_uuid(),
  demande_id       uuid references demandes(id) on delete cascade,
  client_id        uuid references clients(id) on delete cascade, -- dénormalisé pour RLS simple
  prix_ht          numeric,
  tva              numeric,
  prix_ttc         numeric,
  devise           text not null default 'EUR',
  lignes           jsonb not null default '[]'::jsonb,
  coefficients     jsonb not null default '[]'::jsonb,
  statut           statut_devis not null default 'brouillon',
  pdf_url          text,
  date_envoi       timestamptz,
  prochaine_relance timestamptz,
  nb_relances      integer not null default 0,
  token            uuid not null default gen_random_uuid(), -- lien email "refuser sans compte"
  created_at       timestamptz not null default now()
);
create index if not exists devis_demande_idx on devis(demande_id);
create index if not exists devis_client_idx on devis(client_id);

-- ------------------------------ RELANCES ------------------------------------
create table if not exists relances (
  id               uuid primary key default gen_random_uuid(),
  devis_id         uuid references devis(id) on delete cascade,
  type             type_relance not null,
  date_planifiee   timestamptz not null,
  statut           text not null default 'planifiee', -- planifiee, envoyee, annulee
  date_envoi       timestamptz,
  cle_idempotence  text not null,                -- empêche les relances en double
  created_at       timestamptz not null default now()
);
-- dedupe gate : une même relance (devis + type) ne part qu'une fois
create unique index if not exists relances_idem_key on relances(cle_idempotence);

-- ---------------------------- CONVERSATIONS ---------------------------------
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete cascade,
  demande_id  uuid references demandes(id) on delete set null,
  messages    jsonb not null default '[]'::jsonb, -- [{role, contenu, ts}]
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists conversations_client_idx on conversations(client_id);

-- --------------------------- PRICING CONFIG ---------------------------------
-- Matrices pilotables (miroir de pricing/matrices.js). Modifiable sans toucher au code.
create table if not exists pricing_config (
  id          integer primary key default 1 check (id = 1),
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

insert into pricing_config (id, data) values (1, '{
  "devise": "EUR",
  "grille_forfait": [
    {"max_km":30,"prix":250},{"max_km":40,"prix":320},{"max_km":50,"prix":350},
    {"max_km":60,"prix":390},{"max_km":70,"prix":430},{"max_km":80,"prix":500},
    {"max_km":90,"prix":540},{"max_km":100,"prix":580},{"max_km":110,"prix":620},
    {"max_km":120,"prix":660},{"max_km":130,"prix":700},{"max_km":140,"prix":740},
    {"max_km":150,"prix":780},{"max_km":160,"prix":820},{"max_km":170,"prix":860},
    {"max_km":180,"prix":900}
  ],
  "longue_distance": {"seuil_km":180,"multiplicateur_distance":2,"prix_km":2.5},
  "saison_par_mois": {
    "1":{"niveau":"basse","coef":-0.07},"2":{"niveau":"basse","coef":-0.07},
    "8":{"niveau":"basse","coef":-0.07},"11":{"niveau":"basse","coef":-0.07},
    "9":{"niveau":"moyenne","coef":0},"10":{"niveau":"moyenne","coef":0},"12":{"niveau":"moyenne","coef":0},
    "3":{"niveau":"haute","coef":0.10},"4":{"niveau":"haute","coef":0.10},"7":{"niveau":"haute","coef":0.10},
    "5":{"niveau":"tres_haute","coef":0.15},"6":{"niveau":"tres_haute","coef":0.15}
  },
  "pondation_date": [
    {"max_jours":6,"code":"DD_PRIORITAIRE","coef":0.10},
    {"max_jours":29,"code":"DD_URGENT","coef":0.05},
    {"max_jours":89,"code":"DD_NORMAL","coef":-0.05},
    {"max_jours":100000,"code":"DD_3MOISETPLUS","coef":-0.10}
  ],
  "pondation_capacite": [
    {"max":19,"coef":-0.05},{"max":53,"coef":0},{"max":63,"coef":0.15},
    {"max":67,"coef":0.20},{"max":85,"coef":0.40}
  ],
  "seuil_escalade_passagers": 85,
  "options": {"guide":80,"nuit_chauffeur":120,"peages":0},
  "marge": 0.15,
  "tva": 0.10
}'::jsonb)
on conflict (id) do nothing;

-- ============================== RLS =========================================
alter table clients       enable row level security;
alter table demandes      enable row level security;
alter table devis         enable row level security;
alter table relances      enable row level security;
alter table conversations enable row level security;
alter table profiles      enable row level security;

-- profiles : chacun lit/écrit son profil ; admin voit tout
create policy profiles_self on profiles for select using (id = auth.uid() or is_admin());

-- clients : un lead voit/édite son enregistrement ; admin voit tout
create policy clients_select on clients for select using (auth_user_id = auth.uid() or is_admin());
create policy clients_update on clients for update using (auth_user_id = auth.uid() or is_admin());

-- demandes / devis / conversations : restreints au client propriétaire (ou admin)
create policy demandes_select on demandes for select
  using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy devis_select on devis for select
  using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy conversations_select on conversations for select
  using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));

-- relances : admin uniquement côté client (gérées par n8n via service role)
create policy relances_admin on relances for select using (is_admin());

-- NB : l'agent n8n et le dashboard admin écrivent via la SERVICE ROLE KEY,
-- qui contourne RLS. pricing_config n'a aucune policy → lisible seulement en service role.
