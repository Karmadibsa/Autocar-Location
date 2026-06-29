-- =============================================================================
-- Autocar Location — RESET COMPLET (Supabase → SQL Editor → Run)
-- Supprime TOUT (tables + types) puis recrée le schéma propre + un jeu de
-- données clair couvrant tous les statuts. Ne touche PAS aux comptes auth.users.
-- =============================================================================

drop table if exists conversations, relances, devis, demandes, clients, pricing_config, autocaristes, profiles cascade;
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
  email text not null, type_client text, prenom text, nom text, telephone text,
  adresse text, code_postal text, ville text,
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
  commentaire text, created_at timestamptz not null default now(),
  -- Messagerie HITL (thread par demande dans `conversations`) : drapeaux "non lu".
  msg_non_lu_admin boolean not null default false,
  msg_non_lu_client boolean not null default false
);

create table devis (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid references demandes(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  prix_ht numeric, tva numeric, prix_ttc numeric, devise text not null default 'EUR',
  lignes jsonb not null default '[]'::jsonb, coefficients jsonb not null default '[]'::jsonb,
  statut statut_devis not null default 'brouillon', pdf_url text, date_envoi timestamptz,
  prochaine_relance timestamptz, nb_relances integer not null default 0,
  token uuid not null default gen_random_uuid(), raison_refus text,
  -- Signature électronique simple (à l'acceptation)
  signature_image text, signe_par text, signe_le timestamptz,
  cgv_acceptees boolean not null default false,
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

-- Annuaire des autocaristes partenaires (avec qui on travaille) — données mock.
create table autocaristes (
  id uuid primary key default gen_random_uuid(),
  nom text not null, ville text, departement text,
  nb_vehicules integer, capacite_max integer,
  contact_email text, contact_tel text,
  note numeric, specialites text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table pricing_config (id integer primary key default 1 check (id = 1), data jsonb not null, updated_at timestamptz not null default now());
insert into pricing_config (id, data) values (1, '{
  "devise":"EUR",
  "grille_forfait":[{"max_km":30,"prix":250},{"max_km":40,"prix":320},{"max_km":50,"prix":350},{"max_km":60,"prix":390},{"max_km":70,"prix":430},{"max_km":80,"prix":500},{"max_km":90,"prix":540},{"max_km":100,"prix":580},{"max_km":110,"prix":620},{"max_km":120,"prix":660},{"max_km":130,"prix":700},{"max_km":140,"prix":740},{"max_km":150,"prix":780},{"max_km":160,"prix":820},{"max_km":170,"prix":860},{"max_km":180,"prix":900}],
  "longue_distance":{"seuil_km":180,"multiplicateur_distance":2,"prix_km":2.5},
  "saison_par_mois":{"1":{"niveau":"basse","coef":-0.07},"2":{"niveau":"basse","coef":-0.07},"8":{"niveau":"basse","coef":-0.07},"11":{"niveau":"basse","coef":-0.07},"9":{"niveau":"moyenne","coef":0},"10":{"niveau":"moyenne","coef":0},"12":{"niveau":"moyenne","coef":0},"3":{"niveau":"haute","coef":0.10},"4":{"niveau":"haute","coef":0.10},"7":{"niveau":"haute","coef":0.10},"5":{"niveau":"tres_haute","coef":0.15},"6":{"niveau":"tres_haute","coef":0.15}},
  "pondation_date":[{"max_jours":6,"code":"DD_PRIORITAIRE","coef":0.10},{"max_jours":29,"code":"DD_URGENT","coef":0.05},{"max_jours":89,"code":"DD_NORMAL","coef":-0.05},{"max_jours":100000,"code":"DD_3MOISETPLUS","coef":-0.10}],
  "pondation_capacite":[{"max":19,"coef":-0.05},{"max":53,"coef":0},{"max":55,"coef":0.15}],
  "seuil_escalade_passagers":55,"options":{"guide":80,"nuit_chauffeur":120,"peages":0},"marge":0.15,"tva":0.10
}'::jsonb);

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table clients enable row level security;
alter table demandes enable row level security;
alter table devis enable row level security;
alter table relances enable row level security;
alter table conversations enable row level security;
alter table autocaristes enable row level security;
create policy profiles_self on profiles for select using (id = auth.uid() or is_admin());
create policy autocaristes_admin on autocaristes for select using (is_admin());
create policy clients_select on clients for select using (auth_user_id = auth.uid() or is_admin());
create policy clients_update on clients for update using (auth_user_id = auth.uid() or is_admin());
create policy demandes_select on demandes for select using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy devis_select on devis for select using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy conversations_select on conversations for select using (is_admin() or client_id in (select id from clients where auth_user_id = auth.uid()));
create policy relances_admin on relances for select using (is_admin());

-- ---------- Rôle admin pour le compte existant ----------
insert into profiles (id, role) select id, 'admin' from auth.users where email = 'admin@autocar-location.fr'
  on conflict (id) do update set role = 'admin';

-- ============================================================================
-- DONNÉES DE DÉMO — chaque demande est liée à un client ; tous les statuts
-- ============================================================================
insert into clients (id, email, type_client, prenom, nom, telephone, adresse, code_postal, ville, consentement) values
 ('c1000000-0000-0000-0000-000000000001','client1@email.fr','particulier','Lucas','Bernard','0612345601','12 rue de la République','69001','Lyon',true),
 ('c2000000-0000-0000-0000-000000000002','client2@email.fr','particulier','Emma','Durand','0612345602','5 avenue des Fleurs','44000','Nantes',true),
 ('c3000000-0000-0000-0000-000000000003','marie.dubois@email.fr','entreprise','Marie','Dubois','0612345603','40 boulevard Haussmann','75009','Paris',true),
 ('c4000000-0000-0000-0000-000000000004','paul.martin@email.fr','particulier','Paul','Martin','0612345604','8 cours de l''Intendance','33000','Bordeaux',true),
 ('c5000000-0000-0000-0000-000000000005','sophie.leroy@email.fr','association','Sophie','Leroy','0612345605','22 rue Nationale','59000','Lille',true),
 ('c6000000-0000-0000-0000-000000000006','thomas.moreau@email.fr','collectivite','Thomas','Moreau','0612345606','1 place du Capitole','31000','Toulouse',true);

-- 1) Lucas — EN ATTENTE + relance DUE maintenant (démo relance)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d0000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Lyon','Annecy','2026-07-12',true,50,139,'normal','devis_envoye', now() - interval '1 day');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, nb_relances, created_at) values
 ('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001',1957.30,195.73,2153.03,'EUR',
  '[{"libelle":"Forfait transfert 139 km","montant":740},{"libelle":"Aller/retour (x2)","montant":740},{"libelle":"Coefficients (x1.15)","montant":222},{"libelle":"Marge +15%","montant":255.30}]'::jsonb,
  '[{"libelle":"Saison (haute)","valeur":0.10},{"libelle":"Anticipation (DD_URGENT)","valeur":0.05}]'::jsonb,'envoye', now() - interval '1 day', now() - interval '1 hour', 0, now() - interval '1 day');
insert into conversations (id, client_id, demande_id, messages, updated_at) values
 ('f0000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',
  '[{"role":"agent","content":"Bonjour, quel est votre besoin ?"},{"role":"user","content":"Lyon vers Annecy, 50 personnes le 12 juillet aller-retour"},{"role":"agent","content":"Votre devis est disponible."}]'::jsonb, now() - interval '1 day');

-- 2) Marie Dubois — GAGNÉ
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d0000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-000000000003','Bordeaux','Biarritz','2026-09-05',true,45,185,'normal','accepte', now() - interval '6 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-000000000003',1180.00,118.00,1298.00,'EUR',
  '[{"libelle":"Longue distance 185 km","montant":925},{"libelle":"Coefficients (x1.05)","montant":101.25},{"libelle":"Marge +15%","montant":153.75}]'::jsonb,
  '[{"libelle":"Saison (moyenne)","valeur":0}]'::jsonb,'accepte', now() - interval '6 days', 0, now() - interval '6 days');

-- 3) Paul Martin — PERDU (refusé)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d0000000-0000-0000-0000-000000000003','c4000000-0000-0000-0000-000000000004','Marseille','Avignon','2026-05-10',true,55,100,'normal','refuse', now() - interval '5 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000003','c4000000-0000-0000-0000-000000000004',1240.00,124.00,1364.00,'EUR',
  '[{"libelle":"Forfait transfert 100 km","montant":580},{"libelle":"Aller/retour (x2)","montant":580},{"libelle":"Coefficients (x1.15)","montant":174},{"libelle":"Marge +15%","montant":143.40}]'::jsonb,
  '[{"libelle":"Capacite 55 pax","valeur":0.15}]'::jsonb,'refuse', now() - interval '5 days', 1, now() - interval '5 days');

