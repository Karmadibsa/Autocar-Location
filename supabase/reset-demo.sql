-- =============================================================================
-- NeoTravel — RESET propre + données de démo (à lancer AVANT une démo)
-- Vide les données transactionnelles et réinsère un jeu propre et lisible.
-- Ne touche PAS aux comptes (auth.users) ni aux paramètres de pricing.
-- =============================================================================
truncate table conversations, relances, devis, demandes, clients restart identity cascade;

-- Clients (dont les 2 comptes de démo, reliés par email)
insert into clients (id, email, type_client, nom, telephone, consentement) values
 ('c1000000-0000-0000-0000-000000000001','client1@email.fr','particulier','Client Un','0600000001',true),
 ('c2000000-0000-0000-0000-000000000002','client2@email.fr','particulier','Client Deux','0600000002',true)
on conflict do nothing;

-- client1 a une demande + un devis + une conversation
insert into demandes (id, client_id, depart, destination, date_depart, aller_retour, nb_passagers, distance_km, statut, created_at) values
 ('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Lyon','Annecy','2026-07-12',true,50,150,'devis_envoye', now() - interval '1 day')
on conflict do nothing;

insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, created_at) values
 ('e1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001',
  2063.10, 206.31, 2269.41, 'EUR',
  '[{"libelle":"Forfait transfert 150 km","montant":780},{"libelle":"Aller/retour (x2)","montant":780},{"libelle":"Coefficients (x1.15)","montant":234},{"libelle":"Marge +15%","montant":269.10}]'::jsonb,
  '[{"libelle":"Saison (haute)","valeur":0.10},{"libelle":"Anticipation (DD_URGENT)","valeur":0.05}]'::jsonb,
  'envoye', now() - interval '1 day', now() - interval '1 hour', now() - interval '1 day')
on conflict do nothing;

insert into conversations (id, client_id, demande_id, messages, updated_at) values
 ('f1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001',
  '[{"role":"agent","content":"Bonjour, quel est votre besoin ?"},{"role":"user","content":"Lyon vers Annecy, 50 personnes le 12 juillet en aller-retour"},{"role":"agent","content":"Votre devis est disponible, je vous invite a le consulter."}]'::jsonb,
  now() - interval '1 day')
on conflict do nothing;

-- Quelques demandes supplémentaires pour remplir le dashboard (sans client)
insert into demandes (id, depart, destination, date_depart, nb_passagers, statut, created_at) values
 ('d9000000-0000-0000-0000-000000000002','Paris','Deauville','2026-06-20',35,'qualifiee', now() - interval '2 days'),
 ('d9000000-0000-0000-0000-000000000003','Marseille','Avignon','2026-05-10',60,'refuse', now() - interval '5 days'),
 ('d9000000-0000-0000-0000-000000000004','Toulouse','Lourdes','2026-04-18',95,'cas_complexe', now() - interval '3 days')
on conflict do nothing;
