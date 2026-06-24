# Agent & automatisation — n8n

Deux workflows : **(1) l'agent conversationnel** et **(2) les relances planifiées**.
Le cerveau de l'agent vit ici (Option A). Le front Next.js ne fait que poster sur le webhook.

## Prérequis
- n8n lancé en local : `npx n8n` (ou `npx n8n start --tunnel` pour la démo). Voir `GUIDE_INSTALLATION.md` étape 3.
- Credentials à créer dans n8n : **OpenAI** (gpt-4o-mini), **Postgres/Supabase** (host, db, user, password depuis Supabase → Settings → Database), **SMTP/Resend** (envoi email).

---

## Workflow 1 — Agent (webhook)

| # | Nœud | Rôle |
|---|------|------|
| 1 | **Webhook** (POST) | Entrée. Reçoit `{ message, history }` du front. Copier son URL → `N8N_WEBHOOK_URL`. |
| 2 | **AI Agent** (Chat Model = OpenAI gpt-4o-mini, T≈0.2) | Cerveau. Coller le **System Message** depuis `system-prompt.md`. Activer la mémoire de session. |
| 3 | **Outils** rattachés à l'agent (ci-dessous) | L'agent décide lequel appeler. |
| 4 | **Respond to Webhook** | Renvoie `{ reply, devis? }` au front. |

### Outils à rattacher au nœud AI Agent
- **`calculer_devis`** — nœud **Code** (JavaScript). Coller `pricing/n8n-code-node.js`. ⚠️ C'est le seul à produire un prix.
  - *Pilotable (recommandé)* : avant le Code, un nœud **Supabase/Postgres** lit `pricing_config` (`select data from pricing_config where id=1`) et passe les matrices au Code (remplacer `MATRICES` par l'entrée).
- **`lookup_regles`** — nœud Supabase : lit les matrices / zones (ancre les réponses, évite les hallucinations).
- **`enregistrer_demande`** — nœud Supabase : upsert `clients` + insert `demandes` (statut `qualifiee`).
- **`generer_devis_pdf`** — nœud HTML→PDF : gabarit du devis → upload (Supabase Storage) → `pdf_url`.
- **`envoyer_email`** — nœud Resend/SMTP : envoie le devis (vers une adresse de test). Met `devis.statut = 'envoye'`, `date_envoi`.
- **`planifier_relance`** — nœud Supabase : insert `relances` (type J2/J3/J7, `date_planifiee`, `cle_idempotence = devis_id || '-' || type`).
- **`escalader_humain`** — si > 85 passagers / cas atypique : `demandes.statut = 'cas_complexe'` + notification interne. Réponse : « un conseiller vous recontacte sous 24 h ».

---

## Workflow 2 — Relances (Schedule)

| # | Nœud | Rôle |
|---|------|------|
| 1 | **Schedule Trigger** | Toutes les 2 min **en démo** (config réelle J+2 / J+3 / J+7 documentée). |
| 2 | **Supabase** (select) | `relances` où `statut='planifiee'` et `date_planifiee <= now()`, devis lié `statut='envoye'` et `nb_relances < 2`. |
| 3 | **Email** | Envoie la relance. |
| 4 | **Supabase** (update) | `relances.statut='envoyee'`, `devis.nb_relances += 1` ; au-delà de 2 → `devis`/`demande` `statut='cloture'`. |

> **Idempotence** : la contrainte d'unicité sur `relances.cle_idempotence` (cf. `supabase/schema.sql`) empêche toute relance en double, même si le workflow est rejoué.

---

## Export (livrable L2)
Une fois les workflows construits : dans n8n, **⋯ → Download** chaque workflow et enregistre-les ici :
`n8n/agent-workflow.json` et `n8n/relances-workflow.json` (à committer).

> Les workflows n8n se construisent dans l'UI (le JSON exporté est fragile à écrire à la main). On les monte ensemble dès que ton instance n8n tourne — j'ai déjà fourni le **Code node**, le **system prompt** et la **liste exacte des nœuds** ci-dessus.
