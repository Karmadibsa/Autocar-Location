// Moteur de devis déterministe (port TypeScript de pricing/calculer_devis.js).
// Source de vérité côté front : recalcule le prix avec la distance OSRM réelle.
// Aucune dépendance ; testé dans calculerDevis.test.ts.

export type Ligne = { libelle: string; montant: number };
export type Coefficient = { libelle: string; valeur: number };
export type Devis = {
  prix_ht: number;
  tva: number;
  prix_ttc: number;
  devise: string;
  lignes: Ligne[];
  coefficients: Coefficient[];
  meta: Record<string, unknown>;
};
export type DevisResult =
  | Devis
  | { erreur: true; message: string; champ: string }
  | { escalade: true; raison: string };

export type ParamsDevis = {
  nb_passagers: number;
  date_depart: string; // YYYY-MM-DD
  date_demande: string; // YYYY-MM-DD
  distance_km: number;
  aller_retour?: boolean;
  options?: (string | { code: string; quantite?: number })[];
};

export const MATRICES = {
  devise: "EUR",
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
    1: { niveau: "basse", coef: -0.07 }, 2: { niveau: "basse", coef: -0.07 },
    8: { niveau: "basse", coef: -0.07 }, 11: { niveau: "basse", coef: -0.07 },
    9: { niveau: "moyenne", coef: 0 }, 10: { niveau: "moyenne", coef: 0 }, 12: { niveau: "moyenne", coef: 0 },
    3: { niveau: "haute", coef: 0.1 }, 4: { niveau: "haute", coef: 0.1 }, 7: { niveau: "haute", coef: 0.1 },
    5: { niveau: "tres_haute", coef: 0.15 }, 6: { niveau: "tres_haute", coef: 0.15 },
  } as Record<number, { niveau: string; coef: number }>,
  pondation_date: [
    { max_jours: 6, code: "DD_PRIORITAIRE", coef: 0.1 },
    { max_jours: 29, code: "DD_URGENT", coef: 0.05 },
    { max_jours: 89, code: "DD_NORMAL", coef: -0.05 },
    { max_jours: Infinity, code: "DD_3MOISETPLUS", coef: -0.1 },
  ],
  pondation_capacite: [
    { max: 19, coef: -0.05 }, { max: 53, coef: 0 }, { max: 63, coef: 0.15 },
    { max: 67, coef: 0.2 }, { max: 85, coef: 0.4 },
  ],
  seuil_escalade_passagers: 85,
  options: { guide: 80, nuit_chauffeur: 120, peages: 0 } as Record<string, number>,
  marge: 0.15,
  tva: 0.1,
};

function round2(x: number) {
  return Math.round(Number((x * 100).toFixed(4))) / 100;
}
function diffJours(a: string, b: string) {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  if (isNaN(da) || isNaN(db)) return NaN;
  return Math.round((db - da) / 86400000);
}
function normOpts(o: ParamsDevis["options"]) {
  if (!Array.isArray(o)) return [] as { code: string; quantite: number }[];
  return o.map((x) =>
    typeof x === "string" ? { code: x, quantite: 1 } : { code: x.code, quantite: x.quantite ?? 1 },
  );
}

export function calculerDevis(params: ParamsDevis, M = MATRICES): DevisResult {
  const { nb_passagers, date_depart, date_demande, distance_km, aller_retour = false, options = [] } = params;
  if (typeof nb_passagers !== "number" || !Number.isFinite(nb_passagers) || nb_passagers <= 0)
    return { erreur: true, message: "Nombre de passagers invalide", champ: "nb_passagers" };
  if (typeof distance_km !== "number" || !Number.isFinite(distance_km) || distance_km <= 0)
    return { erreur: true, message: "Distance invalide", champ: "distance_km" };
  const anticip = diffJours(date_demande, date_depart);
  if (isNaN(anticip)) return { erreur: true, message: "Date invalide", champ: "date_depart" };
  if (anticip < 0) return { erreur: true, message: "Date incohérente", champ: "date_depart" };
  if (nb_passagers > M.seuil_escalade_passagers)
    return { escalade: true, raison: `Volume de ${nb_passagers} passagers > ${M.seuil_escalade_passagers} : transfert à un commercial.` };

  const lignes: Ligne[] = [];
  const coefficients: Coefficient[] = [];
  let base: number;
  if (distance_km <= M.longue_distance.seuil_km) {
    const palier = M.grille_forfait.find((p) => distance_km <= p.max_km)!;
    base = palier.prix;
    lignes.push({ libelle: `Forfait transfert ${distance_km} km`, montant: base });
  } else {
    const ld = M.longue_distance;
    base = distance_km * ld.multiplicateur_distance * ld.prix_km;
    lignes.push({ libelle: `Longue distance ${distance_km} km`, montant: round2(base) });
  }
  if (aller_retour) {
    base *= 2;
    lignes.push({ libelle: "Aller/retour (x2)", montant: round2(base / 2) });
  }

  const mois = new Date(date_depart + "T00:00:00Z").getUTCMonth() + 1;
  const sa = M.saison_par_mois[mois];
  coefficients.push({ libelle: `Saison (${sa.niveau})`, valeur: sa.coef });
  const pd = M.pondation_date.find((x) => anticip <= x.max_jours)!;
  coefficients.push({ libelle: `Anticipation ${anticip} j (${pd.code})`, valeur: pd.coef });
  const pc = M.pondation_capacite.find((x) => nb_passagers <= x.max)!;
  coefficients.push({ libelle: `Capacité ${nb_passagers} pax`, valeur: pc.coef });

  const coef = 1 + sa.coef + pd.coef + pc.coef;
  const transport = base * coef;
  lignes.push({ libelle: `Coefficients (x${round2(coef)})`, montant: round2(transport - base) });

  let opt = 0;
  for (const o of normOpts(options)) {
    if (o.code === "guide") {
      const m = M.options.guide * o.quantite; opt += m;
      lignes.push({ libelle: `Guide (${o.quantite} j)`, montant: m });
    } else if (o.code === "nuit_chauffeur") {
      const m = M.options.nuit_chauffeur * o.quantite; opt += m;
      lignes.push({ libelle: `Nuit chauffeur (${o.quantite})`, montant: m });
    } else if (o.code === "peages") {
      opt += M.options.peages;
      lignes.push({ libelle: "Péages", montant: M.options.peages });
    }
  }

  const sous = transport + opt;
  const prix_ht = round2(sous * (1 + M.marge));
  lignes.push({ libelle: `Marge +${Math.round(M.marge * 100)}%`, montant: round2(prix_ht - sous) });
  const tva = round2(prix_ht * M.tva);
  const prix_ttc = round2(prix_ht + tva);

  return {
    prix_ht, tva, prix_ttc, devise: M.devise, lignes, coefficients,
    meta: { base: round2(base), coef: round2(coef), anticipation_jours: anticip, code_date: pd.code, niveau_saison: sa.niveau },
  };
}
