-- =============================================================================
-- Autocar Location — RESET propre + données de démo (à lancer AVANT une démo)
-- Vide les données transactionnelles et réinsère un jeu couvrant TOUS les cas.
-- Ne touche PAS aux comptes (auth.users) ni aux paramètres de pricing.
-- =============================================================================
truncate table conversations, relances, devis, demandes, clients restart identity cascade;

-- ---------------------------------------------------------------------------
-- Clients (dont les 2 comptes de démo, reliés par email)
-- ---------------------------------------------------------------------------
insert into clients (id, email, type_client, prenom, nom, telephone, consentement) values
 ('c1000000-0000-0000-0000-000000000001','client1@email.fr','particulier','Lucas','Bernard','0600000001',true),
 ('c2000000-0000-0000-0000-000000000002','client2@email.fr','particulier','Emma','Durand','0600000002',true),
 ('c3000000-0000-0000-0000-000000000003','marie.dubois@email.fr','entreprise','Marie','Dubois','0600000003',true),
 ('c4000000-0000-0000-0000-000000000004','paul.martin@email.fr','particulier','Paul','Martin','0600000004',true)
on conflict do nothing;

-- ===========================================================================
-- DEMANDES + DEVIS — un cas par statut du pipeline
-- ===========================================================================

-- 1) client1 : EN ATTENTE (devis envoyé) + relance DUE maintenant (démo relance)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Lyon','Annecy','2026-07-12',true,50,139,'normal','devis_envoye', now() - interval '1 day');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, nb_relances, created_at) values
 ('e1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001',1957.30,195.73,2153.03,'EUR',
  '[{"libelle":"Forfait transfert 139 km","montant":740},{"libelle":"Aller/retour (x2)","montant":740},{"libelle":"Coefficients (x1.15)","montant":222},{"libelle":"Marge +15%","montant":255.30}]'::jsonb,
  '[{"libelle":"Saison (haute)","valeur":0.10},{"libelle":"Anticipation (DD_URGENT)","valeur":0.05}]'::jsonb,
  'envoye', now() - interval '1 day', now() - interval '1 hour', 0, now() - interval '1 day');
insert into conversations (id, client_id, demande_id, messages, updated_at) values
 ('f1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001',
  '[{"role":"agent","content":"Bonjour, quel est votre besoin ?"},{"role":"user","content":"Lyon vers Annecy, 50 personnes le 12 juillet en aller-retour"},{"role":"agent","content":"Votre devis est disponible, je vous invite a le consulter."}]'::jsonb,
  now() - interval '1 day')
on conflict do nothing;

-- 2) GAGNÉ (devis accepté)
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d2000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-000000000003','Bordeaux','Biarritz','2026-09-05',true,45,185,'normal','accepte', now() - interval '6 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e2000000-0000-0000-0000-000000000002','d2000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-000000000003',1180.00,118.00,1298.00,'EUR',
  '[{"libelle":"Longue distance 185 km","montant":925},{"libelle":"Coefficients (x1.05)","montant":101.25},{"libelle":"Marge +15%","montant":153.75}]'::jsonb,
  '[{"libelle":"Saison (moyenne)","valeur":0},{"libelle":"Capacite 45 pax","valeur":0}]'::jsonb,
  'accepte', now() - interval '6 days', 0, now() - interval '6 days');

-- 3) PERDU (devis refusé)
insert into demandes (id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d3000000-0000-0000-0000-000000000003','Marseille','Avignon','2026-05-10',true,60,100,'normal','refuse', now() - interval '5 days');
insert into devis (id, demande_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e3000000-0000-0000-0000-000000000003','d3000000-0000-0000-0000-000000000003',1240.00,124.00,1364.00,'EUR',
  '[{"libelle":"Forfait transfert 100 km","montant":580},{"libelle":"Aller/retour (x2)","montant":580},{"libelle":"Coefficients (x1.15)","montant":174},{"libelle":"Marge +15%","montant":143.40}]'::jsonb,
  '[{"libelle":"Capacite 60 pax","valeur":0.15}]'::jsonb,
  'refuse', now() - interval '5 days', 1, now() - interval '5 days');

-- 4) À TRAITER (cas complexe : > 85 passagers)
insert into demandes (id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, commentaire, created_at) values
 ('d4000000-0000-0000-0000-000000000004','Toulouse','Lourdes','2026-04-18',true,95,180,'normal','cas_complexe',
  'Volume de 95 passagers > 85 : transfert a un commercial.', now() - interval '3 days'),
 ('d4000000-0000-0000-0000-000000000005','Dijon','Beaune','2026-07-12',false,120,45,'urgent','cas_complexe',
  'Volume de 120 passagers > 85 : transfert a un commercial.', now() - interval '4 hours');