-- 4) Sophie Leroy — À TRAITER (cas complexe > 85)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, commentaire, created_at) values
 ('d0000000-0000-0000-0000-000000000004','c5000000-0000-0000-0000-000000000005','Toulouse','Lourdes','2026-04-18',true,95,180,'normal','cas_complexe','Volume de 95 passagers > 55 : transfert a un commercial.', now() - interval '3 days');

-- 5) Thomas Moreau — À TRAITER (cas complexe, urgent)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, commentaire, created_at) values
 ('d0000000-0000-0000-0000-000000000005','c6000000-0000-0000-0000-000000000006','Dijon','Beaune','2026-07-12',false,120,45,'urgent','cas_complexe','Volume de 120 passagers > 55 : transfert a un commercial.', now() - interval '4 hours');

-- 6) Marie Dubois — EN ATTENTE (relance 1)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d0000000-0000-0000-0000-000000000006','c3000000-0000-0000-0000-000000000003','Lille','Bruxelles','2026-09-10',true,30,110,'normal','relance_1', now() - interval '4 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, nb_relances, created_at) values
 ('e0000000-0000-0000-0000-000000000006','d0000000-0000-0000-0000-000000000006','c3000000-0000-0000-0000-000000000003',860.00,86.00,946.00,'EUR',
  '[{"libelle":"Forfait transfert 110 km","montant":620},{"libelle":"Coefficients (x1.05)","montant":31},{"libelle":"Marge +15%","montant":97.65}]'::jsonb,
  '[{"libelle":"Anticipation (DD_NORMAL)","valeur":-0.05}]'::jsonb,'envoye', now() - interval '4 days', now() + interval '3 days', 1, now() - interval '4 days');

