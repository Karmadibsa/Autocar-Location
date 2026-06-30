# Livrables — NeoTravel

Dossier des livrables formatés, organisés selon la grille de notation
(*7-livrables-attendus-et-modalites-soutenance*) et la liste de la page 8 du
*4-brief-demarrage-neotravel* (« Ce qui doit être rendu »).

| # | Livrable | Document | Échéance |
|---|----------|----------|----------|
| **L1** | Dossier de cadrage | [L1-dossier-cadrage/Dossier de cadrage V4.pdf](L1-dossier-cadrage/Dossier%20de%20cadrage%20V4.pdf) (+ [Argumentaire des choix](L1-dossier-cadrage/Argumentaire-des-choix-NeoTravel.docx) + [wireframes](L1-dossier-cadrage/wireframes)) | 24/06 |
| **L2** | Prototype & artefacts | [L2-prototype-et-artefacts/L2-Prototype-et-artefacts-NeoTravel.docx](L2-prototype-et-artefacts/L2-Prototype-et-artefacts-NeoTravel.docx) + le **dépôt Git** (code, README, workflows) | 29/06 |
| **L3** | Documentation de passation | [L3-documentation-de-passation/L3-Documentation-de-passation-NeoTravel.docx](L3-documentation-de-passation/L3-Documentation-de-passation-NeoTravel.docx) | 29/06 |
| **—** | Support de soutenance | [support-de-soutenance/Support-de-soutenance-NeoTravel.pptx](support-de-soutenance/Support-de-soutenance-NeoTravel.pptx) (PowerPoint à présenter) + [.docx](support-de-soutenance/Support-de-soutenance-NeoTravel.docx) (script/notes) | 30/06 |

## Correspondance avec la grille de notation

- **L1 — Dossier de cadrage (15 pts)** : diagnostic & frictions, matrices de priorisation, As-Is/To-Be, périmètre MVP, architecture & modèle de données, stack justifiée, KPIs, risques, wireframes, scénarios de conversation.
- **L2 — Prototype & artefacts (28 pts)** : prototype fonctionnel (chaîne complète), dépôt Git + README + variables d’env, tool `calculer_devis()` + tests, workflows n8n + **prompt système documenté**, dashboard & relances, **fiabilité & garde-fous** (prix déterministe, cas types/limites, HITL, RGPD, prompt injection, observabilité), qualité du code, **démarche Agile** (backlog, journal de décisions, rôles).
- **L3 — Documentation de passation (7 pts)** : procédure **repreneur technique**, procédure **équipe NeoTravel** (termes clés en clair), maintenance (pricing, emails, statuts, relances), backlog P1/P2/P3 & évolutions.
- **Soutenance (Blocs B & C, 50 pts)** : trame slide par slide (~20 min), notes d’orateur, **répartition de la parole**, démo live de bout en bout, défense des choix, limites assumées, Q&R préparées.

## Régénérer les documents

Les `.docx` sont générés depuis des scripts Node (librairie `docx`, déclarée à la
racine du dépôt) partageant la charte commune `_docx-kit.js`.

```bash
# depuis la racine du dépôt, une seule fois :
npm install

# puis, depuis ce dossier :
node L2-prototype-et-artefacts/build.js
node L3-documentation-de-passation/build.js
node support-de-soutenance/build.js
# (L1 : node L1-dossier-cadrage/build.js  +  build-argumentaire.js)

# Support de soutenance — PowerPoint (.pptx) à présenter :
npm install pptxgenjs        # une fois
node support-de-soutenance/build-pptx.js
```

> À l’ouverture dans Word, accepter la mise à jour des champs pour renseigner la
> table des matières (les documents sont configurés pour la mettre à jour
> automatiquement). Export PDF : *Fichier → Enregistrer sous → PDF*.
