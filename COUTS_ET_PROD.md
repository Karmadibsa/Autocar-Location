# Coûts & passage en production — Autocar Location

Ce document explique **le choix d'architecture pour le MVP**, ce qu'il faudrait changer
**pour une vraie mise en production**, et **combien ça coûte** selon le scénario.

---

## 1. Le choix du MVP : n8n en tunnel

Pour la démo/soutenance, l'agent **n8n tourne en local** et est exposé via un **tunnel**
(ngrok, URL fixe `…ngrok-free.dev`). Le front (Netlify), la base (Supabase) et les emails
(Resend) sont, eux, **en ligne 24/7**.

**Pourquoi ce choix ?**
- **0 €** : aucune infra à payer pour l'agent.
- **Rapide à mettre en place** : pas de serveur à administrer.
- **Suffisant pour démontrer** la valeur (le cycle complet fonctionne).

**Limite assumée :** l'agent (donc la *génération de devis par le chat*) ne fonctionne
**que lorsque le PC + le tunnel tournent**. Tout le reste du site reste disponible 24/7
(landing, espace client, devis déjà émis, PDF, dashboard, relances manuelles).

> En soutenance : présenter le tunnel comme un **choix MVP assumé**, et montrer qu'on sait
> exactement comment passer en prod (section suivante).

---

## 2. Passage en production (n8n hébergé 24/7)

Le seul élément à changer = **héberger n8n** sur un serveur (au lieu du tunnel local).
Options, du plus simple au moins cher :

| Solution | Effort | Toujours en ligne | Coût indicatif |
|----------|--------|-------------------|----------------|
| **n8n Cloud** (managé) | nul | ✅ | ~20 €/mois (essai 14 j) |
| **Railway** (template n8n) | faible | ✅ | crédit ~5 $ offert puis ~5 $/mois |
| **VPS Hetzner** (Docker n8n) | moyen | ✅ | ~4-5 €/mois |
| **Oracle Cloud Free** (Docker n8n) | élevé | ✅ | **0 €** (carte requise) |

Une fois n8n hébergé : on remplace simplement `N8N_WEBHOOK_URL` (Netlify) par l'URL du
service hébergé. Rien d'autre à changer dans le code.

---

## 3. Coût de chaque brique (offre gratuite vs payante)

| Brique | Offre gratuite (limites) | Quand on paie | Tarif payant |
|--------|--------------------------|---------------|--------------|
| **Domaine** | — | toujours | ~10-15 €/an (≈ 1 €/mois) |
| **Front — Netlify** | 100 Go bande passante, 300 min build, 125k appels de fonctions /mois | gros trafic / besoin de plus | Pro ~19 $/mois |
| **Base + Auth — Supabase** | 500 Mo DB, 50k utilisateurs auth ; **se met en pause après ~7 j d'inactivité** | prod sérieuse (pas de pause, backups) | Pro ~25 $/mois |
| **Emails — Resend** | 3 000 emails/mois (100/jour) | volume > 3k/mois | ~20 $/mois (50k) |
| **LLM — Gemini/Gemma (Google AI Studio)** | quota gratuit (rate-limité) | volume / SLA | Gemini 2.0 Flash ≈ 0,10 $/1M tokens → **~0,00x € par devis** (négligeable) |
| **Distance — OSRM/Nominatim** | service public (fair-use ~1 req/s) | gros volume | self-host OSRM (VPS) ou API routière payante |
| **Agent — n8n** | tunnel local (0 €) ou Oracle Free (0 €) | sans PC, sans setup | 5 → 20 €/mois (voir §2) |

> Estimation LLM : un devis = ~1 à 2 k tokens (extraction). Même à plusieurs milliers de
> devis/mois, le coût LLM reste de l'ordre de **quelques euros**, voire **gratuit** sous le
> quota AI Studio.

---

## 4. Scénarios de coût mensuel

### Scénario A — MVP / soutenance (actuel)
Netlify free + Supabase free + Resend free + Gemma free + **n8n tunnel local**.
→ **~0 € / mois** (hors domaine ≈ 1 €). Dépend du PC pour le chat.

### Scénario B — Prod « éco » (tout gratuit, 24/7)
Netlify free + Supabase free + Resend free + LLM free + **n8n sur Oracle Cloud Free**.
→ **~0-1 € / mois**. Limites : Supabase free se met en pause (à réveiller), setup Oracle.

### Scénario C — Prod « sereine » (recommandée si vrai usage)
Netlify free + **Supabase Pro (25 $)** + Resend free (ou 20 $ si volume) + LLM ~few € +
**n8n Railway (~5 $) ou VPS (~5 €)**.
→ **~30 € / mois** (≈ 30-50 € selon volume d'emails).

### Scénario D — Croissance
Netlify Pro (19 $) + Supabase Pro (25 $) + Resend (20 $) + n8n VPS (5 €) + LLM (qq €).
→ **~70-75 € / mois**.

---

## 5. Recommandation

- **Aujourd'hui (MVP)** : on reste sur le **tunnel** (0 €).
- **Si mise en prod réelle** : viser le **Scénario C (~30 €/mois)** — c'est le palier qui
  rend tout **fiable et autonome** (Supabase qui ne dort pas + n8n hébergé). On peut démarrer
  en **Scénario B (~0 €)** si le budget est nul, en acceptant ses limites.
