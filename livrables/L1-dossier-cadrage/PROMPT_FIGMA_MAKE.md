# Prompt pour Figma Make — Interface prospect Autocar Location (haute-fidélité)

## Comment l'utiliser
1. Ouvre **Figma Make**.
2. **Joins les wireframes** comme références : `wireframes/01-landing-lowfi.svg`, `wireframes/02-chat-lowfi.svg` (structure à respecter). La charte (couleurs/typo) est dans les tokens du prompt ci-dessous et dans `web/app/globals.css`.
3. **Colle le prompt ci-dessous** (il contient déjà les tokens, donc il marche même sans les pièces jointes).
4. Itère écran par écran si besoin (« génère d'abord la landing, puis l'écran de chat »).

---

## Prompt à copier-coller

```
Tu es un designer produit senior. Crée une interface web HAUTE-FIDÉLITÉ, professionnelle et épurée, pour NeoTravel — une PME française d'intermédiation en transport de groupe (location d'autocars avec chauffeur). Le concept clé : la CONVERSATION EST L'INTERFACE (inspiration Mindtrip.ai), pas un widget chatbot dans un coin. Style sobre, premium, rassurant — surtout PAS enfantin ni gadget.

Respecte STRICTEMENT ces design tokens :

COULEURS
- Marque (teal) #0E7A66 ; marque foncée #0A5346 ; marque douce #D9F0EA
- Accent (lime, CTA UNIQUEMENT, usage parcimonieux) #C6F24E ; accent foncé #A9D62E
- Texte #14201D ; texte secondaire #5C6B66
- Fond #FFFFFF ; fond atténué #F4F8F6 ; fond sombre (footer/hero alt) #0B1F1A
- Bordure #E3EAE7
- États : succès #1FB46A, alerte #E08A1E, erreur #D14343, info #2D6CDF

TYPOGRAPHIE
- Police unique : Inter (fallback Segoe UI). Aucune police display/exotique.
- H1 40-52px/600-700 ; H2 26-30px/600 ; H3 19-21px/600 ; corps 16px/400 ; légende 13-14px ; détail chiffré du devis en Roboto Mono 14px.

STYLE
- Rayons : 8/14/20px, boutons en pill. Ombres douces (0 4px 16px rgba(14,122,102,.08)). Beaucoup de blanc. Une seule couleur d'accent forte.
- Boutons primaires = fond lime #C6F24E, texte foncé #14201D (jamais de texte blanc sur lime). Boutons secondaires = contour teal.
- Mobile-first, puis desktop. Accessibilité WCAG AA (contrastes, focus visibles, cibles ≥44px).

ÉCRAN 1 — LANDING CONVERSATIONNELLE
- En-tête sticky minimal : logo NeoTravel à gauche, navigation courte (Services, Avis), bouton secondaire « Espace pro » à droite.
- Hero plein écran (fond blanc → dégradé vers #D9F0EA) avec la ZONE DE CONVERSATION au centre, visible sans scroll :
  - Titre H1 orienté besoin : « Où partez-vous en groupe ? »
  - Sous-titre : « Décrivez votre trajet, on s'occupe du reste — réponse en quelques minutes. »
  - Une bulle d'accueil de l'agent (avatar rond teal) : « Bonjour 👋 Dites-moi votre besoin : départ, destination, dates et nombre de passagers. »
  - Un grand champ de saisie (composer) avec bouton d'envoi lime juste en dessous.
  - Une rangée de chips de suggestion cliquables : « Lyon → Annecy, 50 pers. », « Sortie scolaire », « Séminaire 2 jours », « Aller/retour ».
  - Ligne de réassurance avec icônes : « Depuis 2010 · Autocaristes qualifiés · Devis gratuit & sans engagement ».
- Bandeau confiance (fond #F4F8F6) avec 3-4 chiffres clés.
- Section « Comment ça marche » en 3 étapes (icônes teal) : 1. Vous décrivez → 2. On qualifie & chiffre → 3. Vous recevez votre devis.
- Footer sur fond sombre #0B1F1A : liens, mentions légales, RGPD, contact.

ÉCRAN 2 — CONVERSATION EN COURS (qualification → devis)
- Colonne conversation centrale (max 720px) : fil de bulles. Bulle agent = fond #D9F0EA, à gauche, avatar teal ; bulle prospect = fond #F4F8F6, à droite.
- Panneau latéral droit « Votre demande » (repliable en accordéon sur mobile) : checklist des champs collectés (Départ, Destination, Dates, Passagers) avec coches, et champ manquant (Options) en alerte ; barre de complétude (ex. 80 %).
- Génère 3 états :
  1) Collecte : l'agent reformule et demande l'info manquante (« aller simple ou aller/retour ? »). Indicateur « l'agent rédige… » (typing) pendant les appels d'outils.
  2) Devis prêt : une CARTE DEVIS s'insère dans le fil — entête teal « Votre devis — NeoTravel », lignes détaillées en Roboto Mono (forfait, coefficients, options, marge), un bandeau total en lime « Total TTC : 1 628 € », mention « Prix calculé selon nos règles tarifaires · valable sous réserve de disponibilité », boutons « Recevoir par email » (primaire) et « Modifier ma demande » (secondaire).
  3) Cas complexe : bandeau info #2D6CDF — « Votre demande est spécifique, je la transmets à un conseiller qui vous recontacte sous 24 h. »
- Composer fixé en bas de la colonne.

RÈGLES MÉTIER À RESPECTER DANS LE DESIGN
- Le prix apparaît TOUJOURS dans la carte devis structurée, JAMAIS écrit par l'agent dans une phrase libre.
- Le récapitulatif de la demande s'affiche AVANT l'envoi (transparence, rassurance).
- Ton chaleureux et humain : « digitaliser sans déshumaniser ».

Livrables : Écran 1 (desktop + mobile), Écran 2 avec ses 3 états (desktop + mobile), composants réutilisables (bouton, champ, bulle, carte devis, badge statut, carte KPI), et les styles/variables de couleurs et typo ci-dessus.
```

---

## Astuces
- Si Figma Make part trop « coloré/gadget » : ajoute « plus sobre, plus de blanc, accent lime uniquement sur les boutons d'action ».
- Pour cohérence : demande-lui de créer d'abord les **variables de couleurs et la typo** (design system), puis les écrans.
- Garde les **wireframes low-fi** comme référence de structure : « respecte le placement des zones des SVG joints ».
