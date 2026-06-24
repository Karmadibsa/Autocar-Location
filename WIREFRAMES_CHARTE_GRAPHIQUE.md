# NeoTravel — Wireframes & charte graphique

> **Brief de design prêt à transmettre à une IA (Figma AI, Claude, v0…).**
> Objectif : concevoir l'interface prospect de NeoTravel où **la conversation EST l'interface** (inspiration Mindtrip.ai), pas un widget chatbot en coin. Style « rough / léger » accepté pour le cadrage — mais la direction artistique ci-dessous doit être respectée.

---

## 0. Comment utiliser ce document
Ce fichier est la **charte haute-fidélité** (direction artistique pour produire le rendu final). Il s'utilise **avec** :
- les **wireframes low-fidelity** (rough, annotés) : `livrables/L1-dossier-cadrage/wireframes/01-landing-lowfi.svg` et `02-chat-lowfi.svg` → ce sont eux qu'on met dans le dossier de cadrage (le barème demande « rough, pas de high-fidelity »).
- le **prompt prêt à coller dans Figma Make** : `PROMPT_FIGMA_MAKE.md`.

Deux niveaux de fidélité, deux usages :

| Version | Fichier | Usage |
|---------|---------|-------|
| **Low-fidelity** (structure + intentions) | `wireframes/*.svg` | Livrable L1 — prouver qu'on a pensé l'UX avant de coder |
| **Haute-fidelity** (charte appliquée) | ce fichier + Figma Make | Générer le rendu visuel final |

---

## 1. Principes directeurs
1. **La conversation au centre** — le prospect parle de son besoin en langage naturel ; l'IA guide, reformule, complète. Le formulaire classique est remplacé (ou réduit à un fallback).
2. **Digitaliser sans déshumaniser** — ton chaleureux, rassurant, humain ; on sent qu'« on s'occupe de lui » même sans humain encore impliqué.
3. **Confiance + rapidité** — transparence des prix, réponse immédiate, preuve sociale. NeoTravel = intermédiaire fiable (depuis 2010).
4. **Sobriété premium** — beaucoup de blanc, une seule couleur d'accent forte, typographie nette. Pas de surcharge.

---

## 2. Design tokens (JSON)

```json
{
  "color": {
    "brand":        "#0E7A66",  
    "brand-dark":   "#0A5346",  
    "brand-soft":   "#D9F0EA",  
    "accent":       "#C6F24E",  
    "accent-dark":  "#A9D62E",  
    "ink":          "#14201D",  
    "ink-soft":     "#5C6B66",  
    "bg":           "#FFFFFF",  
    "bg-muted":     "#F4F8F6",  
    "bg-dark":      "#0B1F1A",  
    "border":       "#E3EAE7",  
    "success":      "#1FB46A",
    "warning":      "#E08A1E",
    "error":        "#D14343",
    "info":         "#2D6CDF"
  },
  "font": {
    "display": "Inter, 'Segoe UI', system-ui, sans-serif",
    "body":    "Inter, 'Segoe UI', system-ui, sans-serif",
    "mono":    "'Roboto Mono', 'Courier New', monospace"
  },
  "radius": { "sm": "8px", "md": "14px", "lg": "20px", "pill": "999px" },
  "shadow": {
    "card": "0 4px 16px rgba(14,122,102,0.08)",
    "float": "0 12px 32px rgba(11,31,26,0.16)"
  },
  "space": [0, 4, 8, 12, 16, 24, 32, 48, 64, 96]
}
```

### Usage couleurs
- **`brand` (teal)** : couleur d'identité, titres, liens, icônes, header.
- **`accent` (lime)** : **CTA principaux uniquement** (boutons « Obtenir mon devis », envoi), rappel du logo/bus. Ne pas en abuser.
- **`bg-dark`** : sections hero alternatives / footer.
- Contraste : viser WCAG AA (texte `ink` sur `bg`/`bg-muted` ; sur `accent` utiliser texte `ink` foncé, jamais blanc).

### Typographie (échelle)
> **Police unique, professionnelle et universelle : Inter** (fallback Segoe UI / system-ui). Aucune typographie display/exotique. Mono uniquement pour le détail chiffré du devis.

| Rôle | Police | Taille / poids |
|------|--------|----------------|
| H1 / titre | Inter | 40-52px, 600-700 |
| H2 | Inter | 26-30px, 600 |
| H3 | Inter | 19-21px, 600 |
| Corps | Inter | 16px, 400 |
| Petit / légende | Inter | 13-14px, 400, `ink-soft` |
| Code / prix détaillé | Roboto Mono | 14px |

