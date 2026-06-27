# Autocar Location — Déploiement en ligne

Déployable et **quasi 100 % gratuit**. Seule contrainte : n8n doit tourner quelque part.
> Rappel barème : héberger en prod = **bonus**. Pour la soutenance, **n8n local + tunnel suffit**.

## Vue d'ensemble

| Brique | Hébergement | Coût |
|--------|-------------|------|
| Front Next.js | **Netlify** (plugin Next) | Gratuit |
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

### 4. Front sur Netlify (~10 min)
La config est déjà dans **`netlify.toml`** (base = `web`, plugin Next) → rien à régler côté build.
1. **app.netlify.com** → Add new site → Import an existing project → choisir le repo GitHub.
2. Netlify lit `netlify.toml` automatiquement (base `web`, plugin `@netlify/plugin-nextjs`). Laisse les réglages par défaut.
3. **Environment variables** → les ajouter (voir tableau plus bas). Astuce : **Site configuration → Environment variables → Import from a .env file** (ou `netlify env:import .env` en CLI).
4. **Deploy** → tu obtiens `https://<ton-site>.netlify.app` (ou ton domaine perso).
5. Retourne dans Supabase (étape 1.3) renseigner *Site URL* + *Redirect URL* avec cette adresse.
6. Mets `NEXT_PUBLIC_SITE_URL` = cette adresse, puis **Redeploy** (Trigger deploy).

> Astuce domaine : tu héberges déjà tes sites sur Netlify → tu peux brancher un sous-domaine
> (ex. `autocar.tondomaine.fr`) dans *Domain management*. Mets alors ce domaine dans
> `NEXT_PUBLIC_SITE_URL` et dans Supabase (Site URL + Redirect URL).

### 5. n8n hébergé (toujours en ligne)

D'abord, deux notions :
- **Tunnel** (`npx n8n start --tunnel`) = n8n tourne sur **TA machine** et obtient une URL publique temporaire. Ça **s'arrête dès que ton PC est éteint** → pratique seulement pour une démo en direct, **pas pour de la prod**.
- **Hébergé** = n8n tourne sur un serveur, **accessible 24/7 depuis partout**. C'est ce que tu veux.

**Options hébergées (du plus simple au moins cher)**
| Solution | Effort | Coût | Toujours allumé |
|----------|--------|------|-----------------|
| **n8n Cloud** (n8n.io) | Zéro (managé) | ~20 €/mois (essai 14 j) | ✅ |
| **Railway** (template n8n) | Faible (quelques clics) | crédit gratuit puis ~5 €/mois | ✅ |
| **Render** (Docker n8n + disque) | Moyen | gratuit | ⚠️ s'endort (lent au réveil) |
| **Oracle Cloud Free / VPS Hetzner** | Élevé (Docker, SSH) | gratuit / ~4 €/mois | ✅ |

→ **Reco** : **Railway** (équilibre simplicité/coût/persistance) ou **n8n Cloud** si tu veux zéro administration. Sur Railway : New Project → *Deploy a template* → chercher **n8n** → déployer (il crée le service + le stockage). Tu obtiens une URL `https://...up.railway.app`.

**Ensuite, quel que soit l'hébergeur :**
1. Ouvrir l'interface n8n → **Importer** `n8n/agent-workflow.json` et `n8n/relances-workflow.json`.
2. Sur les 2 nœuds **Gemini**, sélectionner ta **credential Google Gemini** (clé AI Studio).
3. Copier l'URL du **Webhook** → la mettre dans `N8N_WEBHOOK_URL` sur Netlify (+ Redeploy).
4. Workflow **Relances** → nœud **HTTP Request** → URL = `https://<ton-site>/api/relances`,
   body JSON `{ "secret": "<CRON_SECRET>" }` (même valeur que sur Netlify).
5. **Publier** les 2 workflows.

### 6. Vérification post-déploiement
- Ouvrir `https://<ton-site>` → faire un devis dans le chat → email reçu.
- `/login` (admin) → `/admin` s'affiche (KPIs, courbe).
- `/docs` → l'explorateur d'API s'affiche.
- Cliquer « Lancer les relances dues » dans l'admin → réponse OK.

---

## Variables d'environnement (Netlify → Site configuration → Environment variables)

| Variable | Valeur | Visibilité |
|----------|--------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | publique |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon | publique |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role | **secret** |
| `N8N_WEBHOOK_URL` | `https://<n8n public>/webhook/neotravel` | serveur |
| `RESEND_API_KEY` | `re_...` | **secret** |
| `EMAIL_FROM` | `contact@am-creative.fr` | serveur |
| `CRON_SECRET` | secret partagé avec n8n | **secret** |
| `NEXT_PUBLIC_SITE_URL` | `https://<ton-site>.netlify.app` (ou ton domaine) | publique |

> La clé **Gemma** (Google AI Studio) ne va **pas** sur Netlify : elle reste dans **n8n**.

## Points d'attention
- `N8N_WEBHOOK_URL` doit être joignable **depuis internet** (pas `localhost`) une fois en ligne.
- Les emails partent du **front** (routes `/api`), donc `RESEND_API_KEY` + `EMAIL_FROM` sont **obligatoires sur Netlify**.
- En local+tunnel, n8n (et donc les relances planifiées) ne tournent que **machine allumée** ; le bouton admin « Lancer les relances dues » reste utilisable manuellement.
- OSRM/Nominatim : services publics gratuits, ok en faible trafic (User-Agent déjà géré).

## Récap « tout gratuit »
Front Netlify + Supabase + Resend + Gemma + OSRM = **0 €**. n8n = **0 €** (self-host) ou ~5 €/mois (managé).
