// =============================================================================
// NŒUD CODE n8n — calculer_devis()  (Option A : n8n au cœur)
// =============================================================================
// À coller dans un nœud "Code" n8n, mode "Run Once for Each Item".
// Version AUTO-SUFFISANTE (matrices + fonction inlinées, aucun require) — c'est
// le miroir de calculer_devis.js + matrices.js. Si tu modifies la logique,
// modifie d'abord le module testé, puis reporte ici.
//
// Entrée attendue (item.json) = paramètres déjà extraits/validés par l'agent :
//   { nb_passagers, date_depart, date_demande, distance_km, aller_retour?, options? }
// Sortie = l'objet devis (ou { erreur } / { escalade }).
//
// ⚠️ Le LLM ne calcule jamais : il appelle CE nœud comme outil.
// =============================================================================

const MATRICES = {
  devise: 'EUR',
  grille_forfait: [
    { max_km: 30, prix: 250 }, { max_km: 40, prix: 320 }, { max_km: 50, prix: 350 },
    { max_km: 60, prix: 390 }, { max_km: 70, prix: 430 }, { max_km: 80, prix: 500 },
    { max_km: 90, prix: 540 }, { max_km: 100, prix: 580 }, { max_km: 110, prix: 620 },
    { max_km: 120, prix: 660 }, { max_km: 130, prix: 700 }, { max_km: 140, prix: 740 },
    { max_km: 150, prix: 780 }, { max_km: 160, prix: 820 }, { max_km: 170, prix: 860 },
    { max_km: 180, prix: 900 },
  ],
  longue_distance: { seuil_km: 180, multiplicateur_distance: 2, prix_km: 2.5 },
  saison_par_mois: {
    1: { niveau: 'basse', coef: -0.07 }, 2: { niveau: 'basse', coef: -0.07 },
    8: { niveau: 'basse', coef: -0.07 }, 11: { niveau: 'basse', coef: -0.07 },
    9: { niveau: 'moyenne', coef: 0 }, 10: { niveau: 'moyenne', coef: 0 }, 12: { niveau: 'moyenne', coef: 0 },
    3: { niveau: 'haute', coef: 0.10 }, 4: { niveau: 'haute', coef: 0.10 }, 7: { niveau: 'haute', coef: 0.10 },
    5: { niveau: 'tres_haute', coef: 0.15 }, 6: { niveau: 'tres_haute', coef: 0.15 },
  },
  pondation_date: [
    { max_jours: 6, code: 'DD_PRIORITAIRE', coef: 0.10 },
    { max_jours: 29, code: 'DD_URGENT', coef: 0.05 },
    { max_jours: 89, code: 'DD_NORMAL', coef: -0.05 },
    { max_jours: Infinity, code: 'DD_3MOISETPLUS', coef: -0.10 },
  ],
  pondation_capacite: [
    { max: 19, coef: -0.05 }, { max: 53, coef: 0 }, { max: 63, coef: 0.15 },
    { max: 67, coef: 0.20 }, { max: 85, coef: 0.40 },
  ],
  seuil_escalade_passagers: 85,
  seuil_escalade_km: 300,
  options: { guide: 80, nuit_chauffeur: 120, peages: 0 },
  marge: 0.15,
  tva: 0.10,
};

function round2(x) { return Math.round(Number((x * 100).toFixed(4))) / 100; }
function diffJours(a, b) {
  const da = new Date(a + 'T00:00:00Z'), db = new Date(b + 'T00:00:00Z');
  if (isNaN(da) || isNaN(db)) return NaN;
  return Math.round((db - da) / 86400000);
}
function erreur(message, champ) { return { erreur: true, message, champ }; }
function normaliserOptions(o) {
  if (!Array.isArray(o)) return [];
  return o.map((x) => typeof x === 'string' ? { code: x, quantite: 1 } : { code: x.code, quantite: x.quantite != null ? x.quantite : 1 });
}

