// matrices.js — Paramètres de tarification NeoTravel (PILOTABLES)
// -----------------------------------------------------------------------------
// Source : "REGLES DE CALCUL COTATION DEVIS NEOTRAVEL.docx" + matrices de la
// présentation officielle. Tout est centralisé ici pour être modifiable SANS
// toucher au code de calcul ni au code de l'IA (exigence "pilotable en temps réel").
//
// En production (Option A / n8n) ces valeurs vivront dans la table Airtable
// "Matrices" ; ce fichier est le miroir versionné + valeur par défaut des tests.
// Les choix marqués [HYPOTHESE] sont à valider au follow-up du 25/06.
// -----------------------------------------------------------------------------

const MATRICES = {
  devise: 'EUR',

  // Grille forfait jusqu'à 180 km (transfert simple, aller seul).
  // On prend le 1er palier dont max_km >= distance.
  grille_forfait: [
    { max_km: 30, prix: 250 },
    { max_km: 40, prix: 320 },
    { max_km: 50, prix: 350 },
    { max_km: 60, prix: 390 },
    { max_km: 70, prix: 430 },
    { max_km: 80, prix: 500 },
    { max_km: 90, prix: 540 },
    { max_km: 100, prix: 580 },
    { max_km: 110, prix: 620 },
    { max_km: 120, prix: 660 },
    { max_km: 130, prix: 700 },
    { max_km: 140, prix: 740 },
    { max_km: 150, prix: 780 },
    { max_km: 160, prix: 820 },
    { max_km: 170, prix: 860 },
    { max_km: 180, prix: 900 },
  ],

  // Au-delà de 180 km : (distance_km × multiplicateur) × prix_km. [HYPOTHESE]
  // Le ×2 représente le retour à vide du car (deadhead) sur un aller simple.
  longue_distance: { seuil_km: 180, multiplicateur_distance: 2, prix_km: 2.5 },

  // Coefficient saisonnalité selon le MOIS DU DÉPART (1=janvier ... 12=décembre).
  saison_par_mois: {
    1: { niveau: 'basse', coef: -0.07 },
    2: { niveau: 'basse', coef: -0.07 },
    8: { niveau: 'basse', coef: -0.07 },
    11: { niveau: 'basse', coef: -0.07 },
    9: { niveau: 'moyenne', coef: 0 },
    10: { niveau: 'moyenne', coef: 0 },
    12: { niveau: 'moyenne', coef: 0 },
    3: { niveau: 'haute', coef: 0.10 },
    4: { niveau: 'haute', coef: 0.10 },
    7: { niveau: 'haute', coef: 0.10 },
    5: { niveau: 'tres_haute', coef: 0.15 },
    6: { niveau: 'tres_haute', coef: 0.15 },
  },

  // Pondération date demande vs date départ (anticipation en jours). [HYPOTHESE seuils]
  // On prend le 1er palier dont max_jours >= anticipation.
  pondation_date: [
    { max_jours: 6, code: 'DD_PRIORITAIRE', coef: 0.10 },
    { max_jours: 29, code: 'DD_URGENT', coef: 0.05 },
    { max_jours: 89, code: 'DD_NORMAL', coef: -0.05 },
    { max_jours: Infinity, code: 'DD_3MOISETPLUS', coef: -0.10 },
  ],

  // Pondération capacité (nombre de passagers). 1er palier dont max >= nb.
  pondation_capacite: [
    { max: 19, coef: -0.05 },
    { max: 53, coef: 0 },
    { max: 63, coef: 0.15 },
    { max: 67, coef: 0.20 },
    { max: 85, coef: 0.40 },
  ],
  // Au-delà de ces seuils : pas de devis auto -> escalade commercial (flux manuel).
  seuil_escalade_passagers: 85,
  seuil_escalade_km: 300, // trajet > 300 km (aller) = longue distance, étude humaine

  // Options / suppléments.
  options: {
    guide: 80,            // € / jour
    nuit_chauffeur: 120,  // € / nuit
    peages: 0,            // forfait par défaut [HYPOTHESE], à affiner par trajet (P2)
  },

  marge: 0.15, // +15 % marge commerciale appliquée au sous-total HT
  tva: 0.10,   // TVA 10 %
};

module.exports = { MATRICES };
