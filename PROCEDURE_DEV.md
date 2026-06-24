# NeoTravel — Procédure de développement & mise en place

> Comment on construit et on met en route la solution, dans l'ordre. Stack : **Option A hybride** — agent dans **n8n**, données **Supabase** (Postgres + Auth + RLS), front **Next.js**, emails **Resend/Brevo**, déploiement **Vercel**.
> Règle d'or : **structurer → automatiser → IA**. Le prix vient **toujours** de `calculer_devis()` (jamais du LLM).

---

## 0. Prérequis — comptes à créer (gratuits) & clés

| Service | Pourquoi | À récupérer |
|---|---|---|
| **Supabase** | Base Postgres + Auth + RLS | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **OpenAI** | LLM gpt-4o-mini (qualification) | `OPENAI_API_KEY` (crédit 10-15 €) |
| **n8n** | Orchestration agent + relances | instance (local `npx n8n` + tunnel, ou n8n Cloud) |
| **Resend** (ou Brevo) | Envoi des emails (devis, relances) | `RESEND_API_KEY` + une adresse de test |
| **Vercel** | Hébergement du front | compte lié au repo Git |

> Tant qu'on n'a pas ces clés, je peux **tout coder** ; on ne pourra simplement pas **exécuter de bout en bout**.

---

## 1. Ordre de développement (7 phases)

### Phase 0 — Setup (J1)
- [ ] `git init`, README, `.env.example`, structure du repo, 1er commit.
- [ ] Créer les comptes (section 0) et récupérer les clés.

### Phase 1 — Structurer (le socle fiable d'abord)
- [ ] **Supabase** : exécuter `supabase/schema.sql` (6 tables + enums + RLS + seed des matrices de pricing).
- [ ] **Pricing** : `pricing/calculer_devis.js` (✅ déjà codé + 13 tests verts). Le nœud Code n8n lira les matrices depuis Supabase (pilotable).

### Phase 2 — L'agent dans n8n
- [ ] Importer le workflow `n8n/agent-workflow.json` (squelette fourni).
- [ ] Configurer les credentials n8n : OpenAI, Supabase (Postgres), SMTP/Resend.
- [ ] Nœud **AI Agent** (gpt-4o-mini) + **system prompt** documenté + **sorties structurées** (schéma des params).
- [ ] Brancher les outils : lookup règles (Supabase) → `calculer_devis()` (Code node) → écriture `demandes`/`devis` (Supabase) → génération PDF → email.
- [ ] Exposer un **Webhook** d'entrée (le front appellera cette URL).

### Phase 3 — Front prospect (Next.js)
- [ ] Scaffold Next.js (App Router + TypeScript + Tailwind).
- [ ] **Landing conversationnelle** `/` : la conversation au centre (cf. wireframes/charte).
- [ ] **Chat** : POST du message vers le webhook n8n, affichage de la réponse de l'agent + carte devis.
- [ ] Client Supabase (lecture des devis/conversations).

### Phase 4 — Automatiser (PDF, email, relances)
- [ ] **Devis PDF** : génération (nœud n8n HTML→PDF, ou lib Node).
- [ ] **Email** : envoi (ou simulation) du devis via Resend.
- [ ] **Relances** : workflow n8n **Schedule** → J+2 (urgent) / J+3 puis J+7 (standard), **max 2**, idempotent (clé + contrainte d'unicité). Délai court (2 min) en démo, config réelle documentée.

### Phase 5 — Dashboard & portail lead
- [ ] **`/admin`** (protégé) : cartes KPI + table du pipeline (lit Supabase, realtime). Auth Supabase + rôle admin.
- [ ] **`/espace-client`** (bonus P2) : login magic link, suivi des devis (statut + PDF) et historique de conversation. RLS = chacun ne voit que ses données.

### Phase 6 — Tests des 7 scénarios
Voir section 4.

### Phase 7 — Déploiement
- [ ] Front sur **Vercel**.
- [ ] Agent n8n joignable (**tunnel local accepté** en démo, ou n8n Cloud).
- [ ] Variables d'env en production.

---

## 2. Structure cible du repo

```
neotravel/
├─ pricing/                 ✅ calculer_devis() + tests + version n8n
├─ supabase/
│  ├─ schema.sql            tables + enums + RLS + seed matrices
│  └─ README.md
├─ n8n/
│  ├─ agent-workflow.json   squelette agent (à importer)
│  ├─ relances-workflow.json
│  └─ system-prompt.md      prompt système documenté
├─ app/ (Next.js)
│  ├─ app/page.tsx          landing + chat
│  ├─ app/admin/            dashboard (protégé)
│  ├─ app/espace-client/    portail lead (bonus)
│  └─ lib/supabase.ts
├─ .env.example
├─ README.md                lancement, env, architecture
└─ livrables/               L1 (dossier, argumentaire, wireframes)
```

---

## 3. Variables d'environnement (`.env.example`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # serveur uniquement (dashboard admin)
# OpenAI
OPENAI_API_KEY=
# n8n
N8N_WEBHOOK_URL=                  # URL du webhook d'entrée de l'agent
# Email
RESEND_API_KEY=
EMAIL_FROM=devis@test.neotravel
```

---

## 4. Plan de test — les 7 scénarios (Definition of Done)

| # | Scénario | Attendu |
|---|---|---|
| 1 | Demande simple complète | Qualifiée → devis calculé → PDF → pipeline à jour |
| 2 | Demande incomplète | Détection des champs manquants → relance avant devis |
| 3 | Demande urgente | Priorité, notification interne, majoration / validation |
| 4 | Devis sans réponse | Relances J+2 / J+3 / J+7, max 2 → clôturé |
| 5 | Devis accepté | Statut gagné, arrêt relances, transmission réservation |
| 6 | Devis refusé | Statut MAJ, email courtoisie, traçabilité |
| 7 | Cas complexe | Escalade humaine (HITL) avec contexte |

**Cas limites** : 0 passager, 95 passagers (>85 → manuel), dates incohérentes, hors zone — déjà couverts par les tests de `calculer_devis()`.

---

## 5. Checklist livrable L2 (29/06)
- [ ] Repo Git + historique de commits lisible
- [ ] README (lancement, env, architecture) + **prompt système** documenté
- [ ] `calculer_devis()` + tests qui passent ✅ + export workflows n8n
- [ ] Parcours complet démontrable (agent joignable)
- [ ] Dashboard + relances configurées/simulées
- [ ] Points d'attention : HITL, RGPD, prompt injection
