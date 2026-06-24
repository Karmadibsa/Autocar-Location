# NeoTravel — Ce que TU dois faire (création des comptes & branchement)

> Pendant que je code l'application, voici **étape par étape** ce que tu prépares de ton côté.
> Tu n'as **rien à coder** : créer des comptes, copier des clés, les coller dans `web/.env.local`.
> Fais-le quand tu veux ; rien ne presse, je continue le développement en parallèle.

À la fin tu auras :
```
# Front -> web/.env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
N8N_WEBHOOK_URL=...

# Dans n8n (Credentials, PAS dans .env.local) :
#   - cle Google AI Studio (Gemini) -> modele de l'agent
#   - cle Resend + ton domaine       -> envoi des emails
```
> ⚠️ Important : la clé du modèle (Gemini) et la clé Resend ne se mettent **pas** dans `web/.env.local`. Elles se configurent **dans n8n** (menu *Credentials*). Le front n'utilise que Supabase + l'URL du webhook n8n.

---

## Étape 1 — Supabase (base de données + auth) ⏱️ ~10 min
1. Va sur **https://supabase.com** → *Start your project* → connecte-toi (GitHub conseillé).
2. *New project* : nom `neotravel`, choisis une région **Europe (Frankfurt/Paris)**, mets un mot de passe de base de données (note-le).
3. Attends ~2 min que le projet se crée.
4. **Exécuter le schéma** : menu de gauche → **SQL Editor** → *New query* → ouvre le fichier `supabase/schema.sql` du repo, **copie tout**, colle, clique **Run**. Tu dois voir « Success ».
5. **Récupérer les clés** : menu → **Project Settings** (roue crantée) → **API**. Copie :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (⚠️ secret, ne jamais l'exposer côté client) → `SUPABASE_SERVICE_ROLE_KEY`
6. **Créer un compte admin** (pour le dashboard) : menu → **Authentication** → **Users** → *Add user* → mets ton email + un mot de passe. Puis va dans **SQL Editor** et lance (remplace l'email) :
   ```sql
   insert into profiles (id, role)
   select id, 'admin' from auth.users where email = 'TON_EMAIL';
   ```

---

## Étape 2 — Google AI Studio (Gemini — GRATUIT) ⏱️ ~3 min
> On utilise le **free tier de l'API Gemini** (pas besoin de crédit/CB). Modèle : **`gemini-1.5-flash`** (free tier disponible ; `gemini-2.0-flash` n'a souvent **pas** de quota gratuit → erreur `limit: 0`).
1. Va sur **https://aistudio.google.com** → connecte-toi avec un compte Google.
2. Clique **Get API key** (ou *Create API key*) → copie la clé.
3. Cette clé se mettra **dans n8n** (Credentials → *Google Gemini (PaLM) API*), pas dans `.env.local`.
   > Le free tier a des limites de débit (requêtes/min) suffisantes pour le développement et la démo.

---

## Étape 3 — n8n en local + tunnel (l'agent) ⏱️ ~10 min
On lance n8n sur ta machine (gratuit) et on l'expose via un tunnel pour la démo.
1. Ouvre un terminal et lance :
   ```bash
   npx n8n
   ```
   (la première fois, ça installe n8n — quelques minutes.) Puis ouvre **http://localhost:5678** et crée ton compte local.
2. Pour la **démo** (agent joignable depuis le front déployé), relance plutôt avec le tunnel :
   ```bash
   npx n8n start --tunnel
   ```
   n8n affichera une URL publique `https://...hooks.n8n.cloud/...` — c'est ce qui servira de base au **webhook**.
3. On montera **ensemble** le workflow (guide `n8n/README.md`). Le nœud **Webhook** te donnera l'URL → `N8N_WEBHOOK_URL` :
   - en **local** (front + n8n sur ta machine) : `http://localhost:5678/webhook/neotravel` ;
   - l'URL **tunnel** `https://...hooks.n8n.cloud/...` ne sert que si le front est déployé (Vercel) et doit joindre ton n8n local.

> Raccourci : double-clique **`n8n.bat`** pour lancer n8n avec tunnel.

---

## Étape 4 — Resend (envoi des emails) ⏱️ ~5 min
1. Va sur **https://resend.com** → crée un compte → **API Keys** → *Create* → copie la clé (ira dans n8n).
2. **Tu as un domaine** : va dans **Domains** → *Add domain* → ajoute les **enregistrements DNS** indiqués (SPF/DKIM) chez ton registrar. Une fois vérifié, tu peux envoyer depuis `devis@ton-domaine`. (En attendant la vérif, `onboarding@resend.dev` marche pour tester.)
3. La clé Resend + l'adresse d'expéditeur se configurent **dans n8n** (nœud email), pas dans `.env.local`.
   > En démo, envoie vers **ta propre adresse** avec des **données fictives** (RGPD).

---

## Étape 5 — Brancher les clés & lancer l'app ⏱️ ~5 min
1. Dans le repo : `cd web` puis crée le fichier `.env.local` (copie depuis `web/.env.local.example`) et colle tes clés.
2. Lance l'app :
   ```bash
   cd web
   npm install      # si pas déjà fait
   npm run dev
   ```
3. Ouvre **http://localhost:3000** → tu dois voir la landing conversationnelle.

---

## Récapitulatif des clés à me transmettre / coller
| Clé | Vient de | Sensible ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API | non |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | non |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API | **oui (secret)** |
| Clé Gemini (→ dans n8n) | Google AI Studio | **oui** |
| `N8N_WEBHOOK_URL` | n8n — ex. `http://localhost:5678/webhook/neotravel` | non |
| Clé Resend (→ dans n8n) | Resend + ton domaine | **oui** |

> Ne mets **jamais** les clés secrètes sur GitHub : elles vont dans `.env.local` (déjà ignoré par git).

Quand l'étape 1 (Supabase) est faite, dis-le moi : on pourra tester la base et avancer sur l'agent.
