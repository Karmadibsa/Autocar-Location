-- =============================================================================
-- Migration non destructive : signature électronique simple à l'acceptation.
-- Stocke la signature (image base64), le nom du signataire, l'horodatage et
-- l'acceptation des CGV sur le devis. Idempotent : relançable sans risque.
-- =============================================================================
alter table devis add column if not exists signature_image text;       -- data URL PNG
alter table devis add column if not exists signe_par      text;        -- nom saisi
alter table devis add column if not exists signe_le       timestamptz; -- horodatage
alter table devis add column if not exists cgv_acceptees  boolean not null default false;
