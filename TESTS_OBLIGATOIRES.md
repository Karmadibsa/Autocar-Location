# Tests obligatoires — comportement attendu

Chaque cas est rejouable d'un clic depuis le **panneau « Tests rapides (cas
obligatoires) »** sous le chat (visible aussi en production). Les cas « garde-fou »
sont aussi couverts par les tests automatisés (`npm test` à la racine + `npx vitest run`
dans `web`).

| # | Test | Entrée (bouton) | Comportement attendu |
|---|------|-----------------|----------------------|
| 1 | **Cas simple** | Lyon → Annecy, 50 pax, A/R, 12/07/2026 | Devis chiffré normal : forfait selon la distance + coefficients (saison, anticipation, capacité), marge +15 %, TVA 10 %. |
| 2 | **Demande urgente** | Bordeaux → Arcachon, 40 pax, dans 4 j | Départ < 7 jours → coefficient d'anticipation majoré (DD_PRIORITAIRE +10 % / DD_URGENT +5 %), demande marquée « urgent », 1re relance à J+2. |
| 3 | **Hors zone (>180 km)** | Paris → Marseille, 40 pax, aller simple | Au-delà de 180 km, tarif au km (km × 2 × 2,5 €) au lieu du forfait grille. |
| 4 | **0 passager** | Lyon → Annecy, 0 passager | Garde-fou : `calculerDevis` renvoie `{ erreur, champ: "nb_passagers" }` → **aucun prix**, l'agent redemande le nombre de passagers. |
| 5 | **Date incohérente** | Lyon → Annecy, départ 12/07 **et retour 10/06** | Retour antérieur au départ → l'agent **refuse de chiffrer** et demande de corriger les dates. (Le moteur garde aussi le contrôle départ < demande.) |
| 6 | **Gros volume** | Marseille → Lille, 120 pax | > 55 places (un autocar standard) → **escalade cas complexe** : pas de devis auto, la demande passe en `cas_complexe`, message **discret** au client + collecte des coordonnées pour rappel sous 24 h. |
| 7 | **Option nuit chauffeur** | Lille → Bruxelles, 30 pax, + nuit chauffeur | Ligne supplémentaire **+120 €/nuit** ajoutée au devis (avant marge/TVA). |

## Règles géographiques (nouvelles)

| Test | Entrée | Comportement attendu |
|------|--------|----------------------|
| **Ville hors France** | ex. « … vers Genève » / « … vers Bruges » (Belgique) | Le géocodage détecte un pays ≠ France → **cas complexe** (transfrontalier) : pas de devis auto, étude sur-mesure, message discret + collecte des coordonnées. |
| **Deux villes de même nom** | ex. « Saint-Just », « Sainte-Marie » sans précision | Le géocodage détecte plusieurs communes françaises homonymes → l'agent **demande le code postal** avant de chiffrer (aucun devis tant que l'ambiguïté n'est pas levée). Si l'utilisateur a déjà donné un code postal (5 chiffres), on ne redemande pas. |

## Où c'est implémenté

- **Moteur de prix déterministe** : `web/lib/calculerDevis.ts` (miroir : `pricing/matrices.js` + `pricing/calculer_devis.js`, utilisé par n8n).
  - Forfait/longue distance, coefficients, marge, TVA, **garde-fous** (0 pax, distance ≤ 0, date incohérente), **escalade > 55 pax**.
- **Vérifs géographiques** : `web/lib/distance.ts` → `geocodeVille()` / `analyserTrajet()` (Nominatim) : `horsFrance` + `ambigue`.
- **Orchestration** : `web/app/api/chat/route.ts` :
  - recalcul du prix avec la distance routière réelle (OSRM) ;
  - hors France → `escalade` ; ville ambiguë → réponse « précisez le code postal » ;
  - escalade rendue **discrète** côté client (jamais la raison interne ni le seuil).
- **Boutons de test** : `web/app/components/Chat.tsx` (constante `SCENARIOS`, panneau visible en prod).

## Notes

- **Test #5 (date incohérente)** : on **part du principe que les dates sont cohérentes**
  (une année passée est tolérée/corrigée). Le seul cas rejeté est **retour < départ**,
  vérifié dans `/api/chat` → l'agent demande de corriger. (`date_retour` est extrait par
  l'agent n8n — voir le prompt d'extraction.)
- **Règle d'or** : le prix vient **toujours** du moteur déterministe, jamais du LLM.
  Le bouton bonus « tentative de remise » le prouve (le « -20 % » est ignoré).
- **Seuil cas complexe = 55** (moyenne de places d'un autocar standard).