-- 5) EN ATTENTE — relance 1 en cours
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d5000000-0000-0000-0000-000000000006','c4000000-0000-0000-0000-000000000004','Lille','Bruxelles','2026-09-10',true,30,110,'normal','relance_1', now() - interval '4 days');
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, nb_relances, created_at) values
 ('e5000000-0000-0000-0000-000000000006','d5000000-0000-0000-0000-000000000006','c4000000-0000-0000-0000-000000000004',860.00,86.00,946.00,'EUR',
  '[{"libelle":"Forfait transfert 110 km","montant":620},{"libelle":"Coefficients (x1.05)","montant":31},{"libelle":"Marge +15%","montant":97.65}]'::jsonb,
  '[{"libelle":"Anticipation (DD_NORMAL)","valeur":-0.05}]'::jsonb,
  'envoye', now() - interval '4 days', now() + interval '3 days', 1, now() - interval '4 days');

-- 6) EN ATTENTE — relance 2 (dernière avant clôture)
insert into demandes (id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d6000000-0000-0000-0000-000000000007','Nantes','La Baule','2026-10-02',true,12,75,'normal','relance_2', now() - interval '8 days');
insert into devis (id, demande_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, nb_relances, created_at) values
 ('e6000000-0000-0000-0000-000000000007','d6000000-0000-0000-0000-000000000007',540.00,54.00,594.00,'EUR',
  '[{"libelle":"Forfait transfert 75 km","montant":430},{"libelle":"Coefficients (x0.95)","montant":-21.50},{"libelle":"Marge +15%","montant":61.50}]'::jsonb,
  '[{"libelle":"Petit groupe 12 pax","valeur":-0.05}]'::jsonb,
  'envoye', now() - interval '8 days', now() - interval '2 hours', 2, now() - interval '8 days');

-- 7) PERDU — clôturé après 2 relances sans réponse
insert into demandes (id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d7000000-0000-0000-0000-000000000008','Nice','Monaco','2026-06-28',true,55,25,'normal','cloture', now() - interval '14 days');
insert into devis (id, demande_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, nb_relances, created_at) values
 ('e7000000-0000-0000-0000-000000000008','d7000000-0000-0000-0000-000000000008',720.00,72.00,792.00,'EUR',
  '[{"libelle":"Forfait transfert 25 km","montant":250},{"libelle":"Aller/retour (x2)","montant":250},{"libelle":"Coefficients (x1.15)","montant":75},{"libelle":"Marge +15%","montant":83.25}]'::jsonb,
  '[{"libelle":"Capacite 55 pax","valeur":0.15}]'::jsonb,
  'expire', now() - interval '14 days', 2, now() - interval '14 days');

-- 8) Demandes sans devis (haut de funnel) : nouveau lead / qualifiée / incomplète
insert into demandes (id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, urgence, statut, created_at) values
 ('d8000000-0000-0000-0000-000000000009','Rennes','Saint-Malo','2026-08-15',true,25,70,'normal','nouveau_lead', now() - interval '2 hours'),
 ('d8000000-0000-0000-0000-000000000010','Paris','Deauville','2026-08-20',false,35,200,'normal','qualifiee', now() - interval '2 days'),
 ('d8000000-0000-0000-0000-000000000011','Strasbourg','Colmar',null,false,null,null,'normal','incomplete', now() - interval '1 day');
