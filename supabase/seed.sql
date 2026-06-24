-- =============================================================================
-- NeoTravel — SEED de DÉMO (données fictives)
-- À lancer APRÈS schema.sql (Supabase → SQL Editor → Run).
-- Re-exécutable sans erreur (on conflict do nothing).
-- =============================================================================

-- Clients
insert into clients (id, email, type_client, nom, telephone, consentement) values
 ('11111111-1111-1111-1111-111111111111','marie.durand@example.test','particulier','Marie Durand','0600000001',true),
 ('22222222-2222-2222-2222-222222222222','contact@rando-asso.test','association','Asso Les Randonneurs','0600000002',true),
 ('33333333-3333-3333-3333-333333333333','travel@techcorp.test','entreprise','TechCorp SAS','0600000003',true),
 ('44444444-4444-4444-4444-444444444444','vie.scolaire@college-voltaire.test','collectivite','College Voltaire','0600000004',true)
on conflict do nothing;

-- Demandes (statuts variés pour alimenter le pipeline)
insert into demandes (id, client_id, depart, destination, date_depart, date_retour, aller_retour, nb_passagers, type_trajet, urgence, distance_km, statut, score_completude, commentaire, created_at) values
 ('a1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','Lyon','Annecy','2026-07-14',null,false,50,'tourisme','normal',140,'qualifiee',100,'Sortie club', now() - interval '2 days'),
 ('a2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222','Paris','Deauville','2026-06-20','2026-06-22',true,35,'week-end','urgent',200,'devis_envoye',100,'Week-end association', now() - interval '5 days'),
 ('a3333333-3333-3333-3333-333333333333','33333333-3333-3333-3333-333333333333','Lyon','Geneve','2026-09-02',null,false,20,'seminaire','normal',150,'accepte',100,'Seminaire annuel', now() - interval '10 days'),
 ('a4444444-4444-4444-4444-444444444444','44444444-4444-4444-4444-444444444444','Marseille','Avignon','2026-05-10',null,false,60,'scolaire','prioritaire',100,'refuse',100,'Sortie pedagogique', now() - interval '12 days'),
 ('a5555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','Lyon','Chamonix','2026-08-01',null,false,45,'tourisme','normal',null,'incomplete',60,'Distance a preciser', now() - interval '1 day'),
 ('a6666666-6666-6666-6666-666666666666','22222222-2222-2222-2222-222222222222','Toulouse','Lourdes','2026-04-18',null,false,95,'pelerinage','prioritaire',180,'cas_complexe',100,'Gros groupe > 85 -> flux manuel', now() - interval '3 days')
on conflict do nothing;

-- Devis
insert into devis (id, demande_id, client_id, prix_ht, tva, prix_ttc, devise, lignes, coefficients, statut, date_envoi, prochaine_relance, nb_relances, created_at) values
 ('b2222222-2222-2222-2222-222222222222','a2222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222',1300,130,1430,'EUR',
   '[{"libelle":"Forfait aller/retour","montant":1000},{"libelle":"Coefficients appliques","montant":130},{"libelle":"Marge +15%","montant":170}]'::jsonb,
   '[{"libelle":"Saisonnalite (tres haute)","valeur":0.15},{"libelle":"Anticipation (DD_URGENT)","valeur":0.05}]'::jsonb,
   'envoye', now() - interval '4 days', now() + interval '1 day', 1, now() - interval '4 days'),
 ('b3333333-3333-3333-3333-333333333333','a3333333-3333-3333-3333-333333333333','33333333-3333-3333-3333-333333333333',852,85.2,937.2,'EUR',
   '[{"libelle":"Forfait","montant":780},{"libelle":"Coefficients appliques","montant":-39},{"libelle":"Marge +15%","montant":111}]'::jsonb,
   '[{"libelle":"Capacite","valeur":-0.05}]'::jsonb,
   'accepte', now() - interval '9 days', null, 0, now() - interval '9 days'),
 ('b4444444-4444-4444-4444-444444444444','a4444444-4444-4444-4444-444444444444','44444444-4444-4444-4444-444444444444',1900,190,2090,'EUR',
   '[{"libelle":"Longue distance","montant":1500},{"libelle":"Coefficients appliques","montant":252},{"libelle":"Marge +15%","montant":148}]'::jsonb,
   '[{"libelle":"Capacite","valeur":0.15},{"libelle":"Anticipation (DD_PRIORITAIRE)","valeur":0.10}]'::jsonb,
   'refuse', now() - interval '11 days', null, 1, now() - interval '11 days')
on conflict do nothing;

-- Relances (idempotence par cle unique)
insert into relances (id, devis_id, type, date_planifiee, statut, cle_idempotence, created_at) values
 ('c2222222-2222-2222-2222-222222222222','b2222222-2222-2222-2222-222222222222','J2', now() + interval '1 day','planifiee','b2222222-2222-2222-2222-222222222222-J2', now())
on conflict do nothing;

-- Conversation (historique de chat)
insert into conversations (id, client_id, demande_id, messages) values
 ('d1111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111','a1111111-1111-1111-1111-111111111111',
  '[{"role":"agent","contenu":"Bonjour, quel est votre besoin ?","ts":"2026-06-22T09:00:00Z"},{"role":"user","contenu":"Lyon - Annecy, 50 personnes le 14 juillet","ts":"2026-06-22T09:01:00Z"},{"role":"agent","contenu":"Tres bien, je prepare votre devis.","ts":"2026-06-22T09:01:30Z"}]'::jsonb)
on conflict do nothing;
