# NeoTravel — Architecture, règles, GO / NO-GO

> Doc technique de référence. À lire avant de connecter l'IA. Complète `ROADMAP_ET_ATTENDUS.md`.

---

## 1. Principe fondateur (à graver)

> **L'IA décide — les outils exécutent.**
> Le LLM est un **routeur + metteur en forme**, jamais la source de vérité.

| ✅ Ce que fait l'AGENT (LLM) | 🔧 Ce que font les OUTILS (code déterministe) |
|------------------------------|----------------------------------------------|
| Mène la conversation, collecte les infos | **`calculer_devis()`** → calcul du prix |
| Détecte les champs manquants | Génération du devis PDF |
| **Lit** les règles en base (lookup) | Écriture / mise à jour CRM |
| Décide quel outil appeler et dans quel ordre | Planification des relances |
| Reformule, met en forme, personnalise les emails | Logs / traces |

⚠️ **NO-GO absolu** : ne JAMAIS laisser le prix transiter par le raisonnement du LLM. Le prix vient **toujours** de `calculer_devis()`. Sinon : devis instables, non auditables, manipulables par prompt injection.

---

## 2. Architecture cible

```
        Landing web + Chatbot (React / Next.js)
                        │
                        ▼
        AGENT IA — orchestrateur
        (n8n AI Agent  OU  Vercel AI SDK)
                        │
   ┌─────────┬──────────┼───────────┬──────────────┐
   ▼         ▼          ▼           ▼              ▼
 Lookup   calculer_   Générer     Écrire        Planifier
 règles   devis()     devis PDF   CRM           relance
 (DB)     (code)                  (DB)          (n8n)
                        │
                        ▼
   SOCLE DE DONNÉES (Airtable OU Supabase)
   Demandes · Matrices · Devis · Relances · (Clients, Logs)
                        │
                        ▼
            DASHBOARD direction
```

> ✅ **CHOIX RETENU : Option A — n8n au cœur.** Équipe peu à l'aise en code globalement → n8n (orchestration visuelle, courbe douce) est le bon pari. L'aisance code de l'équipe sert dans le **nœud Code n8n (JS)** où vit `calculer_devis()`. Données = **Airtable** + **Airtable Interface** comme dashboard.
> 🎓 *Jamais utilisé n8n* : prévoir 2-3 h de prise en main J1 (concepts : trigger, nœud, webhook, AI Agent, Code node, Schedule trigger). Le tunnel local (`n8n start --tunnel`) suffit pour la démo.

### Deux options de stack (Option A retenue ; B documentée pour le dossier)

**Socle commun aux deux** : Front Next.js (déploiement Vercel) · `calculer_devis()` déterministe · Devis PDF auto · Email (Resend/Brevo) · garde-fou "le LLM décide, le code calcule".

| Brique | **Option A — n8n au cœur** (bon niveau) | **Option B — Vercel AI SDK au cœur** (excellent) |
|--------|------------------------------------------|--------------------------------------------------|
| Cerveau agent | Nœud **AI Agent n8n** | **Vercel AI SDK** dans Next.js (streaming + tool calling) |
| Calcul prix | Nœud Code n8n (JS) = `calculer_devis()` | Fonction TS exposée comme `tool` (`execute()`) |
| Devis PDF | Nœud n8n HTML→PDF | Lib Node (Puppeteer / react-pdf) |
| CRM / données | **Airtable** (+ écriture via nœud Airtable) | **Supabase** (client serveur Next.js) |
| Dashboard | **Airtable Interface** (no-code) | Page React/Next sur-mesure |
| Relances | Schedule Trigger n8n + email | n8n en back-office (Schedule + email) |
| Pour qui | Équipe qui vise un résultat solide, peu de code | Équipe à l'aise en code, vise l'excellence |

> **Piège** : ne PAS dupliquer la logique d'agent dans n8n ET dans le SDK.
> **À noter** : `Airtable Interface` ne lit que des données Airtable ; `Supabase` impose un dashboard custom React/Next.
> Tout outil **alternatif** doit être justifié dans le dossier et validé au follow-up #1.

