# Diagrammes — Autocar Location

Tous les schémas du projet au même endroit (Mermaid, rendus par GitHub / mermaid.live).
Pour le détail des tables, voir aussi **[supabase/SCHEMA.md](../supabase/SCHEMA.md)**.

---

## 1. Architecture générale

Qui parle à quoi. Le **front Next.js** (Netlify) est le centre : il sert les pages,
contient toute la logique métier (`/api/*`), appelle l'agent **n8n** (lui-même appelle
**Gemma**), récupère la **distance** (OSRM), et écrit dans **Supabase** + envoie les emails (**Resend**).

```mermaid
flowchart TB
    subgraph Utilisateurs
        Prospect
        Client
        Admin
    end
    subgraph Application
        Front_NextJS
        n8n_Agent
    end
    subgraph Services
        Supabase
        Gemma
        Resend
        OSRM
    end
    Prospect --> Front_NextJS
    Client --> Front_NextJS
    Admin --> Front_NextJS
    Front_NextJS --> n8n_Agent
    n8n_Agent --> Gemma
    Front_NextJS --> OSRM
    Front_NextJS --> Supabase
    Front_NextJS --> Resend
```

> Version image détaillée (routes, services, relances, HITL) : **[architecture.svg](architecture.svg)**.

![Architecture Autocar Location](architecture.svg)

---

## 2. Parcours PROSPECT — du chat au devis

L'agent ne fait **qu'un appel LLM** (extraction) ; le **prix et la réponse** sont
calculés/écrits par le nœud Code (déterministe). Au-delà de 85 passagers → cas complexe.

```mermaid
flowchart TB
    A[Le prospect décrit son besoin dans le chat] --> B["/api/chat relaie à n8n"]
    B --> C[n8n - Extraction des paramètres - 1 appel LLM]
    C --> D[Nœud Code - calcul déterministe + réponse]
    D --> E{Plus de 85 passagers ?}
    E -->|Oui| F[Cas complexe - un conseiller recontacte]
    E -->|Non| G[Devis calculé]
    G --> H["/api/chat - distance réelle OSRM + persistance Supabase"]
    H --> I[Email avec PDF - boutons Accepter / Refuser]
    I --> J[Le devis s'affiche dans le chat]
```

---

## 3. Parcours CLIENT — répondre à son devis

```mermaid
flowchart TB
    A[Email reçu] --> B{Choix}
    B -->|Accepter| C["/devis/accepter"]
    C --> D{Compte existant ?}
    D -->|Oui| E[Connexion - email pré-rempli]
    D -->|Non| F[Inscription pré-remplie - prénom/nom/email]
    E --> G[Espace client]
    F --> G
    G --> H[Accepter le devis]
    H --> I{Adresse connue ?}
    I -->|Non| J[Compléter l'adresse - onglet Mon compte]
    I -->|Oui| K[Devis accepté - facture carrée]
    B -->|Refuser| L["/devis/refuser - sans compte"]
    L --> M[Motifs - checkboxes]
    M --> N[Refus enregistré - relances stoppées]
```

---

## 4. Parcours ADMIN — pilotage commercial

```mermaid
flowchart TB
    A[Connexion admin] --> B[Dashboard /admin]
    B --> C[KPIs + courbe + camembert des refus]
    B --> D[Table triable / filtrable / recherche]
    B --> E[Export PDF des stats]
    D --> F{Type de demande}
    F -->|Cas complexe| G[Devis sur-mesure - prix HT puis envoi]
    G --> H[La demande rejoint le pipeline]
    F -->|Devis en cours| I[Marquer Gagné / Perdu]
    B --> J[Lancer les relances dues]
```

---

## 5. Cycle de vie d'une demande (statuts)

```mermaid
flowchart LR
    nouveau_lead --> qualifiee
    qualifiee --> devis_envoye
    qualifiee --> cas_complexe
    devis_envoye --> relance_1
    relance_1 --> relance_2
    devis_envoye --> accepte
    devis_envoye --> refuse
    relance_2 --> cloture
    cas_complexe --> devis_envoye
    cas_complexe --> refuse
```

- **Automatique** : `nouveau_lead → … → relance_1 → relance_2 → cloture` (relances n8n).
- **Humain (HITL)** : `cas_complexe → devis sur-mesure → devis_envoye` ou `refuse`.
- **Issue** : `accepte` (gagné) / `refuse` / `cloture` (perdu).

---

## 6. Modèle de données

Diagramme complet (tables + colonnes + relations) dans **[supabase/SCHEMA.md](../supabase/SCHEMA.md)**.
