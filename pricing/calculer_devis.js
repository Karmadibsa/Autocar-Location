// calculer_devis.js — Moteur de tarification DÉTERMINISTE d'Autocar Location
// -----------------------------------------------------------------------------
// RÈGLE D'OR : ce code est la SEULE source de vérité du prix. Le LLM ne calcule
// jamais — il ne fait qu'appeler cette fonction avec des paramètres validés.
// Aucune dépendance externe => copiable tel quel dans un nœud Code n8n.
//
// Pipeline (cf. DOC_TECHNIQUE.md §8 — Le moteur de prix) :
//   1. base_transport  = grille(distance)         si distance <= 180
//                      = distance × 2 × 2,5 €      si distance > 180
//      si aller_retour -> base × 2
//   2. coef_total      = 1 + saison + date + capacité   (combinaison additive)
//   3. transport       = base_transport × coef_total
//   4. options_total   = guide×jours + nuit×nuits + péages
//   5. sous_total      = transport + options_total
//   6. prix_ht         = sous_total × 1,15        (marge)
//   7. tva             = prix_ht × 0,10
//   8. prix_ttc        = prix_ht + tva
// -----------------------------------------------------------------------------

const { MATRICES } = require('./matrices');

function round2(x) {
  // toFixed(4) neutralise les micro-erreurs flottantes (ex: 382.3749999) avant
  // l'arrondi au centime, pour un résultat prévisible et auditable.
  return Math.round(Number((x * 100).toFixed(4))) / 100;
}

// Renvoie le nombre de jours entiers entre deux dates 'YYYY-MM-DD' (b - a).
function diffJours(dateA, dateB) {
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return NaN;
  return Math.round((b - a) / 86400000);
}

function erreur(message, champ) {
  return { erreur: true, message, champ };
}

// Normalise les options : accepte ['guide'] ou [{ code:'guide', quantite:2 }].
function normaliserOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((o) =>
    typeof o === 'string'
      ? { code: o, quantite: 1 }
      : { code: o.code, quantite: o.quantite != null ? o.quantite : 1 }
  );
}

/**
 * @param {object} params
 *   nb_passagers  {number}  requis (>= 1)
 *   date_depart   {string}  'YYYY-MM-DD' requis
 *   date_demande  {string}  'YYYY-MM-DD' requis
 *   distance_km   {number}  requis (> 0)
 *   type_vehicule {string}  optionnel (informatif au MVP)
 *   aller_retour  {boolean} optionnel (défaut false)
 *   options       {Array}   optionnel : ['guide','nuit_chauffeur'] ou [{code,quantite}]
 * @param {object} matrices  paramètres pilotables (défaut MATRICES)
 * @returns devis | { escalade } | { erreur }
 */
