-- =============================================================================
-- NeoTravel — RESET COMPLET (à lancer dans Supabase → SQL Editor)
-- Supprime TOUT (tables + types) puis recrée le schéma propre + données de démo.
-- Ne touche PAS aux comptes auth.users (tes connexions restent valides).
-- =============================================================================

drop table if exists conversations, relances, devis, demandes, clients, pricing_config, profiles cascade;
drop type  if exists statut_demande, statut_devis, type_relance cascade;
drop function if exists is_admin cascade;

create extension if not exists pgcrypto;

-- ---------- ENUMS ----------
create type statut_demande as enum
  ('nouveau_lead','incomplete','qualifiee','devis_envoye','relance_1','relance_2','accepte','refuse','cas_complexe','cloture');
create type statut_devis as enum ('brouillon','envoye','accepte','refuse','expire');
create type type_relance as enum ('J2','J3','J7');

-- ---------- TABLES ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz not null default now()
);
create function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'); $$;

create table clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null, type_client text, nom text, telephone text,
  consentement boolean not null default false, created_at timestamptz not null default now()
);
create unique index clients_email_key on clients (lower(email));

create table demandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  depart text, destination text, date_depart date, date_retour date,
  aller_retour boolean not null default false, nb_passagers integer, type_trajet text,
  urgence text, distance_km numeric, options jsonb not null default '[]'::jsonb,
  statut statut_demande not null default 'nouveau_lead', score_completude integer,
  commentaire text, created_at timestamptz not null default now()
);

create table devis (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid references demandes(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  prix_ht numeric, tva numeric, prix_ttc numeric, devise text not null default 'EUR',
  lignes jsonb not null default '[]'::jsonb, coefficients jsonb not null default '[]'::jsonb,
  statut statut_devis not null default 'brouillon', pdf_url text, date_envoi timestamptz,
  prochaine_relance timestamptz, nb_relances integer not null default 0,
  created_at timestamptz not null default now()
);

create table relances (
  id uuid primary key default gen_random_uuid(),
  devis_id uuid references devis(id) on delete cascade,
  type type_relance not null, date_planifiee timestamptz not null,
  statut text not null default 'planifiee', date_envoi timestamptz,
  cle_idempotence text not null, created_at timestamptz not null default now()
);
create unique index relances_idem_key on relances(cle_idempotence);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  demande_id uuid references demandes(id) on delete set null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table pricing_config (id integer primary key default 1 check (id = 1), data jsonb not null, updated_at timestamptz not null default now());
insert into pricing_config (id, data) values (1, '{
  "devise":"EUR",
  "grille_forfait":[{"max_km":30,"prix":250},{"max_km":40,"prix":320},{"max_km":50,"prix":350},{"max_km":60,"prix":390},{"max_km":70,"prix":430},{"max_km":80,"prix":500},{"max_km":90,"prix":540},{"max_km":100,"prix":580},{"max_km":110,"prix":620},{"max_km":120,"prix":660},{"max_km":130,"prix":700},{"max_km":140,"prix":740},{"max_km":150,"prix":780},{"max_km":160,"prix":820},{"max_km":170,"prix":860},{"max_km":180,"prix":900}],
  "longue_distance":{"seuil_km":180,"multiplicateur_distance":2,"prix_km":2.5},
  "saison_par_mois":{"1":{"niveau":"basse","coef":-0.07},"2":{"niveau":"basse","coef":-0.07},"8":{"niveau":"basse","coef":-0.07},"11":{"niveau":"basse","coef":-0.07},"9":{"niveau":"moyenne","coef":0},"10":{"niveau":"moyenne","coef":0},"12":{"niveau":"moyenne","coef":0},"3":{"niveau":"haute","coef":0.10},"4":{"niveau":"haute","coef":0.10},"7":{"niveau":"haute","coef":0.10},"5":{"niveau":"tres_haute","coef":0.15},"6":{"niveau":"tres_haute","coef":0.15}},
  "pondation_date":[{"max_jours":6,"code":"DD_PRIORITAIRE","coef":0.10},{"max_jours":29,"code":"DD_URGENT","coef":0.05},{"max_jours":89,"code":"DD_NORMAL","coef":-0.05},{"max_jours":100000,"code":"DD_3MOISETPLUS","coef":-0.10}],
  "pondation_capacite":[{"max":19,"coef":-0.05},{"max":53,"coef":0},{"max":63,"coef":0.15},{"max":67,"coef":0.20},{"max":85,"coef":0.40}],
  "seuil_escalade_passagers":85,"options":{"guide":80,"nuit_chauffeur":120,"peages":0},"marge":0.15,"tva":0.10
}'::jsonb);

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table clients enable row level security;
alter table demandes enable row level security;
alter table devis enable row level security;
alter table relances enable row level security;
alter table conversations enable row level security;
create policy profiles_self on profiles for select using (id = auth.uid() or is_admin());
create policy clients_select on clients for select using (auth_user_id = auth.uid() or is_admin());
create policy demandes_select on demandes for select using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy devis_select on devis for select using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy conversations_select on conversations for select using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy relances_admin on relances for select using (is_admin());

-- ---------- (Re)définir les rôles admin pour les comptes existants ----------
insert into profiles (id, role) select id, 'admin' from auth.users where email = 'admin@neotravel.fr'
  on conflict (id) do update set role = 'admin';

-- ---------- DONNÉES DE DÉMO ----------
insert into clients (id, email, type_client, nom, telephone, consentement) values
 ('c1000000-0000-0000-0000-000000000001','client1@email.fr','particulier','Client Un','0600000001',true),
 ('c2000000-0000-0000-0000-000000000002','client2@email.fr','particulier','Client Deux','0600000002',true);
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, statut, created_at) values
 ('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Lyon','Annecy','2026-07-12',true,50,150,'devis_envoye', now() - interval '1 day');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, created_at) values
 ('e1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001',2063.10,206.31,2269.41,'EUR',
  '[{"libelle":"Forfait transfert 150 km","montant":780},{"libelle":"Aller/retour (x2)","montant":780},{"libelle":"Coefficients (x1.15)","montant":234},{"libelle":"Marge +15%","montant":269.10}]'::jsonb,
  '[{"libelle":"Saison (haute)","valeur":0.10},{"libelle":"Anticipation (DD_URGENT)","valeur":0.05}]'::jsonb,'envoye', now() - interval '1 day', now() - interval '1 day');
insert into conversations (id, client_id, demande_id, messages, updated_at) values
 ('f1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001',
  '[{"role":"agent","content":"Bonjour, quel est votre besoin ?"},{"role":"user","content":"Lyon vers Annecy, 50 personnes le 12 juillet aller-retour"},{"role":"agent","content":"Votre devis est disponible."}]'::jsonb, now() - interval '1 day');
insert into demandes (id, depart, destination, date_depart, nb_passagers, statut, created_at) values
 ('d9000000-0000-0000-0000-000000000002','Paris','Deauville','2026-06-20',35,'qualifiee', now() - interval '2 days'),
 ('d9000000-0000-0000-0000-000000000003','Marseille','Avignon','2026-05-10',60,'refuse', now() - interval '5 days'),
 ('d9000000-0000-0000-0000-000000000004','Toulouse','Lourdes','2026-04-18',95,'cas_complexe', now() - interval '3 days');