### Composants clés (specs)
- **Bouton primaire** : fond `accent`, texte `ink`, radius `pill`, padding 14×24, ombre `card` au survol. 
- **Bouton secondaire** : contour `brand`, texte `brand`, fond transparent.
- **Champ de saisie / composer chat** : fond `bg`, bordure `border` (focus = `brand`), radius `lg`, icône d'envoi `accent`.
- **Bulle message agent** : fond `brand-soft`, texte `ink`, radius `lg` (coin bas-gauche carré), avatar rond `brand`.
- **Bulle message prospect** : fond `bg-muted`, alignée à droite, radius `lg` (coin bas-droit carré).
- **Carte devis** : fond `bg`, bordure `border`, radius `md`, ombre `card` ; entête `brand`, lignes de détail en `mono`, total en grand sur bandeau `accent`.
- **Badge statut** : pill, fond teinté selon état (success/warning/info), texte foncé.
- **Carte KPI (dashboard)** : fond `bg`, valeur en display 32px `brand`, label `ink-soft`.
- **Chips d'aide** (suggestions sous le composer) : pill `brand-soft`, texte `brand-dark`, cliquables.

---

## 3. Écran 1 — Landing conversationnelle (page principale)

**But** : capter le prospect et démarrer la qualification dans la conversation, dès le hero.

### Régions (de haut en bas)
1. **Header** (sticky, fond `bg`, ombre légère au scroll)
   - Logo NeoTravel (gauche).
   - Liens discrets : « Nos services », « Qui sommes-nous », « Avis clients ».
   - Bouton secondaire « Espace pro » (droite).
2. **Hero conversationnel** (plein écran, fond dégradé `bg` → `brand-soft`, ou `bg-dark` en variante)
   - **Titre display** : « Où partez-vous en groupe ? » (ou « Votre devis autocar, en conversation. »).
   - Sous-titre `ink-soft` : « Décrivez votre trajet, on s'occupe du reste — réponse en quelques minutes. »
   - **Zone de conversation centrale** = pièce maîtresse :
     - 1 bulle agent d'accueil : « Bonjour 👋 Dites-moi votre besoin : départ, destination, dates et nombre de passagers. »
     - **Composer** large (input + bouton envoi `accent`) directement sous la bulle.
     - **Chips de suggestion** sous le composer : « Lyon → Annecy, 50 pers. », « Sortie scolaire », « Séminaire 2 jours », « Aller/retour ».
   - Réassurance sous la zone (petite ligne, icônes) : « ✓ Depuis 2010 · ✓ Réseau d'autocaristes qualifiés · ✓ Devis gratuit & sans engagement ».
3. **Bandeau confiance** (fond `bg-muted`) : 3-4 logos/chiffres (« 60+ demandes/jour traitées », « Couverture nationale », note avis).
4. **Comment ça marche** (3 étapes, icônes `brand`) : 1. Vous décrivez → 2. On qualifie & chiffre → 3. Vous recevez votre devis.
5. **Footer** (fond `bg-dark`, texte clair) : liens, mentions, RGPD, contact.

### Annotations
- La conversation doit être **visible sans scroller** (above the fold) sur desktop ET mobile.
- Le formulaire structuré classique n'existe pas en page ; s'il faut un fallback, le proposer comme lien discret « Préférez un formulaire ? ».
- Micro-interactions : le composer pulse légèrement à l'arrivée ; les chips remplissent l'input au clic.

```
DESKTOP (rough)
┌───────────────────────────────────────────────────────────┐
│  [logo] NeoTravel        Services  Avis        [Espace pro] │
├───────────────────────────────────────────────────────────┤
│                                                             │
│            Où partez-vous en groupe ?                       │
│     Décrivez votre trajet, on s'occupe du reste.            │
│                                                             │
│   ┌─────────────────────────────────────────────────┐      │
│   │ 🟢 Bonjour 👋 Dites-moi départ, destination,     │      │
│   │    dates et nombre de passagers.                 │      │
│   └─────────────────────────────────────────────────┘      │
│   ┌─────────────────────────────────────────────┬───┐      │
│   │ Votre message…                               │ ➤ │      │
│   └─────────────────────────────────────────────┴───┘      │
│   (Lyon→Annecy 50p) (Sortie scolaire) (Séminaire 2j)        │
│                                                             │
│   ✓ Depuis 2010   ✓ Autocaristes qualifiés   ✓ Gratuit     │
└───────────────────────────────────────────────────────────┘
```

---

## 4. Écran 2 — Conversation en cours (qualification → devis)

