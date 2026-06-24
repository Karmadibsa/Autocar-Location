// demo.js — Affiche un devis exemple lisible. Lancer : node demo.js
const { calculer_devis } = require('./calculer_devis');

const exemples = [
  { titre: 'Demande simple complète', p: { nb_passagers: 40, distance_km: 50, date_demande: '2026-08-01', date_depart: '2026-09-15' } },
  { titre: 'Aller/retour, grand groupe, haute saison, urgent', p: { nb_passagers: 60, distance_km: 120, date_demande: '2026-03-28', date_depart: '2026-04-02', aller_retour: true, options: [{ code: 'nuit_chauffeur', quantite: 1 }, { code: 'guide', quantite: 2 }] } },
  { titre: 'Hors zone (300 km)', p: { nb_passagers: 30, distance_km: 300, date_demande: '2026-01-10', date_depart: '2026-09-01' } },
  { titre: 'Cas limite : 95 passagers (escalade)', p: { nb_passagers: 95, distance_km: 80, date_demande: '2026-05-01', date_depart: '2026-06-01' } },
];

for (const { titre, p } of exemples) {
  const d = calculer_devis(p);
  console.log('\n=== ' + titre + ' ===');
  if (d.erreur) { console.log('  ERREUR:', d.message); continue; }
  if (d.escalade) { console.log('  ESCALADE:', d.raison); continue; }
  d.lignes.forEach((l) => console.log('  ' + l.libelle.padEnd(52) + (l.montant >= 0 ? ' ' : '') + l.montant.toFixed(2) + ' €'));
  console.log('  ' + '-'.repeat(60));
  console.log('  Prix HT  : ' + d.prix_ht.toFixed(2) + ' €');
  console.log('  TVA 10%  : ' + d.tva.toFixed(2) + ' €');
  console.log('  Prix TTC : ' + d.prix_ttc.toFixed(2) + ' € ' + d.devise);
}
