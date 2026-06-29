# Moteur de devis déterministe — `calculer_devis()`

> La **pièce critique** du projet (10 pts au barème). Construite et testée **en isolation, avant l'IA**.
> Règle d'or : le LLM ne calcule jamais le prix — il appelle ce code comme un outil.

## Fichiers
| Fichier | Rôle |
|---------|------|
| `matrices.js` | Tous les paramètres tarifaires (grille, coefs, options, marge, TVA). **Pilotables** — miroir versionné de la table Airtable `Matrices`. |
| `calculer_devis.js` | La fonction de calcul (module testé, source de vérité). |
| `calculer_devis.test.js` | 13 tests (cas types + cas limites du brief). |
| `n8n-code-node.js` | Version **auto-suffisante** à coller dans un nœud Code n8n (Option A). |
| `demo.js` | Affiche des devis exemples lisibles. |

## Commandes
```bash
npm test      # lance les 13 tests (node:test, sans dépendance)
npm run demo  # affiche des devis exemples détaillés
```

## Contrat
**Entrée** `params` :
```js
{
  nb_passagers: 40,            // requis, >= 1
  date_depart:  '2026-09-15',  // requis, 'YYYY-MM-DD'
  date_demande: '2026-08-01',  // requis, sert à l'anticipation
  distance_km:  50,            // requis, > 0
  aller_retour: false,         // optionnel
  options: [{ code: 'nuit_chauffeur', quantite: 1 },
            { code: 'guide', quantite: 2 }]  // optionnel ('peages' aussi)
}
```
**Sortie** : un des trois cas
- **Devis** : `{ prix_ht, tva, prix_ttc, devise, lignes[], coefficients[], meta }`
- **Escalade** (> 55 passagers, au-delà d'un autocar standard) : `{ escalade: true, raison, params }`
- **Erreur** de validation : `{ erreur: true, message, champ }`

## Pipeline de calcul
```
1. base       = grille(distance)  si <=180 km ; sinon distance×2×2,5 €   (×2 si aller/retour)
2. coef_total = 1 + saison + anticipation + capacité            (additif)
3. transport  = base × coef_total
4. options    = guide×jours + nuit×nuits + péages
5. HT         = (transport + options) × 1,15                    (marge)
6. TVA        = HT × 0,10
7. TTC        = HT + TVA
```

## Garde-fous intégrés
- **0 ou < 1 passager**, **distance ≤ 0**, **date incohérente** → `{ erreur }` (jamais de prix).
- **> 55 passagers** → `{ escalade }` vers le commercial (HITL).
- **Arrondi prévisible** au centime (robuste aux artefacts flottants).
- **Déterminisme garanti** (testé) : deux appels identiques ⇒ résultat identique.

## Hypothèses de barème
Formule > 180 km, seuils des codes date, ordre marge/TVA, distance, péages : marquées `[HYPOTHESE]` dans `matrices.js`. Le barème est pilotable (voir `pricing_config` en base et `DOC_TECHNIQUE.md §8`).

## Synchro module ↔ n8n
`n8n-code-node.js` est un **inline** de `matrices.js` + `calculer_devis.js`. En cas de modif : changer le module testé d'abord, relancer `npm test`, puis reporter dans le nœud n8n.