function calculer_devis(params, matrices = MATRICES) {
  const {
    nb_passagers,
    date_depart,
    date_demande,
    distance_km,
    aller_retour = false,
    options = [],
  } = params || {};

  // --- Validations (garde-fous : on ne calcule jamais sur des entrées absurdes) ---
  if (typeof nb_passagers !== 'number' || !Number.isFinite(nb_passagers) || nb_passagers <= 0) {
    return erreur('Nombre de passagers invalide (doit être >= 1).', 'nb_passagers');
  }
  if (typeof distance_km !== 'number' || !Number.isFinite(distance_km) || distance_km <= 0) {
    return erreur('Distance invalide (doit être > 0 km).', 'distance_km');
  }
  const anticipation = diffJours(date_demande, date_depart);
  if (isNaN(anticipation)) {
    return erreur('Date de départ ou de demande invalide.', 'date_depart');
  }
  if (anticipation < 0) {
    return erreur('Date incohérente : le départ est antérieur à la demande.', 'date_depart');
  }

  // --- Escalade : au-delà du seuil, flux manuel (pas de devis auto) ---
  if (nb_passagers > matrices.seuil_escalade_passagers) {
    return {
      escalade: true,
      raison: `Volume de ${nb_passagers} passagers > ${matrices.seuil_escalade_passagers} : transfert à un commercial (flux manuel).`,
      params,
    };
  }

  const lignes = [];
  const coefficients = [];

  // --- 1. Base transport ---
  let base_transport;
  if (distance_km <= matrices.longue_distance.seuil_km) {
    const palier = matrices.grille_forfait.find((p) => distance_km <= p.max_km);
    base_transport = palier.prix;
    lignes.push({ libelle: `Forfait transfert ${distance_km} km (grille jusqu'à ${palier.max_km} km)`, montant: base_transport });
  } else {
    const ld = matrices.longue_distance;
    base_transport = distance_km * ld.multiplicateur_distance * ld.prix_km;
    lignes.push({
      libelle: `Longue distance ${distance_km} km × ${ld.multiplicateur_distance} × ${ld.prix_km} €/km`,
      montant: round2(base_transport),
    });
  }
  if (aller_retour) {
    base_transport *= 2;
    lignes.push({ libelle: 'Aller/retour (×2)', montant: round2(base_transport / 2) });
  }

  // --- 2. Coefficients (additifs) ---
  const moisDepart = new Date(date_depart + 'T00:00:00Z').getUTCMonth() + 1;
  const saison = matrices.saison_par_mois[moisDepart];
  coefficients.push({ libelle: `Saisonnalité (${saison.niveau})`, valeur: saison.coef });

  const palierDate = matrices.pondation_date.find((p) => anticipation <= p.max_jours);
  coefficients.push({ libelle: `Anticipation ${anticipation} j (${palierDate.code})`, valeur: palierDate.coef });

  const palierCap = matrices.pondation_capacite.find((p) => nb_passagers <= p.max);
  coefficients.push({ libelle: `Capacité ${nb_passagers} pax`, valeur: palierCap.coef });

  const coef_total = 1 + saison.coef + palierDate.coef + palierCap.coef;

  // --- 3. Transport ajusté ---
  const transport_ajuste = base_transport * coef_total;
  lignes.push({ libelle: `Coefficients appliqués (×${round2(coef_total)})`, montant: round2(transport_ajuste - base_transport) });

  // --- 4. Options ---
  let options_total = 0;
  for (const opt of normaliserOptions(options)) {
    if (opt.code === 'guide') {
      const m = matrices.options.guide * opt.quantite;
      options_total += m;
      lignes.push({ libelle: `Guide / accompagnateur (${opt.quantite} j × ${matrices.options.guide} €)`, montant: m });
    } else if (opt.code === 'nuit_chauffeur') {
      const m = matrices.options.nuit_chauffeur * opt.quantite;
      options_total += m;
      lignes.push({ libelle: `Nuit chauffeur (${opt.quantite} × ${matrices.options.nuit_chauffeur} €)`, montant: m });
    } else if (opt.code === 'peages') {
      const m = matrices.options.peages;
      options_total += m;
      lignes.push({ libelle: 'Péages (forfait)', montant: m });
    }
    // option inconnue -> ignorée silencieusement (l'agent ne doit pas inventer de tarif)
  }

  // --- 5 à 8. Sous-total, marge, TVA, TTC ---
  const sous_total = transport_ajuste + options_total;
  const prix_ht = round2(sous_total * (1 + matrices.marge));
  lignes.push({ libelle: `Marge commerciale (+${Math.round(matrices.marge * 100)} %)`, montant: round2(prix_ht - sous_total) });
  const tva = round2(prix_ht * matrices.tva);
  const prix_ttc = round2(prix_ht + tva);

  return {
    prix_ht,
    tva,
    prix_ttc,
    devise: matrices.devise,
    lignes,
    coefficients,
    meta: {
      base_transport: round2(base_transport),
      coef_total: round2(coef_total),
      aller_retour,
      anticipation_jours: anticipation,
      code_date: palierDate.code,
      niveau_saison: saison.niveau,
    },
  };
}

module.exports = { calculer_devis, round2, diffJours };