-- 7) Paul Martin — EN ATTENTE (relance 2, due)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d0000000-0000-0000-0000-000000000007','c4000000-0000-0000-0000-000000000004','Nantes','La Baule','2026-10-02',true,12,75,'normal','relance_2', now() - interval '8 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, nb_relances, created_at) values
 ('e0000000-0000-0000-0000-000000000007','d0000000-0000-0000-0000-000000000007','c4000000-0000-0000-0000-000000000004',540.00,54.00,594.00,'EUR',
  '[{"libelle":"Forfait transfert 75 km","montant":430},{"libelle":"Coefficients (x0.95)","montant":-21.50},{"libelle":"Marge +15%","montant":61.50}]'::jsonb,
  '[{"libelle":"Petit groupe 12 pax","valeur":-0.05}]'::jsonb,'envoye', now() - interval '8 days', now() - interval '2 hours', 2, now() - interval '8 days');

-- 8) Sophie Leroy — PERDU (clôturé après relances, devis expiré)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d0000000-0000-0000-0000-000000000008','c5000000-0000-0000-0000-000000000005','Nice','Monaco','2026-06-28',true,55,25,'normal','cloture', now() - interval '40 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e0000000-0000-0000-0000-000000000008','d0000000-0000-0000-0000-000000000008','c5000000-0000-0000-0000-000000000005',720.00,72.00,792.00,'EUR',
  '[{"libelle":"Forfait transfert 25 km","montant":250},{"libelle":"Aller/retour (x2)","montant":250},{"libelle":"Coefficients (x1.15)","montant":75},{"libelle":"Marge +15%","montant":83.25}]'::jsonb,
  '[{"libelle":"Capacite 55 pax","valeur":0.15}]'::jsonb,'expire', now() - interval '40 days', 2, now() - interval '40 days');

