# PiloteDSI — Logiciel de gestion de projet

Application de gestion de projet pensée pour une **Direction des Systèmes d'Information**.
Couvre le pilotage de portefeuille, la gestion de projets en mode Agile comme en cycle classique,
le suivi des tâches, des risques, des jalons, des ressources et du budget.

> 100 % autonome : **aucune installation, aucun serveur, aucune base de données**.
> Tout fonctionne dans le navigateur, les données sont stockées localement.

---

## Démarrer

**Le plus simple :** double-cliquez sur `index.html` (s'ouvre dans votre navigateur).

**Ou** lancez `start.bat` (ouvre l'application dans le navigateur par défaut).

> Les données de démonstration se chargent automatiquement au premier lancement.

---

## Fonctionnalités

| Module | Description |
|---|---|
| **Tableau de bord** | KPI portefeuille, santé des projets, charge équipe, jalons à venir, projets à surveiller |
| **Portefeuille** | Liste filtrable/triable des projets, fiches synthétiques, indicateurs de santé |
| **Détail projet** | Synthèse, Kanban, planning Gantt, risques, jalons, décisions, équipe & budget |
| **Kanban** | Tableau de tâches par statut, **glisser-déposer**, filtres projet/personne |
| **Planning (Gantt)** | Diagramme de Gantt des tâches + jalons, ligne « aujourd'hui » |
| **Backlog & Sprints** | Backlog priorisé, itérations (sprints), points/charge, affectation au sprint |
| **Risques** | Registre des risques, **matrice de criticité 5×5**, plans de maîtrise |
| **Ressources** | Plan de charge par membre, capacité, alerte de surcharge |
| **Rapports** | Synthèses de pilotage imprimables (PDF via impression navigateur) |

### Méthodologies couvertes
Agile / Scrum, Kanban, Cycle en V, Hybride — paramétrable par projet.

---

## Données

- **Stockage** : `localStorage` du navigateur (par poste/profil).
- **Export / Import JSON** : menu *Données & options* (barre latérale) → sauvegarde et partage.
- **Réinitialisation** : recharger la démo ou tout effacer depuis le même menu.

⚠️ Les données étant locales au navigateur, pour un usage multi-utilisateurs partagé,
voir la section « Évolutions » ci-dessous.

---

## Architecture

```
gestion-projet/
├── index.html              Point d'entrée
├── start.bat               Lanceur Windows
├── assets/
│   ├── css/styles.css      Feuille de style complète
│   └── js/
│       ├── store.js        Modèle de données, persistance, données de démo
│       ├── utils.js        Helpers, composants UI (modale/toast), graphiques SVG
│       ├── app.js          Routeur, navigation, barre latérale
│       └── views/
│           ├── core.js     Tableau de bord, portefeuille, détail projet, formulaires
│           └── boards.js   Kanban, Gantt, backlog, risques, ressources, rapports
```

Aucune dépendance externe. JavaScript « vanilla », graphiques en SVG faits maison.

---

## Évolutions possibles (passage en production multi-utilisateurs)

La couche de données (`store.js`) est isolée derrière une petite API (`Store.Q` / `Store.M`).
Pour un usage partagé en équipe, on peut remplacer la persistance `localStorage` par une
base **Supabase** (déjà utilisée par ailleurs dans votre environnement) sans toucher aux vues :

1. Créer les tables `projects`, `tasks`, `risks`, `milestones`, `sprints`, `people`, `decisions`.
2. Réimplémenter `Store.Q` / `Store.M` en appels Supabase (auth + RLS par rôle).
3. Ajouter l'authentification et la gestion des droits (lecture / contributeur / chef de projet).

Autres pistes : notifications, pièces jointes, dépendances de tâches dans le Gantt,
courbe d'avancement (burndown), export Excel, intégration calendrier.
