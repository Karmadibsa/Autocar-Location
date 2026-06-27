-- =============================================================================
-- Autocar Location — RESET DÉMO (à lancer AVANT une démo)
-- Met le schéma à jour (colonnes récentes), vide les données transactionnelles
-- et réinsère un jeu propre couvrant tous les statuts. Ne touche pas aux comptes.
-- =============================================================================

-- Migration idempotente (si le schéma date d'avant)
alter table clients add column if not exists prenom text;
alter table clients add column if not exists nom text;
alter table clients add column if not exists adresse text;
alter table clients add column if not exists code_postal text;
alter table clients add column if not exists ville text;
alter table devis   add column if not exists token uuid not null default gen_random_uuid();
alter table devis   add column if not exists raison_refus text;

truncate table conversations, relances, devis, demandes, clients restart identity cascade;

-- Rôle admin (sécurité : sinon /admin redirige)
insert into profiles (id, role) select id, 'admin' from auth.users where email = 'admin@autocar-location.fr'
  on conflict (id) do update set role = 'admin';

-- ---------- Clients (tous avec adresse) ----------
insert into clients (id, email, type_client, prenom, nom, telephone, adresse, code_postal, ville, consentement) values
 ('c1000000-0000-0000-0000-000000000001','client1@email.fr','particulier','Lucas','Bernard','0612345601','12 rue de la République','69001','Lyon',true),
 ('c2000000-0000-0000-0000-000000000002','client2@email.fr','particulier','Emma','Durand','0612345602','5 avenue des Fleurs','44000','Nantes',true),
 ('c3000000-0000-0000-0000-000000000003','marie.dubois@email.fr','entreprise','Marie','Dubois','0612345603','40 boulevard Haussmann','75009','Paris',true),
 ('c4000000-0000-0000-0000-000000000004','paul.martin@email.fr','particulier','Paul','Martin','0612345604','8 cours de l''Intendance','33000','Bordeaux',true),
 ('c5000000-0000-0000-0000-000000000005','sophie.leroy@email.fr','association','Sophie','Leroy','0612345605','22 rue Nationale','59000','Lille',true),
 ('c6000000-0000-0000-0000-000000000006','thomas.moreau@email.fr','collectivite','Thomas','Moreau','0612345606','1 place du Capitole','31000','Toulouse',true);

-- 1) Lucas — EN ATTENTE + relance DUE maintenant
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

-- 3) Paul Martin — PERDU
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d0000000-0000-0000-0000-000000000003','c4000000-0000-0000-0000-000000000004','Marseille','Avignon','2026-05-10',true,60,100,'normal','refuse', now() - interval '5 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000003','c4000000-0000-0000-0000-000000000004',1240.00,124.00,1364.00,'EUR',
  '[{"libelle":"Forfait transfert 100 km","montant":580},{"libelle":"Aller/retour (x2)","montant":580},{"libelle":"Coefficients (x1.15)","montant":174},{"libelle":"Marge +15%","montant":143.40}]'::jsonb,
  '[{"libelle":"Capacite 60 pax","valeur":0.15}]'::jsonb,'refuse', now() - interval '5 days', 1, now() - interval '5 days');

-- 4) Sophie Leroy — À TRAITER (cas complexe)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, commentaire, created_at) values
 ('d0000000-0000-0000-0000-000000000004','c5000000-0000-0000-0000-000000000005','Toulouse','Lourdes','2026-04-18',true,95,180,'normal','cas_complexe','Volume de 95 passagers > 85 : transfert a un commercial.', now() - interval '3 days');

-- 5) Thomas Moreau — À TRAITER (cas complexe, urgent)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, commentaire, created_at) values
 ('d0000000-0000-0000-0000-000000000005','c6000000-0000-0000-0000-000000000006','Dijon','Beaune','2026-07-12',false,120,45,'urgent','cas_complexe','Volume de 120 passagers > 85 : transfert a un commercial.', now() - interval '4 hours');

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

-- 8) Sophie Leroy — PERDU (devis expiré, clôturé)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d0000000-0000-0000-0000-000000000008','c5000000-0000-0000-0000-000000000005','Nice','Monaco','2026-06-28',true,55,25,'normal','cloture', now() - interval '40 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e0000000-0000-0000-0000-000000000008','d0000000-0000-0000-0000-000000000008','c5000000-0000-0000-0000-000000000005',720.00,72.00,792.00,'EUR',
  '[{"libelle":"Forfait transfert 25 km","montant":250},{"libelle":"Aller/retour (x2)","montant":250},{"libelle":"Coefficients (x1.15)","montant":75},{"libelle":"Marge +15%","montant":83.25}]'::jsonb,
  '[{"libelle":"Capacite 55 pax","valeur":0.15}]'::jsonb,'expire', now() - interval '40 days', 2, now() - interval '40 days');

-- 9-11) Haut de funnel (sans devis)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d0000000-0000-0000-0000-000000000009','c6000000-0000-0000-0000-000000000006','Rennes','Saint-Malo','2026-08-15',true,25,70,'normal','nouveau_lead', now() - interval '2 hours'),
 ('d0000000-0000-0000-0000-000000000010','c3000000-0000-0000-0000-000000000003','Paris','Deauville','2026-08-20',false,35,200,'normal','qualifiee', now() - interval '2 days'),
 ('d0000000-0000-0000-0000-000000000011','c4000000-0000-0000-0000-000000000004','Strasbourg','Colmar',null,false,null,null,'normal','incomplete', now() - interval '1 day');
