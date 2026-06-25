-- =============================================================================
-- NeoTravel — Vérifier les comptes (à lancer dans Supabase → SQL Editor)
-- Montre, pour chaque utilisateur : email confirmé ?, rôle, nb d'identités,
-- et un verdict "connexion OK" / "PROBLEME".
-- =============================================================================
select
  u.email,
  case when u.email_confirmed_at is not null then 'oui' else 'NON' end               as email_confirme,
  case when p.role = 'admin' then 'ADMIN' else 'client' end                          as role,
  (select count(*) from auth.identities i where i.user_id = u.id)                    as nb_identites,
  case
    when u.email_confirmed_at is not null
     and exists (select 1 from auth.identities i where i.user_id = u.id)
      then 'connexion OK'
    else 'PROBLEME -> recréer via Authentication > Users > Add user'
  end                                                                                as verdict,
  u.created_at::date                                                                 as cree_le
from auth.users u
left join profiles p on p.id = u.id
order by u.created_at;
