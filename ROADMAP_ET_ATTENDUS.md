# NeoTravel — Roadmap, attendus & requis

> Document de travail interne. Synthèse de **tout** le dossier `Consignes` (brief, FAQ, glossaire, stack, livret technique, livrables/notation, mot du président, présentation, règles de calcul).
> Objectif : savoir **quoi faire, dans quel ordre, et comment**, sans avoir à relire les 8 PDF à chaque fois.

---

## 1. Le projet en une phrase

Automatiser **tout le cycle commercial** de NeoTravel (PME d'intermédiation en transport de groupe / autocars), **de la captation du lead jusqu'au dashboard de pilotage**, via un **agent IA qui orchestre** et des **outils déterministes qui exécutent**.

⚠️ **Ce n'est PAS** "un chatbot". Le chatbot n'est qu'une porte d'entrée. Le sujet est la **chaîne complète** : lead → qualification → devis → envoi → relances → pipeline → dashboard.

### Le contexte métier (à comprendre avant de coder)
- NeoTravel = plateforme d'**intermédiation** fondée en 2010. **Pas de flotte propre** : elle met en relation clients et autocaristes partenaires.
- Sa valeur = **qualifier le besoin, négocier, sécuriser la prestation, rassurer**.
- **~60 leads/jour**, mais **sous-exploités** : traitement manuel = goulot d'étranglement.
- **Friction 1** : les commerciaux (commissionnés) priorisent les gros leads → des leads payants (Google Ads) ne sont jamais recontactés = manque à gagner.
- **Friction 2** : l'acquisition est **volontairement bridée** car plus de leads = plus de pression manuelle, pas plus de CA.
- **Principe directeur** : *« digitaliser sans déshumaniser »*. L'IA prend les tâches répétitives, l'humain garde les cas complexes / la négociation / la relation.

---

## 2. Les 10 fonctions à couvrir (périmètre obligatoire)

Le prototype doit démontrer **toute la chaîne**, même de façon simple :

1. Captation d'un lead / demande client
2. Centralisation automatique dans un outil de suivi (CRM)
3. Qualification de la demande
4. Détection des informations manquantes
5. Calcul automatique/semi-automatique d'un devis (**`calculer_devis()` déterministe**)
6. Génération d'un devis / proposition commerciale (PDF)
7. Envoi (ou simulation d'envoi) du devis au client
8. Système de relances client
9. Suivi du pipeline commercial
10. Reporting des indicateurs commerciaux (dashboard direction)

> **Règle de cadrage répétée partout** : un prototype qui couvre **toute la chaîne de façon basique** vaut mieux qu'**une seule brique parfaite**. La cohérence prime sur la sophistication.

---

## 3. Definition of Done (le minimum qui doit fonctionner en démo)

Un prospect exprime une demande → le système :
1. crée une fiche CRM →
2. qualifie la demande →
3. détecte les infos manquantes →
4. calcule un devis (par le tool) →
5. génère une proposition (PDF) →
6. prépare/envoie un email de test →
7. programme une relance →
8. met à jour le pipeline →
9. alimente un dashboard.

---

## 4. Les 7 scénarios de démonstration à préparer

| # | Scénario | Comportement attendu |
|---|----------|----------------------|
| 1 | Demande **simple complète** | Qualifié → devis calculé → proposition générée → pipeline à jour |
| 2 | Demande **incomplète** | Détection des champs manquants → demande de complément avant devis |
| 3 | Demande **urgente** | Priorité élevée, notification interne, éventuelle majoration / validation humaine |
| 4 | Devis **sans réponse** | Relances : urgent J+2 ; standard J+3 puis J+7 ; **max 2 relances** → clôturé |
| 5 | Devis **accepté** | Statut "gagné", arrêt des relances, transmission équipe réservation |
| 6 | Devis **refusé** | Statut mis à jour, email de courtoisie, traçabilité conservée |
| 7 | Cas **complexe** | Refus d'automatisation totale → escalade humaine avec contexte (HITL) |

**Cas limites à montrer en démo** (très valorisés) : 0 passager, 95 passagers (>85 → flux manuel), dates incohérentes, trajet hors zone, gros volume, option nuit chauffeur.

---

## 5. Les livrables (ce qui est noté — /100)

### Calendrier de remise
| Livrable | Contenu | Format | Échéance |
|----------|---------|--------|----------|
| **L1 — Dossier de cadrage** | Diagnostic, priorisation, As-Is/To-Be, archi, stack justifiée, KPIs | PDF/Notion, 10-15 p. | **Mer. 24/06 23h59** |
| Follow-up #1 | Validation du cadrage + stack **avant de coder** | — | Jeu. 25/06 |
| **L2 — Prototype + artefacts** | Repo Git, README, `calculer_devis()` + tests, workflows/code agent, prompt système | Repo Git | **Lun. 29/06 23h59** |
| **L3 — Doc de passation** | Procédure repreneur + procédure équipes NeoTravel, backlog P1/P2/P3 | PDF/Notion | **Lun. 29/06 23h59** |
| Support de soutenance | Slides | Slides/PDF | **Mar. 30/06 23h59** |
| **Soutenance** | 20 min présentation + démo live + 10-15 min Q&R | — | **Mer. 01/07** |

> ⚠️ Aucun rendu en retard accepté. La soutenance **n'est pas remise, elle est jouée**.
> ⚠️ **Prise de parole obligatoire** pour tous les membres, sinon non évalué sur la soutenance.

### Barème /100
- **Bloc A — Livrables & prototype : 50 pts**
  - L1 Dossier de cadrage : 15 (analyse/priorisation 7 + cadrage technique/scénarios 8)
  - L2 Prototype & artefacts : 28 (prototype fonctionnel 8 + **fiabilité & garde-fous 10** + qualité code 6 + démarche Agile 4)
  - L3 Doc de passation : 7
- **Bloc B — Démonstration live : 25 pts** (parcours complet 15 + robustesse cas non scripté 6 + maîtrise outil 4)
- **Bloc C — Soutenance orale : 25 pts** (pitch 7 + défense choix techniques 8 + Q&R 5 + posture 5)

**Le poste le plus rémunérateur = "Fiabilité & garde-fous" (10 pts)** → pricing déterministe + tests + HITL/RGPD/prompt injection.

---

## 6. Contenu détaillé attendu du Dossier de cadrage (L1)

- [ ] Compréhension contexte & problèmes NeoTravel
- [ ] **Matrice de priorisation des problématiques** (impact CA, client, urgence, complexité)
- [ ] **Matrice de priorisation des solutions** (valeur métier, faisabilité, coût, délai)
- [ ] **Cartographie processus As-Is / To-Be**
- [ ] Préconisation + **roadmap 3 phases** (structurer → automatiser → IA) + position du MVP
- [ ] Périmètre MVP précis (dans / hors semaine)
- [ ] **Choix de stack justifié** (Option A ou B, pourquoi) + **choix du modèle LLM argumenté**
- [ ] Architecture cible + **modèle de données**
- [ ] Premiers scénarios de conversation prospect (flow : questions → branches → devis → escalade)
- [ ] Risques, limites, **KPIs**
- [ ] *Bonus* : estimation des gains (ROI), wireframes UI légers, flow de conversation

---

## 7. Roadmap de la semaine (J1 → J8)

> Règle d'or de séquençage : **métier d'abord, données ensuite, pricing isolé, IA en dernier.** Ne JAMAIS commencer par l'IA ou le design.

### J1 — Lun. 22/06 · Setup & cadrage
- Vérifier quotas/crédits (LLM, n8n, email, PDF) — un service à sec bloque la démo.
- Créer le socle de données (≥ 4 tables : Demandes, Matrices, Devis, Relances).
- Init repo (README, `.env.example`, structure, 1er commit, déploiement à vide).
- Choisir l'orchestrateur (A : n8n / B : Vercel AI SDK).
- Cadrage Agile : backlog priorisé, rôles, journal de décisions, risques.
- Lire le glossaire IA pour aligner le vocabulaire.

### J2 — Comprendre avant de coder
- Contexte, frictions, parcours actuel, matrices de problèmes, première cartographie **As-Is / To-Be**.

### J3 — Architecture & modèle de données · **REMISE L1 (24/06)**
- Stack, tables, statuts, règles de validation humaine, scénarios conversationnels, scénarios de démo, vocabulaire vérifié.

### J4 — Le cœur fiable d'abord
- **`calculer_devis()` codé et testé**, lookup pricing opérationnel. **Rien d'autre tant que ce n'est pas solide.**

### J5 — L'agent prend vie
- Agent connecté à ses outils : lookup règles → calcul → devis PDF → CRM → relances. **Premier flux de bout en bout.**

### WE 27-28 — Tampon (finition, pas de nouvelle feature).

### J6 — Lun. 29/06 · Expérience & automatisation · **REMISES L2 & L3**
- Landing/interface prospect, chatbot intégré, relances, emails de test, dashboard, déploiement en ligne (bonus).

### J7 — Mar. 30/06 · Préparation restitution
- Répétition pitch, scénario démo, répartition de parole, Q&R, limites, arbitrages. **Support de soutenance dû le soir.**

### J8 — Mer. 01/07 · Soutenance
- Présentation (20 min) + démo live + Q&R (10-15 min).

---

## 8. KPIs candidats (à mettre dans L1 et le dashboard)

- Nombre de leads reçus / jour
- Devis générés / envoyés / acceptés / refusés
- **Taux de conversion** (devis → accepté)
- Délai moyen demande → devis envoyé
- Relances en attente / déclenchées
- Demandes urgentes en cours
- Part de leads non traités (doit tendre vers 0)
- *(Bonus)* coût IA par devis (tokens)

---

## 9. Ce qui n'est PAS attendu (pour ne pas se disperser)

- ❌ Application prête pour la production / robustesse industrielle
- ❌ Gestion exhaustive de tous les cas limites
- ❌ UI parfaitement designée (wireframes "rough" suffisent pour L1)
- ❌ CRM analytique complet (une vue Airtable / page dashboard simple suffit)
- ❌ WhatsApp officiel (coût + vérif Meta, hors périmètre — email par défaut)
- ❌ Stocker des données personnelles réelles (fictives/minimales uniquement)

---

## 10. Questions ouvertes à trancher

Voir la section dédiée en bas de `ARCHITECTURE_ET_REGLES.md` et les questions que je te pose dans le chat (stack, équipe, ambiguïtés de pricing).
