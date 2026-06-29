# Autocar Location — Automatisation du cycle commercial

Prototype qui automatise le cycle commercial d'un intermédiaire en **transport de groupe
en autocar** : captation → qualification (agent IA) → **devis déterministe** → email/PDF →
relances automatiques → dashboard de pilotage.

Cas d'étude MBA Epitech. Équipe : Axel MOMPER · Vincent CONTER · Zakaria TOUAMI.

> 🧭 **Tu reprends le projet ?** Commence par **[PASSATION.md](PASSATION.md)** (orientation en 5 min).

> ⭐ **Règle d'or** : l'IA qualifie et oriente ; le **prix vient toujours du code
> déterministe** (`calculerDevis`), **jamais** du modèle de langage.

## Stack (Option A hybride)

- **Front** : Next.js 16 (App Router, TypeScript, Tailwind v4) — `web/`
- **Agent IA** : n8n + Gemma (`gemma-4-31b-it`, gratuit) — **1 seul appel LLM** (extraction) ; la réponse et le prix sont **déterministes** (nœud Code) — `n8n/`
- **Données** : Supabase (PostgreSQL + Auth + RLS) — `supabase/`
- **Pricing** : moteur `calculerDevis` testé — `pricing/` + `web/lib/`
- **Emails** : Resend · **Distance** : OSRM/Nominatim · **Déploiement** : **Netlify** (front) + **tunnel** pour n8n

## Démarrage rapide

```bash
# 1. Moteur de prix (aucune clé requise)
npm install && npm test            # tests du moteur de devis

# 2. Base de données  (SQL Editor Supabase, dans l'ordre)
#    a) supabase/reset-complet.sql     → schéma propre (base vierge)
#    b) supabase/comptes-demo.sql      → comptes de connexion (admin + clients), 1 fois
#    c) supabase/seed-demo-volume.sql  → jeu de démo volumineux (~500 devis) [optionnel]

# 3. Front
cd web
cp .env.local.example .env.local   # remplir les clés
npm install
npm run dev                        # http://localhost:3000

# 4. Agent
#    → importer n8n/agent-workflow.json + n8n/relances-workflow.json dans n8n
```

> Sous Windows, **`start.bat`** lance le front + n8n en un clic (avec logs).

### Jeux de données de démo

- **Petit jeu curé** : `supabase/reset-demo.sql` (quelques cas couvrant tous les statuts, client `client1@email.fr` relié — idéal démo côté client).
- **Gros volume** : `supabase/seed-demo-volume.sql` (~500 devis sur 12 mois → courbes, camembert, KPIs). Régénérable : `python supabase/generer-seed-demo.py --devis 500`.
- **Emails de démo** : les clients fictifs sont sur `@demo.autocar-location.fr`. Le front ([lib/emailGuard.ts](web/lib/emailGuard.ts)) **n'envoie aucun email réel** à ce domaine (relances/devis traités, mais pas d'envoi Resend). Configurable via `EMAIL_DEMO_DOMAINS`.

## Documentation

| Document | Contenu |
|----------|---------|
| **[PASSATION.md](PASSATION.md)** | 🧭 **Point d'entrée** : orientation, ordre de lecture, 5 choses à savoir. |
| **[DIAGRAMMES.md](DIAGRAMMES.md)** | Tous les schémas (archi, parcours prospect/client/admin, statuts, BDD). |
| **[DOC_TECHNIQUE.md](DOC_TECHNIQUE.md)** | 👉 **Comprendre le code** : architecture, modules, install, « où modifier quoi », flux. |
| **API interactive (Swagger)** | Lancer le front → **http://localhost:3000/docs** (explorateur de toutes les routes). |
| **Référence du code (TypeDoc)** | `cd web && npm run doc` → ouvrir `web/docs/index.html` (style Javadoc). |
| [DEPLOIEMENT.md](DEPLOIEMENT.md) | Mise en ligne (Netlify + n8n tunnel) |
| [COUTS_ET_PROD.md](COUTS_ET_PROD.md) | Choix MVP (tunnel) + coûts détaillés d'une vraie prod |
| [supabase/SCHEMA.md](supabase/SCHEMA.md) | Modèle de données expliqué (mermaid) |
| [n8n/README.md](n8n/README.md) · [pricing/README.md](pricing/README.md) | Montage de l'agent · moteur de prix |
| `livrables/` | Dossier de cadrage, argumentaire, wireframes |

## Variables d'environnement

Voir **`web/.env.local.example`** (Supabase, n8n, Resend, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`).
Les secrets ne sont **jamais** committés (`.gitignore`). La clé du LLM reste **dans n8n**.

## Tests

- Moteur de prix : `npm test` (racine)
- Front : `cd web && npx vitest run` (29 tests : pricing, distance, PDF, email, relances, noms)
