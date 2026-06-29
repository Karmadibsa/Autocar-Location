-- =============================================================================
-- Migration non destructive : annuaire des autocaristes partenaires.
-- Crée la table + sa politique RLS (lecture admin). Les données mock se chargent
-- via seed-autocaristes.sql. Idempotent : relançable sans risque.
-- =============================================================================
create table if not exists autocaristes (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null,
  ville         text,
  departement   text,
  nb_vehicules  integer,
  capacite_max  integer,
  contact_email text,
  contact_tel   text,
  note          numeric,
  specialites   text,
  actif         boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table autocaristes enable row level security;
do $$ begin
  create policy autocaristes_admin on autocaristes for select using (is_admin());
exception when duplicate_object then null; end $$;
