# Autocar Location — Déploiement en ligne

Déployable et **quasi 100 % gratuit**. Seule contrainte : n8n doit tourner quelque part.
> Rappel barème : héberger en prod = **bonus**. Pour la soutenance, **n8n local + tunnel suffit**.

## Vue d'ensemble

| Brique | Hébergement | Coût |
|--------|-------------|------|
| Front Next.js | **Vercel** (reco) | Gratuit |
| Base + Auth | **Supabase** (déjà en cloud) | Gratuit |
| Emails | **Resend** | Gratuit |
| Modèle IA | **Google AI Studio (Gemma)** — clé dans n8n | Gratuit |
| Distance | OSRM + Nominatim (sans clé) | Gratuit |
| Agent n8n | local+tunnel **ou** Fly.io / Oracle Cloud | Gratuit |

---

## ✅ Côté Claude — déjà prêt dans le repo

- Code **buildé sans erreur**, lint 0, 29 tests front + 13 tests pricing verts.
- Toutes les **routes serveur** (`/api/*`) prêtes pour Vercel (runtime Node).
- **`web/.env.local.example`** à jour (liste exacte des variables).
- **`n8n/agent-workflow.json`** + **`n8n/relances-workflow.json`** prêts à importer.
- **`supabase/reset-complet.sql`** (schéma + données propres) et **`supabase/SCHEMA.md`**.
- Aucun secret committé (`.gitignore`).

Rien d'autre à coder. Les étapes ci-dessous sont des **réglages de comptes** (les tiens).

---

## 👉 Côté toi — à faire, dans l'ordre

### 1. Supabase (~5 min)
1. **SQL Editor** → coller et exécuter **`supabase/reset-complet.sql`**.
2. **Project Settings → API** → récupérer : `Project URL`, clé `anon`, clé `service_role`.
3. **Authentication → URL Configuration** :
   - *Site URL* = (à remplir après l'étape Vercel) `https://<ton-app>.vercel.app`
   - *Redirect URLs* → ajouter `https://<ton-app>.vercel.app/reset-password`
   - (En local, ajoute aussi `http://localhost:3000/reset-password`.)
4. Crée les comptes de démo si besoin (dashboard → Authentication → Add user) :
   `admin@neotravel.fr` / `123456`, `client1@email.fr` / `client`, `client2@email.fr` / `client`,
   puis rejoue **`supabase/ajout-prenom.sql`** (rôle admin + prénoms/adresses).

### 2. Resend (~3 min)
1. Vérifier ton **domaine** sur resend.com (déjà fait : `am-creative.fr`).
2. Récupérer la **clé API** (`re_...`).
3. L'expéditeur (`EMAIL_FROM`) doit être une adresse de ce domaine.

### 3. Pousser le code sur GitHub (~2 min)
```bash
# créer un repo vide sur github.com, puis :
git remote add origin https://github.com/<toi>/autocar-location.git
git push -u origin master
```

### 4. Front sur Vercel (~10 min)
1. **vercel.com** → New Project → importer le repo GitHub.
2. **Root Directory = `web`** (important : l'app Next est dans `web/`).
3. **Environment Variables** → ajouter (voir tableau plus bas).
4. **Deploy** → tu obtiens `https://<ton-app>.vercel.app`.
5. Retourne dans Supabase (étape 1.3) renseigner *Site URL* + *Redirect URL* avec cette adresse.
6. Mets aussi `NEXT_PUBLIC_SITE_URL` = cette adresse, puis **Redeploy**.

### 5. n8n en ligne
**Option A — soutenance (le plus simple, gratuit)** : `npx n8n start --tunnel` → n8n donne une URL publique.
**Option B — permanent** : Fly.io ou Oracle Cloud Free (Docker n8n).

Dans les deux cas :
1. **Importer** `n8n/agent-workflow.json` et `n8n/relances-workflow.json`.
2. Sur les 2 nœuds **Gemini**, sélectionner ta **credential Google Gemini** (clé AI Studio).
3. Copier l'URL du **Webhook** → la mettre dans `N8N_WEBHOOK_URL` sur Vercel (+ Redeploy).
4. Workflow **Relances** → nœud **HTTP Request** → URL = `https://<ton-app>.vercel.app/api/relances`,
   body JSON `{ "secret": "<CRON_SECRET>" }` (même valeur que sur Vercel).
5. **Publier** les 2 workflows.

### 6. Vérification post-déploiement
- Ouvrir `https://<ton-app>.vercel.app` → faire un devis dans le chat → email reçu.
- `/login` (admin) → `/admin` s'affiche (KPIs, courbe).
- `/docs` → l'explorateur d'API s'affiche.
- Cliquer « Lancer les relances dues » dans l'admin → réponse OK.

---

## Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Valeur | Visibilité |
|----------|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | publique |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon | publique |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role | **secret** |
| `N8N_WEBHOOK_URL` | `https://<n8n public>/webhook/neotravel` | serveur |
| `RESEND_API_KEY` | `re_...` | **secret** |
| `EMAIL_FROM` | `contact@am-creative.fr` | serveur |
| `CRON_SECRET` | secret partagé avec n8n | **secret** |
| `NEXT_PUBLIC_SITE_URL` | `https://<ton-app>.vercel.app` | publique |

> La clé **Gemma** (Google AI Studio) ne va **pas** sur Vercel : elle reste dans **n8n**.

## Points d'attention
- `N8N_WEBHOOK_URL` doit être joignable **depuis internet** (pas `localhost`) une fois en ligne.
- Les emails partent du **front** (routes `/api`), donc `RESEND_API_KEY` + `EMAIL_FROM` sont **obligatoires sur Vercel**.
- En local+tunnel, n8n (et donc les relances planifiées) ne tournent que **machine allumée** ; le bouton admin « Lancer les relances dues » reste utilisable manuellement.
- OSRM/Nominatim : services publics gratuits, ok en faible trafic (User-Agent déjà géré).

## Récap « tout gratuit »
Front Vercel + Supabase + Resend + Gemma + OSRM = **0 €**. n8n = **0 €** (tunnel ou self-host).
