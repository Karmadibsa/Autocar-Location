# 👋 Passation — commence ici

Tu reprends le projet **Autocar Location** ? Lis cette page en premier : elle t'oriente
vers tout le reste en 5 minutes.

## En 30 secondes
Application qui **automatise le cycle commercial** d'un intermédiaire en transport de groupe
en autocar : un **chatbot** qualifie le besoin → un **devis chiffré automatiquement** (règles
fixes, jamais l'IA) → **email + PDF** → **relances auto** → **dashboard** de pilotage.
Stack : **Next.js (Netlify)** + **Supabase** + **n8n/Gemma** + **Resend**.

> ⭐ **Règle d'or** : l'IA comprend/oriente, mais le **prix vient toujours du code déterministe**
> (`web/lib/calculerDevis.ts` / `pricing/`), **jamais** du modèle de langage.

## La carte des documents (quel fichier pour quoi)
| Tu veux… | Lis |
|----------|-----|
| Comprendre vite le projet | **ce fichier** puis [README.md](README.md) |
| Voir les schémas (archi, parcours, BDD, statuts) | [DIAGRAMMES.md](DIAGRAMMES.md) |
| Comprendre le **code** (modules, « où modifier quoi ») | [DOC_TECHNIQUE.md](DOC_TECHNIQUE.md) |
| L'**API** en interactif | lancer le front → `/docs` (Swagger) ; ou `cd web && npm run doc` (TypeDoc) |
| Le **modèle de données** | [supabase/SCHEMA.md](supabase/SCHEMA.md) |
| **Déployer** | [DEPLOIEMENT.md](DEPLOIEMENT.md) |
| Les **coûts** / passage en prod | [COUTS_ET_PROD.md](COUTS_ET_PROD.md) |
| **Tester** que tout marche | [RECETTE_END_TO_END.md](RECETTE_END_TO_END.md) |
| Monter l'**agent n8n** | [n8n/README.md](n8n/README.md) |
| Le **moteur de prix** | [pricing/README.md](pricing/README.md) |

## Ordre de lecture conseillé
1. **PASSATION.md** (ici) → 2. **DIAGRAMMES.md** (vue d'ensemble visuelle) →
3. **DOC_TECHNIQUE.md** (le code) → 4. **SCHEMA.md** (les données) →
5. **DEPLOIEMENT.md** + **COUTS_ET_PROD.md** (mise en ligne).

## Démarrer en local (5 min)
```bash
# 1. Moteur de prix (aucune clé)
npm install && npm test            # 13 tests

# 2. Base : exécuter supabase/reset-complet.sql dans Supabase (SQL Editor)

# 3. Front
cd web && cp .env.local.example .env.local   # remplir les clés
npm install && npm run dev          # http://localhost:3000

# 4. Agent : importer n8n/agent-workflow.json dans n8n (+ credential Gemini)
```
Vérifs : `cd web && npm run lint` (0) · `npx vitest run` (29) · `npm run build`.

## Les 5 choses à savoir
1. **Prix déterministe** : tout changement de tarif se fait dans `pricing/matrices.js` (+ table `pricing_config`), **pas** dans le LLM.
2. **1 seul appel LLM** : n8n n'appelle Gemma **qu'une fois** (extraction) ; le nœud Code calcule le prix **et** rédige la réponse. → rapide, fiable, pas de fuite de raisonnement.
3. **Sécurité** : le navigateur n'a que la clé **anon** (RLS Supabase) ; les routes `/api/*` utilisent la **service role** côté serveur **après** vérification du token/rôle.
4. **Emails serverless** : on **attend** (`await`) la persistance avant de répondre dans `/api/chat` (sinon, en serverless, l'email ne partirait pas).
5. **n8n en tunnel** = choix MVP (0 €, PC allumé). Pour la vraie prod 24/7 → n8n hébergé (voir COUTS_ET_PROD.md).

## Comptes de démo
- **Admin** : `admin@autocar-location.fr` / `123456`
- **Client** : `client1@email.fr` / `client` · `client2@email.fr` / `client`
(Recréables via le dashboard Supabase ; rôles/données via `supabase/ajout-prenom.sql` ou `reset-complet.sql`.)

## Structure du repo (l'essentiel)
```
web/        Application Next.js (pages, /api = logique métier, lib = fonctions testées)
pricing/    Moteur de prix déterministe (source de vérité) + tests
n8n/        Agent IA (workflows à importer) + guides
supabase/   Schéma SQL + resets + SCHEMA.md
*.md        Docs (ce fichier, README, DIAGRAMMES, DOC_TECHNIQUE, DEPLOIEMENT, COUTS_ET_PROD)
```
