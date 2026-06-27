-- =============================================================================
-- NeoTravel — Comptes de DÉMO (à lancer UNE fois dans Supabase → SQL Editor)
-- Crée 2 comptes clients email/mot de passe :
--   client1@email.fr / client   (aura un devis)
--   client2@email.fr / client   (vide)
-- L'admin (admin@autocar-location.fr) est créé à part + passé admin (voir bas de fichier).
--
-- ⚠️ Si cette requête échoue (selon ta version de Supabase), crée les users via
--    Authentication → Users → Add user (email + mot de passe) : c'est équivalent.
-- =============================================================================
create extension if not exists pgcrypto;

create or replace function creer_user_demo(p_email text, p_password text) returns uuid
language plpgsql security definer as $$
declare uid uuid;
begin
  select id into uid from auth.users where email = p_email;
  if uid is not null then return uid; end if;
  uid := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
          p_email, crypt(p_password, gen_salt('bf')),
          now(), now(), now(),
          '{"provider":"email","providers":["email"]}', '{}');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
          json_build_object('sub', uid::text, 'email', p_email, 'email_verified', true),
          'email', now(), now());
  return uid;
end $$;

select creer_user_demo('client1@email.fr', 'client');
select creer_user_demo('client2@email.fr', 'client');

-- (Optionnel) créer aussi l'admin par SQL puis le passer admin :
-- select creer_user_demo('admin@autocar-location.fr', '123456');
-- insert into profiles (id, role)
--   select id, 'admin' from auth.users where email = 'admin@autocar-location.fr'
--   on conflict (id) do update set role = 'admin';
