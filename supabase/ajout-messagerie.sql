-- =============================================================================
-- Migration non destructive : messagerie HITL bidirectionnelle (client <-> admin).
-- Ajoute deux drapeaux « message non lu » sur les demandes. Le fil de discussion
-- lui-même réutilise la table `conversations` (colonne messages jsonb).
-- Idempotent : relançable sans risque.
-- =============================================================================
alter table demandes add column if not exists msg_non_lu_admin  boolean not null default false;
alter table demandes add column if not exists msg_non_lu_client boolean not null default false;
