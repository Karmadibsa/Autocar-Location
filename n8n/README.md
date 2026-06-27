# Agent IA — n8n

Deux workflows : **(1) l'agent conversationnel** et **(2) les relances planifiées**.
n8n ne gère **que** la conversation + le calcul du devis ; la persistance, l'email, le PDF
et l'envoi des relances sont faits par les routes Next.js (`web/app/api/*`).

## Prérequis

- n8n lancé en local : `npx n8n` (ou `npx n8n start --tunnel` pour une URL publique).
- **1 credential** à créer dans n8n : **Google Gemini (PaLM) API** (clé Google AI Studio, gratuite). Le modèle utilisé est `gemma-4-31b-it`.

> Les fichiers de workflow prêts à importer sont **`agent-workflow.json`** et
> **`relances-workflow.json`**. Ils sont **générés** par `node n8n/build-workflow.js`
> (qui contient les prompts et le nœud de calcul). Après import, ouvre chaque nœud
> **Gemini** et sélectionne ta credential.

## Workflow 1 — Agent (`agent-workflow.json`) — « Autocar Location - Agent (1 LLM) »

```
Webhook (POST /webhook/neotravel)
  → Extraction params  (Gemini)  : UN SEUL appel LLM -> JSON {depart, destination, date, pax, ...}
  → Calculer Devis     (Code)    : calcul DÉTERMINISTE (miroir de pricing/) ET génère la
                                   réponse texte au client (questions / devis prêt / escalade)
  → Respond to Webhook           : renvoie { reply, devis, escalade, params } au front
```

- **Un seul appel LLM** (l'extraction) : la réponse et le prix sont produits par le nœud
  Code, de façon déterministe. → rapide (tient dans le timeout serverless 30 s), pas de
  fuite de raisonnement, moins d'erreurs 503.
- Copier l'URL du **Webhook** → variable `N8N_WEBHOOK_URL` du front.
- Le nœud **Calculer Devis** est le seul à produire un prix (règle d'or).
- ⚠️ Avant d'importer la nouvelle version : **supprimer l'ancien workflow** qui utilise le
  même chemin `/webhook/neotravel` (sinon conflit de webhook à l'activation).

## Workflow 2 — Relances (`relances-workflow.json`)

```
Schedule Trigger (ex. toutes les 5 min)
  → HTTP Request : POST <front>/api/relances  body { "secret": "<CRON_SECRET>" }
```

Toute la logique (relances dues, expiration à 30 j, clôture, idempotence) est dans
`web/app/api/relances/route.ts` et `web/lib/relances.ts`. n8n ne fait que **déclencher**.

> Les deux workflows peuvent être **publiés en même temps** (déclencheurs indépendants :
> Webhook + Schedule).
