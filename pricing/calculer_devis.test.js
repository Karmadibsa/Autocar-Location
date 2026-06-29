// calculer_devis.test.js — Tests du moteur déterministe (node:test, sans dépendance)
// Lancer :  node --test  (depuis le dossier pricing/ ou la racine)
// Couvre les cas obligatoires du brief : cas simple, urgent, hors zone,
// 0 passager, date incohérente, gros volume, option nuit chauffeur + déterminisme.

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculer_devis } = require('./calculer_devis');

// Base réutilisable : 50 km, 40 pax, départ septembre (moyenne 0%), anticipation 45 j (NORMAL -5%).
const baseSimple = {
  nb_passagers: 40,
  distance_km: 50,
  date_demande: '2026-08-01',
  date_depart: '2026-09-15',
};

test('cas simple complet — valeur exacte et auditable', () => {
  const d = calculer_devis(baseSimple);
  assert.equal(d.erreur, undefined);
  assert.equal(d.meta.base_transport, 350); // grille 50 km
  assert.equal(d.meta.coef_total, 0.95);     // 1 + 0 - 0.05 + 0
  assert.equal(d.prix_ht, 382.38);
  assert.equal(d.tva, 38.24);
  assert.equal(d.prix_ttc, 420.62);
  assert.equal(d.devise, 'EUR');
  assert.ok(d.lignes.length >= 2, 'le devis doit détailler ses lignes');
  assert.ok(d.coefficients.length === 3, 'saison + date + capacité');
});

test('demande urgente (< 7 j) — majoration DD_PRIORITAIRE +10%', () => {
  const d = calculer_devis({ ...baseSimple, date_demande: '2026-07-01', date_depart: '2026-07-05' });
  assert.equal(d.meta.code_date, 'DD_PRIORITAIRE');
  assert.ok(d.coefficients.some((c) => c.valeur === 0.10));
});

test('anticipation 3 mois et plus — réduction DD_3MOISETPLUS -10%', () => {
  const d = calculer_devis({ ...baseSimple, date_demande: '2026-01-01', date_depart: '2026-09-15' });
  assert.equal(d.meta.code_date, 'DD_3MOISETPLUS');
  assert.ok(d.coefficients.some((c) => c.valeur === -0.10));
});

test('hors zone / longue distance (> 180 km) — formule km × 2 × 2,5 €', () => {
  const d = calculer_devis({ ...baseSimple, distance_km: 300 });
  assert.equal(d.meta.base_transport, 1500); // 300 × 2 × 2.5
  assert.equal(d.prix_ht, 1638.75);          // 1500 × 0.95 × 1.15
});

test('très longue distance (> 300 km) — escalade flux manuel', () => {
  const d = calculer_devis({ ...baseSimple, distance_km: 350 });
  assert.equal(d.escalade, true);
  assert.equal(d.prix_ttc, undefined);
});

test('0 passager — erreur de validation (pas de prix)', () => {
  const d = calculer_devis({ ...baseSimple, nb_passagers: 0 });
  assert.equal(d.erreur, true);
  assert.equal(d.champ, 'nb_passagers');
  assert.equal(d.prix_ttc, undefined);
});

test('date incohérente (départ avant la demande) — erreur', () => {
  const d = calculer_devis({ ...baseSimple, date_demande: '2026-09-15', date_depart: '2026-08-01' });
  assert.equal(d.erreur, true);
  assert.equal(d.champ, 'date_depart');
});

test('gros volume (> 85 passagers) — escalade flux manuel', () => {
  const d = calculer_devis({ ...baseSimple, nb_passagers: 90 });
  assert.equal(d.escalade, true);
  assert.match(d.raison, /commercial/);
  assert.equal(d.prix_ttc, undefined);
});

test('option nuit chauffeur — ligne détaillée ajoutée (+240 € pour 2 nuits)', () => {
  const sans = calculer_devis(baseSimple);
  const avec = calculer_devis({ ...baseSimple, options: [{ code: 'nuit_chauffeur', quantite: 2 }] });
  assert.ok(avec.lignes.some((l) => /Nuit chauffeur/.test(l.libelle)));
  assert.ok(avec.prix_ht > sans.prix_ht, 'le prix doit augmenter avec l’option');
});

test('aller/retour — base transport doublée', () => {
  const d = calculer_devis({ ...baseSimple, aller_retour: true });
  assert.equal(d.meta.base_transport, 700); // 350 × 2
  assert.equal(d.prix_ht, 764.75);
});

test('capacité 54-63 passagers — coefficient +15%', () => {
  const d = calculer_devis({ ...baseSimple, nb_passagers: 60 });
  assert.ok(d.coefficients.some((c) => c.valeur === 0.15));
});

test('saison très haute (juin) — coefficient +15%', () => {
  const d = calculer_devis({ ...baseSimple, date_demande: '2026-04-01', date_depart: '2026-06-10' });
  assert.equal(d.meta.niveau_saison, 'tres_haute');
  assert.ok(d.coefficients.some((c) => c.valeur === 0.15));
});

test('paliers de la grille forfait — bornes correctes', () => {
  assert.equal(calculer_devis({ ...baseSimple, distance_km: 30 }).meta.base_transport, 250);
  assert.equal(calculer_devis({ ...baseSimple, distance_km: 31 }).meta.base_transport, 320);
  assert.equal(calculer_devis({ ...baseSimple, distance_km: 180 }).meta.base_transport, 900);
});

test('déterminisme — deux appels identiques donnent le même résultat', () => {
  const a = calculer_devis(baseSimple);
  const b = calculer_devis(baseSimple);
  assert.deepEqual(a, b);
});
