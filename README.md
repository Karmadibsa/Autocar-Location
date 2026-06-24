# NeoTravel — Automatisation du cycle commercial

Prototype d'automatisation commerciale pour NeoTravel (transport de groupe en autocar) :
captation → qualification → **devis déterministe** → envoi → relances → pilotage.
Cas d'étude MBA1. Équipe : Axel MOMPER · Vincent CONTER · Zakaria TOUAMI.

> **Règle d'or** : l'IA qualifie et oriente ; le **prix vient toujours de `calculer_devis()`** (code déterministe), jamais du LLM.

## Stack (Option A hybride)
- **Front** : Next.js 16 (App Router, TypeScript, Tailwind) — `web/`
- **Agent** : n8n (nœud AI Agent, gpt-4o-mini) — `n8n/`
- **Données** : Supabase (PostgreSQL + Auth + RLS) — `supabase/`
- **Pricing** : `calculer_devis()` testé — `pricing/`
- **Emails** : Resend · **Déploiement** : Vercel

## Structure
```
pricing/    moteur de devis déterministe + tests (npm test)
supabase/   schema.sql (tables + RLS + seed matrices)
n8n/        system-prompt.md + guide de montage des workflows
web/        app Next.js (landing + chat, /admin, /espace-client)
livrables/  dossier de cadrage, argumentaire, wireframes
```

## Lancer en local
```bash
# 1. Pricing (aucune clé requise)
npm install         # à la racine (outils)
npm test            # 13 tests du moteur de devis

# 2. Base de données
#   → exécuter supabase/schema.sql dans Supabase (SQL Editor)

# 3. Front
cd web
cp .env.local.example .env.local   # puis remplir les clés
npm install
npm run dev          # http://localhost:3000

# 4. Agent
npx n8n              # http://localhost:5678 — voir n8n/README.md
```

## Documentation
- **`GUIDE_INSTALLATION.md`** — ce que l'utilisateur doit créer/brancher (comptes & clés).
- **`PROCEDURE_DEV.md`** — plan de développement en 7 phases + plan de test.
- **`livrables/L1-dossier-cadrage/`** — dossier de cadrage, argumentaire des choix, wireframes.
- **`WIREFRAMES_CHARTE_GRAPHIQUE.md`** — charte graphique (couleurs, typo, composants).

## Variables d'environnement
Voir `web/.env.local.example` (Supabase, OpenAI, n8n, Resend). Les secrets ne sont jamais committés (`.gitignore`).
