# Autocar Location — Déploiement en ligne

> Oui, c'est déployable et **quasi 100 % gratuit**. Le seul point délicat est n8n (toujours en ligne + gratuit).
> Rappel : héberger la stack en prod = **bonus** au barème. Pour la soutenance, **n8n local + tunnel est accepté**.

## Vue d'ensemble

| Brique | Où | Coût | Note |
|--------|----|----|------|
| **Front Next.js** | **Vercel** (reco) ou Netlify | **Gratuit** | Vercel = natif Next 16, zéro config. Netlify marche aussi (plugin Next) mais peut traîner sur Next très récent. |
| **Base + Auth** | **Supabase** | **Gratuit** | Déjà en cloud → rien à changer, on réutilise les mêmes clés. |
| **Emails** | **Resend** | **Gratuit** | Domaine déjà vérifié → fonctionne en prod. |
| **Modèle IA** | **Google AI Studio (Gemma)** | **Gratuit** | Clé dans n8n. |
| **Distance** | OSRM + Nominatim | **Gratuit** | Appels serveur, sans clé. |
| **Agent n8n** | local+tunnel **ou** hébergé | **Gratuit\*** | Voir ci-dessous. |

→ **Coût total : 0 €** possible. n8n est la seule contrainte.

## 1. Front sur Vercel (gratuit, ~10 min)
1. Pousser le repo sur GitHub.
2. **vercel.com** → New Project → importer le repo → **Root Directory = `web`**.
3. **Environment Variables** (Settings → Environment Variables) :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
   - `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` (secrets)
   - `EMAIL_FROM`
   - `N8N_WEBHOOK_URL` = l'URL **publique** de n8n (tunnel ou hébergé) + `/webhook/neotravel`
   - `CRON_SECRET` = secret partagé pour `/api/relances` (mettre la même valeur côté n8n)
4. Deploy → tu obtiens une URL `https://...vercel.app`.
5. Supabase → **Authentication → URL Configuration → Site URL** = l'URL Vercel.

> Netlify : équivalent (Base directory `web`, mêmes variables). Si souci de build avec Next 16, bascule sur Vercel.

## 2. n8n en ligne — les options
- **Le plus simple (et accepté en soutenance)** : n8n **local + tunnel** → `npx n8n start --tunnel`. n8n donne une URL publique `https://...hooks.n8n.cloud/...`. Mets-la dans `N8N_WEBHOOK_URL` sur Vercel. **Gratuit.** Limite : ta machine doit tourner pendant la démo.
- **Hébergé gratuit (pour un vrai "toujours en ligne")** :
  - **Render** (free web service) : gratuit mais **se met en veille** après 15 min d'inactivité (cold start au réveil) ; prévoir un Postgres (Render free) pour persister les workflows.
  - **Fly.io** : allocation gratuite, pas de veille agressive ; un peu plus de config.
  - **Oracle Cloud Free** (VPS always-free) : 100 % gratuit et permanent, mais installation manuelle (Docker n8n).
- **n8n Cloud** : essai ~14 jours puis **payant** → pas retenu pour le gratuit.

**Reco** : pour la soutenance, **local + tunnel** (gratuit, accepté). Pour une démo publique permanente, **Fly.io** ou **Oracle Cloud Free**.

## 3. Relances automatiques en production
Le workflow **Relances** (Schedule) doit appeler le **front déployé**, pas `localhost` :
1. Dans n8n → workflow Relances → nœud **HTTP Request** → URL = `https://<ton-front>.vercel.app/api/relances`.
2. Body JSON = `{ "secret": "<CRON_SECRET>" }` (même valeur que la variable Vercel).
3. Garder le workflow **publié** ; en hébergé (Fly.io/Oracle) il tourne 24/7. En local+tunnel, il ne tourne que quand ta machine est allumée (suffisant pour la démo, déclenchable aussi via le bouton admin « Lancer les relances dues »).

## 4. Points d'attention
- **Secrets** : `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` → variables **serveur** (jamais `NEXT_PUBLIC_`). La clé **Gemma** reste dans n8n.
- **N8N_WEBHOOK_URL** : doit pointer vers une URL **joignable depuis internet** (pas `localhost`) une fois le front déployé.
- **Supabase Auth** : Site URL = domaine de prod.
- **OSRM/Nominatim** : services publics gratuits — ok en faible trafic (politique Nominatim : 1 req/s + User-Agent, déjà gérés).

## Récap "tout gratuit"
Front Vercel + Supabase + Resend + Gemma + OSRM = **0 €**.
n8n = **0 €** en local+tunnel (démo) ou self-host free (Fly.io / Oracle).