**But** : qualifier, détecter les infos manquantes, afficher le devis dans le fil.

### Layout
- **Colonne conversation** (centrale, max-width ~720px) : fil de bulles agent/prospect.
- **Panneau latéral récap** (desktop, droite ; en accordéon repliable sur mobile) : « Votre demande » avec les champs collectés au fur et à mesure (départ, destination, dates, passagers, options) + indicateur de complétude.

### Séquence à illustrer (3 sous-états)
1. **Collecte / champ manquant** : l'agent reformule et demande ce qui manque.
   - Bulle agent : « Super, Lyon → Annecy le 14/07 pour 50 personnes. C'est un aller simple ou un aller/retour ? »
   - Le panneau récap montre les champs remplis (✓) et manquants (•).
2. **Devis prêt** : une **carte devis** s'insère dans le fil.
   - Entête `brand` : « Votre devis — NeoTravel ».
   - Lignes en `mono` : forfait, coefficients, options, marge.
   - **Bandeau total `accent`** : « Total TTC : 1 628 € ».
   - Mention : « Prix calculé selon nos règles tarifaires · valable sous réserve de disponibilité ».
   - Boutons : primaire « Recevoir par email », secondaire « Modifier ma demande ».
3. **Cas complexe / escalade (HITL)** : bandeau `info`.
   - Bulle agent : « Votre demande est spécifique — je la transmets à un conseiller qui vous recontacte sous 24 h. »

### Annotations
- Le **prix vient toujours de la carte devis** (générée par le moteur déterministe), jamais « écrit » par l'agent dans une phrase.
- Afficher l'état « l'agent rédige… » (typing indicator) pendant les appels d'outils.
- Le panneau récap rend la collecte transparente et rassurante.

```
ÉCRAN 2 (rough)
┌──────────────────────────────┬───────────────────┐
│ 🟢 Aller simple ou A/R ?      │  VOTRE DEMANDE     │
│            Aller/retour 🔵    │  ✓ Lyon → Annecy   │
│ 🟢 Voici votre devis :        │  ✓ 14/07           │
│  ┌────────────────────────┐   │  ✓ 50 passagers    │
│  │ Devis — NeoTravel      │   │  • Options ?       │
│  │ Forfait .......  660 € │   │  [■■■■□] 80%        │
│  │ Coeff. ........  +99 € │   │                    │
│  │ ▓ Total TTC : 1 628 € ▓│   │                    │
│  │ [Recevoir] [Modifier]  │   │                    │
│  └────────────────────────┘   │                    │
│ ┌──────────────────────┬─┐    │                    │
│ │ Votre message…       │➤│    │                    │
│ └──────────────────────┴─┘    │                    │
└──────────────────────────────┴───────────────────┘
```

---

## 5. (Bonus) Écran 3 — Devis PDF & email
Gabarit du **devis PDF** envoyé (reprend la carte devis en page A4) : logo, coordonnées, « VOTRE VOYAGE » (passagers, départ/arrivée, dates), **bandeau total `accent`**, mentions (ce que le prix comprend / reste à charge), conditions. Email d'accompagnement : objet « Votre devis NeoTravel », ton chaleureux, CTA « Voir mon devis ».

## 6. (Bonus) Écran 4 — Dashboard direction
Vue pilotage (interne, sobre, data-dense mais lisible) :
- **Bandeau KPI** (cartes) : Leads reçus · Devis envoyés · Taux de conversion · Relances en attente · Demandes urgentes · Délai moyen.
- **Pipeline** (colonnes par statut : Nouveau → Qualifié → Devis envoyé → Relance → Gagné/Perdu).
- **Table des demandes** filtrable (statut, urgence, montant).
- Accent réservé aux chiffres clés et alertes.

---

## 7. Responsive & accessibilité
- **Mobile-first** : la conversation occupe l'écran ; le panneau récap passe en accordéon en haut.
- Cibles tactiles ≥ 44px ; composer fixé en bas sur mobile.
- Contraste AA minimum ; ne jamais mettre du texte blanc sur `accent` (lime) → utiliser `ink`.
- États focus visibles (anneau `brand`).

---

## 8. À fournir au design (récap livrables attendus)
1. **Écran 1** — Landing conversationnelle (desktop + mobile).
2. **Écran 2** — Conversation : 3 états (collecte, devis, escalade).
3. *(Bonus)* Écran 3 — gabarit devis PDF + email.
4. *(Bonus)* Écran 4 — dashboard direction.
5. Le **kit de tokens** (section 2) appliqué en styles/variables.