-- 9-11) Haut de funnel (sans devis), reliés à des clients
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d0000000-0000-0000-0000-000000000009','c6000000-0000-0000-0000-000000000006','Rennes','Saint-Malo','2026-08-15',true,25,70,'normal','nouveau_lead', now() - interval '2 hours'),
 ('d0000000-0000-0000-0000-000000000010','c3000000-0000-0000-0000-000000000003','Paris','Deauville','2026-08-20',false,35,200,'normal','qualifiee', now() - interval '2 days'),
 ('d0000000-0000-0000-0000-000000000011','c4000000-0000-0000-0000-000000000004','Strasbourg','Colmar',null,false,null,null,'normal','incomplete', now() - interval '1 day');

-- ---------- Annuaire autocaristes partenaires (mock) ----------
insert into autocaristes (nom, ville, departement, nb_vehicules, capacite_max, contact_email, contact_tel, note, specialites, actif) values
 ('Cars Rhône Évasion',      'Lyon',        'Rhône (69)',          18, 63, 'contact@rhone-evasion.fr',     '0472100100', 4.6, 'Tourisme, scolaire, longue distance', true),
 ('Alpes Autocars',          'Grenoble',    'Isère (38)',          12, 59, 'resa@alpes-autocars.fr',       '0476200200', 4.4, 'Montagne, navettes ski', true),
 ('Atlantique Voyages',      'Nantes',      'Loire-Atlantique (44)',22, 71, 'info@atlantique-voyages.fr',  '0240300300', 4.7, 'Grands groupes, événementiel', true),
 ('Gironde Cars',            'Bordeaux',    'Gironde (33)',        15, 63, 'contact@gironde-cars.fr',      '0556400400', 4.3, 'Vignobles, oenotourisme', true),
 ('Nord Évasion',            'Lille',       'Nord (59)',           20, 71, 'resa@nord-evasion.fr',         '0320500500', 4.5, 'Transfrontalier (Belgique)', true),
 ('Occitanie Bus',           'Toulouse',    'Haute-Garonne (31)',  16, 67, 'contact@occitanie-bus.fr',     '0561600600', 4.2, 'Pèlerinages, scolaire', true),
 ('Méditerranée Autocars',   'Marseille',   'Bouches-du-Rhône (13)',24, 71, 'info@medi-autocars.fr',       '0491700700', 4.1, 'Croisières, aéroport', true),
 ('Côte d''Azur Lignes',     'Nice',        'Alpes-Maritimes (06)',10, 53, 'resa@cotedazur-lignes.fr',     '0493800800', 4.8, 'Haut de gamme, séminaires', true),
 ('Alsace Cars',             'Strasbourg',  'Bas-Rhin (67)',       14, 63, 'contact@alsace-cars.fr',       '0388900900', 4.5, 'Marchés de Noël, Europe', true),
 ('Bretagne Mobilités',      'Rennes',      'Ille-et-Vilaine (35)',13, 59, 'info@bretagne-mobilites.fr',   '0299010101', 4.4, 'Littoral, scolaire', true),
 ('Bourgogne Tourisme Cars', 'Dijon',       'Côte-d''Or (21)',      9, 53, 'resa@bourgogne-cars.fr',       '0380020202', 4.0, 'Oenotourisme, petits groupes', true),
 ('Capitale Autocars',       'Paris',       'Paris (75)',          30, 71, 'contact@capitale-autocars.fr', '0140030303', 4.6, 'Grands événements, international', true),
 ('Loire Évasion',           'Angers',      'Maine-et-Loire (49)',  8, 53, 'info@loire-evasion.fr',        '0241040404', 3.9, 'Châteaux, scolaire', false),
 ('Champagne Cars',          'Reims',       'Marne (51)',          11, 59, 'resa@champagne-cars.fr',       '0326050505', 4.3, 'Oenotourisme, séminaires', true);
