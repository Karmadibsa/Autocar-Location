-- =============================================================================
-- NeoTravel — Supprimer les comptes de démo CASSÉS (créés en SQL)
-- À lancer dans Supabase → SQL Editor. Contourne le service Auth qui plante
-- ("Database error loading user").
-- =============================================================================

-- 1) Supprimer les identités liées (au cas où le cascade ne les couvre pas)
delete from auth.identities
 where user_id in (select id from auth.users where email in ('client1@email.fr','client2@email.fr'));

-- 2) Supprimer les utilisateurs (cascade sur sessions / refresh_tokens)
delete from auth.users
 where email in ('client1@email.fr','client2@email.fr');

-- 3) Nettoyer la fonction de création (on passera par le dashboard désormais)
drop function if exists creer_user_demo(text, text);