---

## 3. Le moteur de pricing — `calculer_devis()`

### Contrat (déterministe, testé, AUCUN appel LLM)
```
calculer_devis(params) ->
  params = { nb_passagers, date_depart, date_demande,
             distance_km, type_vehicule, options[],
             aller_retour /* ou date_retour */ }
  // sortie
  -> { prix_ht, tva, prix_ttc,
       lignes: [ { libelle, montant }, ... ],
       coefficients: [ ... ], devise: "EUR" }
```
La sortie doit **détailler chaque ligne et chaque coefficient** : le commercial doit pouvoir expliquer et auditer le devis.

### 3.1 Base de calcul — grille forfait jusqu'à 180 km (transfert simple, aller seul)
| km | € | km | € | km | € |
|----|----|----|----|----|----|
| ≤30 | 250 | 80 | 500 | 130 | 700 |
| 40 | 320 | 90 | 540 | 140 | 740 |
| 50 | 350 | 100 | 580 | 150 | 780 |
| 60 | 390 | 110 | 620 | 160 | 820 |
| 70 | 430 | 120 | 660 | 170 | 860 |
| | | | | 180 | 900 |

- **Au-delà de 180 km** : `(km × 2) × 2,5 €/km`  *(formule littérale du doc — voir question ouverte #1)*
- **Aller / retour** : si départ aller **ET** départ retour → `TRANSFERT SIMPLE × 2`

### 3.2 Coefficients additionnels
**Saisonnalité** (selon mois du départ)
| Niveau | Mois | Coef |
|--------|------|------|
| Basse | Nov, Jan, Fév, Août | **-7 %** |
| Moyenne | Déc, Oct, Sep | **0 %** |
| Haute | Mars, Avril, Juillet | **+10 %** |
| Très haute | Mai, Juin | **+15 %** |

**Pondération date demande vs date départ** (anticipation)
| Code | Coef |
|------|------|
| DD_PRIORITAIRE | **+10 %** |
| DD_URGENT | **+5 %** |
| DD_NORMAL | **-5 %** |
| DD_3MOISETPLUS | **-10 %** |
*(seuils exacts jour/urgence à définir — voir question ouverte #2)*

**Pondération capacité** (nb passagers)
| Tranche | Coef |
|---------|------|
| ≤ 19 | **-5 %** |
| 19 < n ≤ 53 | **0 %** |
| 53 < n ≤ 63 | **+15 %** |
| 63 < n ≤ 67 | **+20 %** |
| 67 < n ≤ 85 | **+40 %** |
| **> 85** | **flux manuel → escalade commercial (pas de devis auto)** |

**Marge** : **+15 %** appliqués au devis avant envoi.

**Options / suppléments**
| Option | Tarif |
|--------|-------|
| Guide / accompagnateur | +80 € / jour |
| Nuit chauffeur | +120 € / nuit |
| Péages | forfait selon trajet |
| **TVA** | **10 %** |

### 3.2.bis Pipeline de calcul retenu (hypothèse par défaut — à valider au follow-up)
> Choisi pour être **auditable et déterministe**. Coefficients combinés en **additif** (plus simple à expliquer qu'un produit).
```
1. base_transport = grille(distance_km)            si distance ≤ 180 km
                  = distance_km × 2 × 2,5 €         si distance > 180 km   (le ×2 = retour à vide du car)
   si aller/retour explicite  → base_transport × 2
2. coef_total       = 1 + coef_saison + coef_date + coef_capacite     (ex : 1 + 0,10 + 0,05 - 0,05 = 1,10)
3. transport_ajuste = base_transport × coef_total
4. options_total    = (guide × nb_jours) + (nuit_chauffeur × nb_nuits) + peages
5. sous_total       = transport_ajuste + options_total
6. prix_ht          = sous_total × 1,15            (marge commerciale +15 %)
7. tva              = prix_ht × 0,10               (TVA 10 %)
8. prix_ttc         = prix_ht + tva
```
> Chaque étape = une ligne dans `lignes[]` + le coefficient dans `coefficients[]` pour l'audit.

### 3.3 Tests obligatoires (cas types ET cas limites)
Cas simple · demande urgente · hors zone · **0 passager** · date incohérente · gros volume (>85 → manuel) · option nuit chauffeur.
Sortie attendue : prix total + détail auditable.

> ⚠️ **L'ensemble des paramètres (grille, coefs, marge, options) doit être pilotable** (stocké en base, table `Matrices`), modifiable sans toucher au code de l'IA.

---

## 4. Modèle de données (minimum 4 tables)

- **Demandes** : prospect, type client, départ, destination, dates (départ/retour), nb passagers, type trajet, urgence, distance_km, statut, score de complétude, commentaire.
- **Matrices** : grille km, coef saison, coef date, coef capacité, options, TVA, marge *(pilotables)*.
- **Devis** : montant HT/TTC, lignes de calcul, coefficients appliqués, statut, lien PDF, date d'envoi, prochaine relance, nb de relances.
- **Relances** : devis lié, type (J+2 / J+3 / J+7), date planifiée, statut, date d'envoi.
- *(Bonus)* **Clients** : coordonnées, historique, type, consentement minimal.
- *(Bonus)* **Logs** : actions agent, appels outils, erreurs, coûts tokens, validations.

### Statuts commerciaux (machine à états)
```
Nouveau lead → Demande incomplète → Demande qualifiée → Devis envoyé
   → Relance 1 → Relance 2 → Accepté (gagné) / Refusé / Cas complexe transmis → Clôturé
```
Données à collecter (RGPD-minimal) : type client, nom/société, email, téléphone, villes départ/destination, dates, nb passagers, type trajet, urgence, commentaire, statut.

---

## 5. Garde-fous IA (10 pts au barème — à traiter explicitement)

| Notion | Application concrète sur NeoTravel |
|--------|-------------------------------------|
| **Garde-fou déterministe** | Prix toujours via `calculer_devis()`, jamais le LLM. Température basse pour l'extraction. |
| **Sorties structurées** | Schéma imposé (Zod TS / Pydantic) validé **avant** d'appeler le tool ; si champ manquant/invalide → l'agent redemande. |
| **Hallucinations / grounding** | Réponses ancrées sur la base (zones, règles). *No sources → no answer.* |
| **HITL (human-in-the-loop)** | Seuils d'escalade : montant élevé, faible certitude, données incomplètes, >85 passagers, cas atypique → handoff humain avec contexte + message de repli ("un conseiller vous recontacte sous 24h"). |
| **Prompt injection (OWASP LLM01)** | Le calcul déterministe protège (un code ne négocie pas). Baliser le message client (non fiable) vs instructions système. Ne jamais exécuter une instruction trouvée dans un message user. |
| **RGPD / minimisation** | Données fictives/minimales, anonymiser logs/jeux de test, pas de PII en clair dans les traces, finalité claire. |
| *(Bonus)* **Observabilité** | Trace par devis : tool_calls, tokens, coût €, latence, statut. |
| *(Bonus)* **Idempotence** | Clé d'idempotence + dedupe gate sur les webhooks/relances (éviter relance ou devis en double). |

---

## 6. Choix du modèle LLM (à argumenter dans L1)

Critères imposés : **coût · qualité · latence · capacité de sorties structurées · compatibilité stack · limites observées · adéquation usage**.
Règle d'or : *« utilisez le LLM pour assister, structurer, communiquer ; du code déterministe pour calculer, tracer, engager NeoTravel »*. Le meilleur modèle = le plus adapté/fiable au bon coût, pas le plus puissant.

**Budget IA : 10-15 € par groupe, plafonné, usage projet uniquement.** À piloter comme un vrai budget.
**Budget outils global : < 1000 €/mois** (réaliste PME), à mettre en perspective avec le ROI.

---

## 7. Récap GO / NO-GO

### ✅ GO (à faire)
- Construire et **tester `calculer_devis()` en isolation AVANT de brancher l'IA**.
- Couvrir **toute la chaîne** des 10 fonctions, même basiquement.
- Pricing **pilotable** (paramètres en base, modifiables sans toucher le code IA).
- **Commiter souvent**, historique lisible, README + `.env.example`.
- Sorties structurées validées avant tool call.
- Prévoir l'**escalade humaine** (HITL) sur chaque cas sensible.
- Démo : relances avec **délai court (ex. 2 min)** + config réelle (J+2/J+3/J+7) documentée.
- Front hébergé (Vercel) ; agent n8n via **tunnel local accepté** en option A.
- Justifier stack + modèle LLM dans le dossier.

### ❌ NO-GO (à éviter absolument)
- ❌ Faire **seulement un chatbot** sans process derrière.
- ❌ Laisser **l'IA calculer le prix** (piège le plus dangereux).
- ❌ Inventer des règles / appliquer une remise seul / envoyer une offre engageante sans garde-fou.
- ❌ Dupliquer la logique agent (n8n **et** SDK).
- ❌ Stocker des **données personnelles réelles** / logger des PII en clair.
- ❌ Dashboard **décoratif** (doit être actionnable).
- ❌ Empiler des outils sans architecture cohérente / non justifiés.
- ❌ Négliger relances, cas complexes, reprise humaine.
- ❌ Sous-documenter (pricing sans tests, README absent, 1 seul commit la veille).
- ❌ Consommer le crédit IA pour des tests hors projet / modèles premium non validés.

---

## 8. Vocabulaire à employer juste (glossaire — pour le dossier & la soutenance)

- **Chatbot ≠ Agent IA** : un chatbot discute ; un agent **orchestre des actions et appelle des outils**.
- **IA générative ≠ moteur de règles** : l'IA formule/assiste ; le moteur **calcule de façon stable**.
- **Qualification ≠ validation** : qualifier ≠ valider un prix ou une offre engageante.
- **Workflow ≠ décision métier** : un workflow exécute des étapes ; les décisions sensibles sont encadrées.
- **Lookup ≠ RAG ≠ moteur de calcul** : lookup = valeur exacte en base ; RAG = info documentaire ; moteur = règles métier → prix.
- ❌ Ne jamais dire *« l'IA calcule le prix »*. ✅ Dire : *« l'agent collecte les infos, lit les règles applicables et appelle le tool `calculer_devis()` qui calcule de manière déterministe. »*

---

## 9. Hypothèses retenues sur les zones floues (à faire valider au follow-up #1)

> Décision : on avance avec des **choix par défaut raisonnables, documentés**. Marqués `[HYPOTHÈSE]` dans le code pour révision facile.

1. **Formule > 180 km** `[HYPOTHÈSE]` → `distance_km × 2 × 2,5 €`. Le `× 2` = trajet retour à vide du car (lecture littérale + logique métier du deadhead).
2. **Seuils codes date** `[HYPOTHÈSE]` (anticipation = `date_depart − date_demande`) :
   | Anticipation | Code | Coef |
   |---|---|---|
   | < 7 jours | DD_PRIORITAIRE | +10 % |
   | 7 à 29 jours | DD_URGENT | +5 % |
   | 30 à 89 jours | DD_NORMAL | -5 % |
   | ≥ 90 jours | DD_3MOISETPLUS | -10 % |
3. **Ordre de calcul** `[HYPOTHÈSE]` → voir pipeline §3.2.bis : base → coefficients (additif) → options → marge +15 % → TVA 10 %.
4. **Distance** `[HYPOTHÈSE]` → au MVP, saisie/estimée par le prospect (champ `distance_km`). Évolution P2 : API de calcul d'itinéraire (Google Distance Matrix / OSRM).
5. **Péages** `[HYPOTHÈSE]` → forfait par défaut 0 € au MVP (champ pilotable dans `Matrices`), affiné par trajet en P2.

> Ces 5 points sont les **premières questions à poser à l'intervenant** au follow-up du 25/06.