function calculer_devis(params, matrices = MATRICES) {
  const { nb_passagers, date_depart, date_demande, distance_km, aller_retour = false, options = [] } = params || {};
  if (typeof nb_passagers !== 'number' || !Number.isFinite(nb_passagers) || nb_passagers <= 0) return erreur('Nombre de passagers invalide (doit être >= 1).', 'nb_passagers');
  if (typeof distance_km !== 'number' || !Number.isFinite(distance_km) || distance_km <= 0) return erreur('Distance invalide (doit être > 0 km).', 'distance_km');
  const anticipation = diffJours(date_demande, date_depart);
  if (isNaN(anticipation)) return erreur('Date de départ ou de demande invalide.', 'date_depart');
  if (anticipation < 0) return erreur('Date incohérente : le départ est antérieur à la demande.', 'date_depart');
  if (nb_passagers > matrices.seuil_escalade_passagers) {
    return { escalade: true, raison: `Volume de ${nb_passagers} passagers > ${matrices.seuil_escalade_passagers} : transfert à un commercial (flux manuel).`, params };
  }
  if (matrices.seuil_escalade_km && distance_km > matrices.seuil_escalade_km) {
    return { escalade: true, raison: `Longue distance ${distance_km} km > ${matrices.seuil_escalade_km} : transfert à un commercial (flux manuel).`, params };
  }

  const lignes = [], coefficients = [];
  let base_transport;
  if (distance_km <= matrices.longue_distance.seuil_km) {
    const p = matrices.grille_forfait.find((x) => distance_km <= x.max_km);
    base_transport = p.prix;
    lignes.push({ libelle: `Forfait transfert ${distance_km} km (grille jusqu'à ${p.max_km} km)`, montant: base_transport });
  } else {
    const ld = matrices.longue_distance;
    base_transport = distance_km * ld.multiplicateur_distance * ld.prix_km;
    lignes.push({ libelle: `Longue distance ${distance_km} km × ${ld.multiplicateur_distance} × ${ld.prix_km} €/km`, montant: round2(base_transport) });
  }
  if (aller_retour) { base_transport *= 2; lignes.push({ libelle: 'Aller/retour (×2)', montant: round2(base_transport / 2) }); }

  const mois = new Date(date_depart + 'T00:00:00Z').getUTCMonth() + 1;
  const saison = matrices.saison_par_mois[mois];
  coefficients.push({ libelle: `Saisonnalité (${saison.niveau})`, valeur: saison.coef });
  const pd = matrices.pondation_date.find((x) => anticipation <= x.max_jours);
  coefficients.push({ libelle: `Anticipation ${anticipation} j (${pd.code})`, valeur: pd.coef });
  const pc = matrices.pondation_capacite.find((x) => nb_passagers <= x.max);
  coefficients.push({ libelle: `Capacité ${nb_passagers} pax`, valeur: pc.coef });

  const coef_total = 1 + saison.coef + pd.coef + pc.coef;
  const transport_ajuste = base_transport * coef_total;
  lignes.push({ libelle: `Coefficients appliqués (×${round2(coef_total)})`, montant: round2(transport_ajuste - base_transport) });

  let options_total = 0;
  for (const opt of normaliserOptions(options)) {
    if (opt.code === 'guide') { const m = matrices.options.guide * opt.quantite; options_total += m; lignes.push({ libelle: `Guide / accompagnateur (${opt.quantite} j × ${matrices.options.guide} €)`, montant: m }); }
    else if (opt.code === 'nuit_chauffeur') { const m = matrices.options.nuit_chauffeur * opt.quantite; options_total += m; lignes.push({ libelle: `Nuit chauffeur (${opt.quantite} × ${matrices.options.nuit_chauffeur} €)`, montant: m }); }
    else if (opt.code === 'peages') { const m = matrices.options.peages; options_total += m; lignes.push({ libelle: 'Péages (forfait)', montant: m }); }
  }

  const sous_total = transport_ajuste + options_total;
  const prix_ht = round2(sous_total * (1 + matrices.marge));
  lignes.push({ libelle: `Marge commerciale (+${Math.round(matrices.marge * 100)} %)`, montant: round2(prix_ht - sous_total) });
  const tva = round2(prix_ht * matrices.tva);
  const prix_ttc = round2(prix_ht + tva);

  return {
    prix_ht, tva, prix_ttc, devise: matrices.devise, lignes, coefficients,
    meta: { base_transport: round2(base_transport), coef_total: round2(coef_total), aller_retour, anticipation_jours: anticipation, code_date: pd.code, niveau_saison: saison.niveau },
  };
}

// --- Glue n8n ---
return { json: calculer_devis($input.item.json) };
