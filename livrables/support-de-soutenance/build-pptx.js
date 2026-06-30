// build-pptx.js — Génère le PowerPoint de soutenance NeoTravel (.pptx)
// Lancer : node build-pptx.js   (depuis ce dossier).
// Dépendance : pptxgenjs (npm install pptxgenjs). Sortie : Support-de-soutenance-NeoTravel.pptx
// Charte alignée sur la présentation de référence : fond blanc + slides sombres #1C1C1E,
// vert de marque autocar-location.com (#8CC63F), logo en haut à gauche, police Calibri.
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const LOGO = path.join(__dirname, '..', 'assets', 'logo-neotravel.png');
const ASSETS = path.join(__dirname, 'assets');
const IMG_ASIS = path.join(ASSETS, 'as-is-to-be.png');         // dossier de cadrage 5.1
const IMG_ARCHI = path.join(ASSETS, 'architecture-cible.png'); // dossier de cadrage 9
const has = (f) => fs.existsSync(f);

// ---- Charte (reprise de la présentation de référence) ----
const C = {
  green: '8CC63F', greenDk: '6FA01E', greenLt: '9DCE3A',
  amber: 'D97706',
  ink: '1C1C1E', body: '2B2B2B', mute: '6B7280',
  border: 'E5E7EB', tint: 'F4F7FA', tintG: 'E7EBDE', white: 'FFFFFF',
  trackL: 'E5E7EB', trackD: '3A3A3E',
};
const FT = 'Calibri';

const p = new pptxgen();
p.defineLayout({ name: 'NT', width: 13.333, height: 7.5 });
p.layout = 'NT';
p.author = 'Équipe NeoTravel';
p.company = 'autocar-location.com — NeoTravel';
p.title = 'Support de soutenance — NeoTravel';

const W = 13.333, H = 7.5, M = 0.62, CW = W - 2 * M;
const LW = 1.0, LH = LW / 1.804; // logo wordmark (866x480)
const sh = () => ({ type: 'outer', color: '000000', blur: 7, offset: 3, angle: 90, opacity: 0.1 });

let IDX = 0;
const TOTAL = 17;

// Logo de marque en haut à gauche (sur pastille blanche si fond sombre).
function logoTL(s, dark) {
  if (dark) s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M - 0.12, y: 0.24, w: LW + 0.26, h: LH + 0.2, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { type: 'none' } });
  if (has(LOGO)) s.addImage({ path: LOGO, x: M, y: 0.34, w: LW, h: LH });
}
// Pied de page + barre de progression. Une fois par slide.
function footer(s, dark = false) {
  IDX++;
  const muteC = dark ? 'A8A8AE' : C.mute;
  s.addText('NeoTravel · Soutenance · 01/07/2026', { x: M, y: H - 0.46, w: 6, h: 0.28, fontSize: 9, color: muteC, align: 'left', margin: 0, fontFace: FT });
  s.addText(`${IDX} / ${TOTAL}`, { x: W - M - 1.2, y: H - 0.46, w: 1.2, h: 0.28, fontSize: 9, color: muteC, align: 'right', margin: 0, fontFace: FT });
  const by = H - 0.16, bh = 0.06;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: by, w: CW, h: bh, rectRadius: 0.03, fill: { color: dark ? C.trackD : C.trackL }, line: { type: 'none' } });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: by, w: Math.max(0.14, CW * IDX / TOTAL), h: bh, rectRadius: 0.03, fill: { color: C.green }, line: { type: 'none' } });
}
// En-tête de slide claire : logo + eyebrow (droite) + titre.
function header(s, eyebrow, title) {
  logoTL(s, false);
  s.addText(String(eyebrow).toUpperCase(), { x: M, y: 0.44, w: CW, h: 0.3, align: 'right', fontSize: 11, color: C.greenDk, bold: true, charSpacing: 2, margin: 0, fontFace: FT });
  s.addText(title, { x: M, y: 0.98, w: CW, h: 0.62, fontSize: 26, color: C.ink, bold: true, margin: 0, fontFace: FT });
}
function card(s, x, y, w, h, fill) {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill || C.white }, line: { color: C.border, width: 1 }, shadow: sh() });
}
function badge(s, x, y, n, d = 0.5, color) {
  s.addShape(p.shapes.OVAL, { x, y, w: d, h: d, fill: { color: color || C.greenDk } });
  s.addText(String(n), { x, y, w: d, h: d, fontSize: d > 0.5 ? 15 : 13, color: 'FFFFFF', bold: true, align: 'center', valign: 'middle', margin: 0, fontFace: FT });
}
function bullets(s, items, x, y, w, h, fs = 12) {
  s.addText(items.map((t) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: true, paraSpaceAfter: 6 } })),
    { x, y, w, h, fontSize: fs, color: C.body, valign: 'top', margin: 0, fontFace: FT, lineSpacingMultiple: 1.03 });
}
function bulletCard(s, x, y, w, h, title, items, { n, fill, fs = 11.5 } = {}) {
  card(s, x, y, w, h, fill);
  let cy = y + 0.24;
  if (n) {
    badge(s, x + 0.26, cy, n, 0.46);
    s.addText(title, { x: x + 0.86, y: cy, w: w - 1.08, h: 0.46, fontSize: 14.5, bold: true, color: C.ink, valign: 'middle', margin: 0, fontFace: FT });
    cy += 0.7;
  } else {
    s.addText(title, { x: x + 0.28, y: cy, w: w - 0.56, h: 0.4, fontSize: 14.5, bold: true, color: C.ink, margin: 0, fontFace: FT });
    cy += 0.56;
  }
  bullets(s, items, x + 0.3, cy, w - 0.6, h - (cy - y) - 0.18, fs);
}
function table(s, rows, { x = M, y = 1.7, w = CW, colW, fontSize = 12 }) {
  const header = rows[0].map((c) => ({ text: c, options: { fill: { color: C.greenDk }, color: 'FFFFFF', bold: true, fontSize: fontSize + 0.5, align: 'left', valign: 'middle', margin: [4, 6, 4, 6], fontFace: FT } }));
  const body = rows.slice(1).map((r, ri) => r.map((c, ci) => ({
    text: c, options: { fill: { color: ri % 2 ? C.tint : 'FFFFFF' }, color: ci === 0 ? C.ink : C.body, bold: ci === 0, fontSize, align: 'left', valign: 'middle', margin: [4, 6, 4, 6], fontFace: FT },
  })));
  s.addTable([header, ...body], { x, y, w, colW, border: { type: 'solid', pt: 0.5, color: C.border }, autoPage: false, valign: 'middle' });
}
function sectionDark(title, sub) {
  const s = p.addSlide();
  s.background = { color: C.ink };
  s.addShape(p.shapes.OVAL, { x: W - 3.2, y: -1.6, w: 4.4, h: 4.4, fill: { color: C.green, transparency: 78 }, line: { type: 'none' } });
  s.addShape(p.shapes.OVAL, { x: -1.4, y: H - 2.6, w: 3.6, h: 3.6, fill: { color: C.greenDk, transparency: 82 }, line: { type: 'none' } });
  logoTL(s, true);
  s.addShape(p.shapes.RECTANGLE, { x: M, y: 2.62, w: 0.5, h: 0.12, fill: { color: C.green }, line: { type: 'none' } });
  s.addText(title, { x: M, y: 2.78, w: CW, h: 1.1, fontSize: 40, color: 'FFFFFF', bold: true, margin: 0, fontFace: FT });
  if (sub) s.addText(sub, { x: M, y: 4.0, w: CW, h: 0.6, fontSize: 17, color: 'C9CDD2', margin: 0, fontFace: FT });
  return s;
}

// ==========================================================================
// SLIDE 1 — Titre (sombre)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: C.ink };
  s.addShape(p.shapes.OVAL, { x: W - 3.6, y: -1.8, w: 5, h: 5, fill: { color: C.green, transparency: 76 }, line: { type: 'none' } });
  s.addShape(p.shapes.OVAL, { x: -1.6, y: H - 2.8, w: 4, h: 4, fill: { color: C.greenDk, transparency: 82 }, line: { type: 'none' } });
  logoTL(s, true);
  s.addText('SOUTENANCE · ATELIER AUTOMATISATION IA', { x: 0, y: 2.5, w: W, h: 0.4, fontSize: 14, color: C.green, bold: true, align: 'center', charSpacing: 3, margin: 0, fontFace: FT });
  s.addText([
    { text: 'NEO', options: { color: 'FFFFFF' } },
    { text: 'TRAVEL', options: { color: C.green } },
  ], { x: 0, y: 2.95, w: W, h: 1.0, fontSize: 52, bold: true, align: 'center', margin: 0, fontFace: FT });
  s.addText('Automatiser le cycle commercial sans déshumaniser la relation client', { x: 0, y: 4.05, w: W, h: 0.5, fontSize: 18, color: 'C9CDD2', align: 'center', margin: 0, fontFace: FT });
  s.addText('ÉQUIPE PROJET', { x: 0, y: 5.15, w: W, h: 0.3, fontSize: 11, color: C.green, bold: true, align: 'center', charSpacing: 2, margin: 0, fontFace: FT });
  s.addText('Axel MOMPER   ·   Vincent CONTER   ·   Zakaria TOUAMI', { x: 0, y: 5.45, w: W, h: 0.4, fontSize: 15, color: 'FFFFFF', align: 'center', margin: 0, fontFace: FT });
  s.addText('Présentation 20 min  ·  Démonstration live  ·  Questions & réponses', { x: 0, y: 6.0, w: W, h: 0.4, fontSize: 12.5, color: '9A9AA0', align: 'center', margin: 0, fontFace: FT });
  footer(s, true);
  s.addNotes('Orateur : Axel — 30 s. Se présenter et annoncer le plan : objectifs du client → contexte → As-Is/To-Be → solution → architecture → choix techniques → prévu vs réalisé → démo live → ouverture et passation → questions. Annoncer la règle d’or dès l’ouverture.');
}

// ==========================================================================
// SLIDE 2 — Objectifs & attentes initiales
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Le cadre posé avant de coder', 'Objectifs & attentes initiales du client');
  const y = 1.85, h = 4.7, w = (CW - 0.5) / 3;
  bulletCard(s, M, y, w, h, 'Le périmètre — 10 fonctions', [
    'Capter le lead (chat / formulaire)', 'Centraliser dans un CRM', 'Qualifier la demande',
    'Détecter les infos manquantes', 'Calculer un devis (déterministe)', 'Générer la proposition (PDF)',
    'Envoyer le devis au client', 'Relancer automatiquement', 'Suivre le pipeline commercial', 'Piloter via un dashboard',
  ], { n: 1, fs: 11 });
  bulletCard(s, M + w + 0.25, y, w, h, 'Les irritants à résoudre', [
    'Leads payants jamais recontactés (manque à gagner)', 'Délais de réponse et devis trop lents',
    'Relances manuelles oubliées', 'Tarification manuelle, lente et faillible', 'Direction sans visibilité sur l’activité',
  ], { n: 2 });
  bulletCard(s, M + 2 * (w + 0.25), y, w, h, 'Les KPIs visés', [
    'Part des leads traités → ~100 %', 'Délai demande → devis : en minutes', 'Aucune relance oubliée',
    'Visibilité des demandes urgentes', 'Coût IA par devis maîtrisé (bonus)',
  ], { n: 3 });
  footer(s);
  s.addNotes('Orateur : Axel — 1,5 min. Poser le cadre : voici ce que le client attendait AVANT qu’on écrive la première ligne (périmètre, irritants, KPIs du dossier de cadrage L1). On y reviendra pour prouver qu’on répond au besoin.');
}

// ==========================================================================
// SLIDE 3 — Contexte & problème
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Contexte NeoTravel', 'Le problème : l’exploitation, pas l’acquisition');
  card(s, M, 1.9, 4.0, 4.5, C.tintG);
  s.addText('~60', { x: M, y: 2.25, w: 4.0, h: 1.3, fontSize: 66, color: C.greenDk, bold: true, align: 'center', margin: 0, fontFace: FT });
  s.addText('leads / jour', { x: M, y: 3.5, w: 4.0, h: 0.5, fontSize: 18, color: C.ink, bold: true, align: 'center', margin: 0, fontFace: FT });
  s.addText('L’acquisition n’est pas le problème — le flux existant est sous-exploité, faute de capacité de traitement.',
    { x: M + 0.35, y: 4.2, w: 3.3, h: 1.9, fontSize: 12.5, color: C.body, align: 'center', valign: 'top', margin: 0, fontFace: FT });
  const x2 = M + 4.3, w2 = CW - 4.3;
  bulletCard(s, x2, 1.9, w2, 2.15, 'Friction 1 — des leads perdus', [
    'Commerciaux commissionnés → priorité aux gros leads.',
    'Des leads payants (Ads) ne sont jamais recontactés = manque à gagner direct.',
  ], { fs: 12.5 });
  bulletCard(s, x2, 4.25, w2, 2.15, 'Friction 2 — acquisition bridée', [
    'Sans automatisation, plus de leads = plus de charge, pas plus de CA.',
    'S’ajoutent : tarif manuel lent, relances oubliées, direction sans visibilité.',
  ], { fs: 12.5 });
  footer(s);
  s.addNotes('Orateur : Axel — 1,5 min. Insister : on veut mieux exploiter le flux existant et libérer les commerciaux pour les tâches à forte valeur (conseil, négociation).');
}

// ==========================================================================
// SLIDE 4 — Cartographie As-Is / To-Be (graphique du dossier de cadrage 5.1)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Du manuel à l’automatisé', 'Cartographie As-Is / To-Be');
  if (has(IMG_ASIS)) {
    const ih = 4.95, iw = ih * (1070 / 1094); // ratio ~0.978
    s.addImage({ path: IMG_ASIS, x: M, y: 1.75, w: iw, h: ih });
    const tx = M + iw + 0.5, tw = W - tx - M;
    s.addText('Lecture du schéma', { x: tx, y: 2.0, w: tw, h: 0.4, fontSize: 15, bold: true, color: C.ink, margin: 0, fontFace: FT });
    bullets(s, [
      'À gauche, le processus actuel — manuel, lent et faillible (en rouge).',
      'À droite, le processus cible — automatisé ET supervisé (en vert).',
      'À chaque étape sensible, un humain garde la main (HITL).',
      'Le calcul du prix passe par le tool déterministe, jamais par le LLM.',
    ], tx, 2.5, tw, 3.2, 13);
    s.addText('Source : dossier de cadrage, partie 5.1.', { x: tx, y: 6.0, w: tw, h: 0.3, fontSize: 10.5, italic: true, color: C.mute, margin: 0, fontFace: FT });
  }
  footer(s);
  s.addNotes('Orateur : Axel — 1,5 min. Montrer que chaque étape manuelle (rouge) a sa contrepartie automatisée et supervisée (vert). C’est la promesse : automatiser sans déshumaniser. Graphique repris du dossier de cadrage (5.1).');
}

// ==========================================================================
// SLIDE 5 — Solution & règle d'or
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Notre réponse', 'La solution : un copilote, et une règle d’or');
  const steps = ['Captation\n(chat)', 'Qualification\n(agent IA)', 'Devis\ndéterministe', 'Email + PDF\n+ relances', 'Dashboard\nde pilotage'];
  const n = steps.length, gap = 0.35, w = (CW - (n - 1) * gap) / n, y = 2.0, h = 1.7;
  steps.forEach((t, i) => {
    const x = M + i * (w + gap);
    card(s, x, y, w, h, C.tintG);
    badge(s, x + w / 2 - 0.25, y + 0.22, i + 1, 0.5);
    s.addText(t, { x: x + 0.1, y: y + 0.82, w: w - 0.2, h: 0.8, fontSize: 12.5, bold: true, color: C.ink, align: 'center', valign: 'top', margin: 0, fontFace: FT });
    if (i < n - 1) s.addText('▶', { x: x + w + 0.02, y: y + h / 2 - 0.2, w: gap - 0.04, h: 0.4, fontSize: 12, color: C.green, align: 'center', valign: 'middle', margin: 0 });
  });
  card(s, M, 4.25, CW, 1.9, C.ink);
  s.addText('★  La règle d’or', { x: M + 0.4, y: 4.5, w: CW - 0.8, h: 0.5, fontSize: 18, bold: true, color: C.green, margin: 0, fontFace: FT });
  s.addText('L’IA comprend et oriente, mais le prix vient TOUJOURS du code déterministe — jamais du modèle de langage. Reproductible, auditable, zéro hallucination tarifaire. L’humain garde la main sur les cas sensibles.',
    { x: M + 0.4, y: 5.0, w: CW - 0.8, h: 1.0, fontSize: 14, color: 'FFFFFF', valign: 'top', margin: 0, fontFace: FT, lineSpacingMultiple: 1.1 });
  footer(s);
  s.addNotes('Orateur : Axel — 1,5 min. La règle d’or est le fil rouge de toute la soutenance. La solution automatise toute la chaîne sans déshumaniser : l’agent prépare, l’humain décide et engage. Le prix est calculé par le tool calculer_devis(), pas par le LLM.');
}

// ==========================================================================
// SLIDE 6 — Architecture cible (schéma du dossier de cadrage 9)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Vue d’ensemble', 'Architecture cible');
  if (has(IMG_ARCHI)) {
    const ih = 5.05, iw = ih * (1238 / 1665); // ratio ~0.744
    s.addImage({ path: IMG_ARCHI, x: M, y: 1.7, w: iw, h: ih });
    const tx = M + iw + 0.55, tw = W - tx - M;
    s.addText('À retenir', { x: tx, y: 2.0, w: tw, h: 0.4, fontSize: 15, bold: true, color: C.ink, margin: 0, fontFace: FT });
    bullets(s, [
      'Le front Next.js orchestre tout : interface + routes /api (logique métier).',
      'Un seul appel LLM, réalisé avec Gemma 4, pour l’extraction des paramètres.',
      'Le prix vient de calculer_devis() — déterministe, jamais le LLM.',
      'Supabase : PostgreSQL + Authentification + sécurité par ligne. Relances via Resend.',
    ], tx, 2.5, tw, 3.3, 13);
    s.addText('Schéma repris du dossier de cadrage, partie 9.', { x: tx, y: 6.05, w: tw, h: 0.3, fontSize: 10.5, italic: true, color: C.mute, margin: 0, fontFace: FT });
  }
  footer(s);
  s.addNotes('Orateur : Axel — 1 min. Schéma réel du dossier de cadrage (partie 9). Le front est le centre. Un seul appel LLM, réalisé avec Gemma 4 (le cadrage prévoyait gpt-4o-mini), le reste est déterministe.');
}

// ==========================================================================
// SLIDE 7 — Choix techniques (cartes)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Défense des choix', 'Choix techniques : pas seulement quoi, mais pourquoi');
  const decisions = [
    ['Orchestration', 'n8n', 'Mise en place visuelle et rapide, relances intégrées, courbe d’apprentissage douce.'],
    ['Modèle IA', 'Gemma 4', 'Gratuit (quota AI Studio), sorties JSON structurées fiables, latence basse, rôle d’assistance seul.'],
    ['Données & Authentification', 'Supabase', 'Base, Authentification et sécurité par ligne dans une seule stack, dashboard sur-mesure sans surcoût.'],
    ['Appels LLM', 'Un seul (extraction)', 'Tient dans le timeout 30 s, moins d’erreurs 503, aucune fuite de raisonnement vers le client.'],
  ];
  const y0 = 1.8, gap = 0.3, w = (CW - gap) / 2, h = 1.55;
  decisions.forEach(([label, choix, why], i) => {
    const x = M + (i % 2) * (w + gap), yy = y0 + Math.floor(i / 2) * (h + gap);
    card(s, x, yy, w, h, i % 2 ? C.tint : C.tintG);
    s.addShape(p.shapes.OVAL, { x: x + 0.28, y: yy + 0.28, w: 0.14, h: 0.14, fill: { color: C.green }, line: { type: 'none' } });
    s.addText(label.toUpperCase(), { x: x + 0.52, y: yy + 0.18, w: w - 0.8, h: 0.32, fontSize: 11, bold: true, color: C.greenDk, charSpacing: 1, margin: 0, fontFace: FT });
    s.addText(choix, { x: x + 0.52, y: yy + 0.46, w: w - 0.8, h: 0.4, fontSize: 17, bold: true, color: C.ink, margin: 0, fontFace: FT });
    s.addText(why, { x: x + 0.32, y: yy + 0.9, w: w - 0.64, h: h - 0.98, fontSize: 11.5, color: C.body, valign: 'top', margin: 0, fontFace: FT, lineSpacingMultiple: 1.02 });
  });
  const ly = y0 + 2 * (h + gap);
  card(s, M, ly, CW, 0.92, C.ink);
  s.addText([
    { text: 'Limite observée — ', options: { bold: true, color: C.amber } },
    { text: '503 ponctuels du LLM. Mitigée par des retries, et le prix comme la réponse ne dépendent pas du LLM : le devis sort quand même.', options: { color: 'FFFFFF' } },
  ], { x: M + 0.4, y: ly, w: CW - 0.8, h: 0.92, fontSize: 13, valign: 'middle', margin: 0, fontFace: FT });
  footer(s);
  s.addNotes('Orateur : Vincent — 2 min. Défendre chaque décision par ses critères (coût, qualité, latence, sorties structurées, compatibilité stack) et assumer la limite observée. Renvoyer à l’Argumentaire des choix (L1).');
}

// ==========================================================================
// SLIDE 8 — Fiabilité & garde-fous
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Un système sûr, juste et auditable', 'Fiabilité & garde-fous');
  const y = 1.85, gy = 0.3, w = (CW - 0.4) / 2, h = (4.9 - gy) / 2;
  bulletCard(s, M, y, w, h, 'Prix déterministe', ['calculer_devis() testé, jamais le LLM.', '1ᵉʳ prix figé (distance estimée).'], { fs: 12.5 });
  bulletCard(s, M + w + 0.4, y, w, h, 'Tests : types ET limites', ['0 passager, date incohérente, gros volume…', 'Au-delà de 85 passagers → escalade, pas de prix.'], { fs: 12.5 });
  bulletCard(s, M, y + h + gy, w, h, 'RGPD', ['Minimisation, données fictives ou minimales.', 'Domaine de démo = aucun envoi réel.'], { fs: 12.5 });
  bulletCard(s, M + w + 0.4, y + h + gy, w, h, 'Prompt injection & HITL', ['Le code ne négocie jamais le prix.', 'Tout cas hors cadre escaladé à un humain.'], { fs: 12.5 });
  footer(s);
  s.addNotes('Orateur : Vincent — 1 min. Montrer rapidement npm test qui passe et /docs (Swagger) : toute l’API est documentée et explorable.');
}

// ==========================================================================
// SLIDE 9 — Prévu vs réalisé (schéma à flèches)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Transparence', 'Prévu (L1) → réalisé (L2/L3)');
  const rows = [
    ['Modèle gpt-4o-mini', 'Gemma 4 (gratuit)', 'Quota AI Studio, sorties JSON suffisantes.'],
    ['Distance estimée plus tard (P2)', 'Distance estimée dès le MVP', 'Service gratuit sans clé, devis juste tout de suite.'],
    ['n8n hébergé (cloud)', 'Tunnel local à URL fixe (0 €)', 'MVP gratuit suffisant, voie de prod documentée.'],
    ['Espace client = bonus', 'Livré (devis, conversations, messagerie)', 'Forte valeur client, simple dans Supabase.'],
    ['Dashboard simple', 'Dashboard riche (courbe, camembert, export)', 'Supabase facilitait un vrai pilotage.'],
  ];
  const y0 = 1.85, rh = 0.88, gap = 0.08;
  rows.forEach(([prevu, real, why], i) => {
    const yy = y0 + i * (rh + gap);
    card(s, M, yy, CW, rh, i % 2 ? C.tint : C.white);
    s.addText(prevu, { x: M + 0.3, y: yy, w: 3.0, h: rh, fontSize: 11.5, color: C.mute, valign: 'middle', margin: 0, fontFace: FT });
    s.addText('→', { x: M + 3.35, y: yy, w: 0.5, h: rh, fontSize: 18, bold: true, color: C.green, align: 'center', valign: 'middle', margin: 0 });
    s.addText(real, { x: M + 3.95, y: yy, w: 3.25, h: rh, fontSize: 12, bold: true, color: C.greenDk, valign: 'middle', margin: 0, fontFace: FT });
    s.addText(why, { x: M + 7.35, y: yy, w: CW - 7.6, h: rh, fontSize: 11, italic: true, color: C.body, valign: 'middle', margin: 0, fontFace: FT });
  });
  footer(s);
  s.addNotes('Orateur : Vincent — 1,5 min. Assumer les écarts comme des décisions, pas des oublis. On a tenu le cap (chaîne complète) et certains arbitrages ont amélioré le résultat.');
}

// ==========================================================================
// SLIDE 10 — Attentes client → réponses (schéma à flèches)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'On répond au besoin', 'Attentes du client → réponses livrées');
  const rows = [
    ['Capter et centraliser chaque lead', 'Chat + création automatique de la fiche en base.'],
    ['Qualifier et détecter les manquants', 'Agent n8n, extraction des paramètres + questions ciblées.'],
    ['Un devis juste, en quelques secondes', 'calculer_devis() déterministe + distance estimée, figé.'],
    ['Une proposition professionnelle', 'PDF généré + email avec boutons Accepter / Refuser.'],
    ['Ne plus oublier les relances', 'Séquences automatiques J+2 / J+3 / J+7 (max 2) + relance manuelle.'],
    ['Donner de la visibilité à la direction', 'Dashboard admin : KPIs, courbe, camembert, export PDF.'],
    ['Garder l’humain sur les cas sensibles', 'Escalade au-delà de 85 passagers + messagerie client ↔ conseiller.'],
  ];
  const y0 = 1.8, rh = 0.64, gap = 0.06;
  rows.forEach(([att, rep], i) => {
    const yy = y0 + i * (rh + gap);
    card(s, M, yy, CW, rh, i % 2 ? C.tint : C.white);
    s.addText(att, { x: M + 0.3, y: yy, w: 4.2, h: rh, fontSize: 11.5, bold: true, color: C.ink, valign: 'middle', margin: 0, fontFace: FT });
    s.addText('→', { x: M + 4.55, y: yy, w: 0.45, h: rh, fontSize: 16, bold: true, color: C.green, align: 'center', valign: 'middle', margin: 0 });
    s.addText(rep, { x: M + 5.1, y: yy, w: CW - 5.35, h: rh, fontSize: 11.5, color: C.body, valign: 'middle', margin: 0, fontFace: FT });
  });
  footer(s);
  s.addNotes('Orateur : Axel — 1,5 min. Boucler avec la slide Objectifs : chaque attente initiale a sa réponse concrète. C’est la preuve qu’on a traité le besoin du client, pas seulement construit une démo.');
}

// ==========================================================================
// SLIDE 11 — Section : Ce qui fonctionne (sombre)
// ==========================================================================
{
  const s = sectionDark('Ce qui fonctionne', 'Démonstration live — le parcours complet, en conditions réelles.');
  s.addText('Parcours prospect  ·  cas complexe (HITL)  ·  espace client  ·  dashboard admin',
    { x: M, y: 4.8, w: CW, h: 0.5, fontSize: 14, color: C.green, bold: true, margin: 0, fontFace: FT });
  footer(s, true);
  s.addNotes('Orateur : Zakaria. Transition vers la démo live. Pré-requis : lancer lancer-n8n-tunnel.bat + reset-complet.sql. Filet de sécurité : un jeu de démo est déjà en base si le chat live échoue.');
}

// ==========================================================================
// SLIDES 12-13 — Démo (2 sous-démos par slide)
// ==========================================================================
function demoDuo(eyebrow, title, left, right, note) {
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, eyebrow, title);
  const y = 1.85, h = 4.8, w = (CW - 0.4) / 2;
  [[M, left], [M + w + 0.4, right]].forEach(([x, col]) => {
    card(s, x, y, w, h, C.white);
    s.addText(col.title, { x: x + 0.3, y: y + 0.24, w: w - 0.6, h: 0.45, fontSize: 16, bold: true, color: C.ink, margin: 0, fontFace: FT });
    let by = y + 0.78;
    if (col.scenario) {
      card(s, x + 0.3, by, w - 0.6, 0.85, C.tintG);
      s.addText([{ text: '💬  ', options: {} }, { text: col.scenario, options: { italic: true, bold: true, color: C.greenDk } }],
        { x: x + 0.45, y: by, w: w - 0.9, h: 0.85, fontSize: 12.5, valign: 'middle', margin: 0, fontFace: FT });
      by += 1.05;
    }
    bullets(s, col.items, x + 0.32, by, w - 0.64, y + h - by - 0.2, 12.5);
  });
  footer(s);
  s.addNotes(note);
}
demoDuo('Démo — le cœur', 'Parcours prospect & cas complexe',
  { title: 'Parcours prospect → devis', scenario: 'Lyon → Annecy, 50 personnes, aller-retour le 12 juillet 2026',
    items: ['La barre « Votre demande » se remplit en direct, l’agent demande l’email.',
      'Carte devis affichée + email reçu (PDF joint + boutons Accepter / Refuser).',
      'Le prix vient du moteur, pas de l’IA, et la distance est estimée automatiquement.'] },
  { title: 'Cas complexe → escalade (HITL)', scenario: 'Marseille → Lille, 120 personnes',
    items: ['Au-delà de 85 passagers → message d’escalade, aucun devis automatique.',
      'La demande devient un « cas complexe » transmis à un humain avec le contexte.',
      'Dire « non » à l’automatisation totale est un gage de fiabilité, pas une limite.'] },
  'Orateur : Zakaria — 3 min. Si Gemma renvoie un 503 ponctuel, renvoyer le message. Filet : devis de démo déjà en base.');

demoDuo('Démo — client & pilotage', 'Espace client & dashboard admin',
  { title: 'Côté client', scenario: null,
    items: ['Bouton « Accepter » d’un email sans compte → inscription pré-remplie.',
      'Espace client : Mes devis (PDF, accepter / refuser avec motifs), Mes conversations, Mon compte.',
      '« Refuser » depuis l’email → page de motifs → relances stoppées.'] },
  { title: 'Dashboard admin', scenario: null,
    items: ['KPIs, courbe d’évolution, camembert des refus, filtre par dates, export PDF.',
      'Cas complexe → devis sur-mesure (prix HT → TVA / TTC → envoi) → rejoint le pipeline.',
      'Messagerie HITL bidirectionnelle, bouton « Lancer les relances dues ».'] },
  'Orateur : Zakaria — 3,5 min. Différenciateur (bonus livré) : le prospect suit ses devis et son historique. Le dashboard prouve le pilotage par la donnée.');

// ==========================================================================
// SLIDE 14 — Limites, MVP vs prod & coûts
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Limites assumées', 'Ce qu’on assume — et le passage en production');
  bulletCard(s, M, 1.9, 5.5, 4.45, 'Limites & arbitrages', [
    'n8n en tunnel local = choix MVP (0 €) : dépend du PC allumé.',
    'Prototype cohérent de bout en bout, pas une app de production (cas limites non exhaustifs).',
    'Péages forfaitaires au MVP, paramétrables et affinés en P2.',
  ], { fs: 12.5 });
  const cx = M + 5.8, cw = CW - 5.8;
  s.addText('MVP vs production — coût mensuel', { x: cx, y: 1.9, w: cw, h: 0.4, fontSize: 14.5, bold: true, color: C.ink, margin: 0, fontFace: FT });
  const costs = [['~0 €', 'MVP / soutenance (tunnel local)'], ['~0-1 €', 'Prod « éco » 24/7 (n8n Oracle Free)'], ['~30 €', 'Prod « sereine » — recommandée']];
  const ch = 1.12, cgap = 0.18; let cy = 2.45;
  costs.forEach(([v, d], i) => {
    card(s, cx, cy, cw, ch, i === 2 ? C.tintG : C.tint);
    s.addText(v, { x: cx + 0.2, y: cy, w: 2.1, h: ch, fontSize: 26, bold: true, color: i === 2 ? C.greenDk : C.green, align: 'center', valign: 'middle', margin: 0, fontFace: FT });
    s.addText(d, { x: cx + 2.4, y: cy, w: cw - 2.6, h: ch, fontSize: 12.5, color: C.body, valign: 'middle', margin: 0, fontFace: FT });
    cy += ch + cgap;
  });
  footer(s);
  s.addNotes('Orateur : Vincent — 1,5 min. Assumer franchement : la cohérence du parcours prime sur la perfection d’un maillon. Le seul élément à changer pour la prod : héberger n8n. 4 scénarios chiffrés dans COUTS_ET_PROD.md.');
}

// ==========================================================================
// SLIDE 15 — Ouverture V2 & passation
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Et après', 'Ouverture vers une V2 & passation livrée');
  const w = (CW - 0.5) / 2, y = 1.9, h = 4.45;
  card(s, M, y, w, h, C.white);
  s.addText('Ouverture — vers une version 2', { x: M + 0.3, y: y + 0.25, w: w - 0.6, h: 0.45, fontSize: 15, bold: true, color: C.ink, margin: 0, fontFace: FT });
  bullets(s, [
    'P1 — héberger n8n 24/7 (chat indépendant du PC) + Supabase Pro (base toujours active).',
    'P2 — distance & péages enrichis par trajet, observabilité coût/tokens par devis, notifications internes (urgent, cas complexe).',
    'P3 — canal WhatsApp officiel, A/B testing des relances, rôles fins (commercial / manager).',
  ], M + 0.32, y + 0.8, w - 0.64, h - 1.0, 12);
  card(s, M + w + 0.5, y, w, h, C.tintG);
  s.addText('Passation déjà livrée (L3)', { x: M + w + 0.8, y: y + 0.25, w: w - 0.6, h: 0.45, fontSize: 15, bold: true, color: C.ink, margin: 0, fontFace: FT });
  bullets(s, [
    'Procédure repreneur : relancer le projet en local en 5 min.',
    'Procédure équipe NeoTravel : termes clés en clair + usage quotidien.',
    'Maintenance documentée : modifier pricing, emails, statuts, relances.',
    'Backlog P1/P2/P3 + README, API Swagger (/docs), TypeDoc.',
  ], M + w + 0.82, y + 0.8, w - 0.64, h - 1.5, 12);
  s.addText('→ La solution peut vivre et évoluer sans ses créateurs.', { x: M + w + 0.82, y: y + h - 0.6, w: w - 1.0, h: 0.5, fontSize: 12.5, italic: true, bold: true, color: C.greenDk, margin: 0, fontFace: FT });
  footer(s);
  s.addNotes('Orateur : Vincent — 1,5 min. Deux messages : (1) le projet a une suite claire (backlog priorisé), (2) il est déjà reprenable grâce à la doc de passation L3. Répond au critère « rendre la solution reprenable ».');
}

// ==========================================================================
// SLIDE 16 — Clôture (sombre)
// ==========================================================================
{
  const s = sectionDark('Ce qu’on a prouvé', null);
  const items = ['Compris le métier et le besoin du client', 'Construit un flux complet de bout en bout', 'Sécurisé le pricing (déterministe, auditable)', 'Rendu la solution reprenable (passation)'];
  const w = (CW - 0.5) / 2, y = 4.1, h = 1.0;
  items.forEach((t, i) => {
    const x = M + (i % 2) * (w + 0.5), yy = y + Math.floor(i / 2) * (h + 0.25);
    s.addShape(p.shapes.OVAL, { x, y: yy + 0.25, w: 0.42, h: 0.42, fill: { color: C.green } });
    s.addText('✓', { x, y: yy + 0.25, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: C.ink, align: 'center', valign: 'middle', margin: 0 });
    s.addText(t, { x: x + 0.6, y: yy, w: w - 0.7, h: h, fontSize: 14, color: 'FFFFFF', valign: 'middle', margin: 0, fontFace: FT });
  });
  s.addText('Merci — nous sommes à vous pour vos questions.', { x: M, y: 6.45, w: CW, h: 0.5, fontSize: 16, bold: true, color: C.green, margin: 0, fontFace: FT });
  footer(s, true);
  s.addNotes('Orateur : toute l’équipe — puis 10-15 min de Q&R. Chaque membre reste disponible sur son périmètre (voir l’annexe : questions probables et réponses prêtes).');
}

// ==========================================================================
// SLIDE 17 — Annexe Q&R
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  header(s, 'Annexe', 'Questions probables & réponses prêtes');
  table(s, [
    ['Question du jury', 'Réponse'],
    ['Pourquoi pas le LLM pour le prix ?', 'Reproductibilité, auditabilité, zéro hallucination tarifaire. Le LLM ne fait qu’extraire.'],
    ['C’est vraiment en ligne ?', 'Oui : front + base + emails 24/7. Seul l’agent (chat) dépend du tunnel — assumé et documenté.'],
    ['Et si Gemma sature (503) ?', 'Retries automatiques. Le moteur de prix et la réponse ne dépendent pas du LLM.'],
    ['Combien ça coûterait en vrai ?', '4 scénarios chiffrés : ~0 € en éco, ~30 €/mois en prod sereine (COUTS_ET_PROD.md).'],
    ['Comment un autre dev reprend le projet ?', 'Doc de passation (L3) : 5 min pour relancer en local, Swagger / TypeDoc pour le détail.'],
    ['Comment changer un tarif ?', 'pricing/matrices.js (+ pricing_config), relancer npm test, reporter dans n8n. Jamais via le LLM.'],
    ['Et la RGPD ?', 'Minimisation, données fictives ou minimales, domaine de démo sans envoi réel, accès cloisonné par utilisateur.'],
  ], { y: 1.85, colW: [4.4, CW - 4.4], fontSize: 11 });
  footer(s);
  s.addNotes('Annexe de secours pour le Q&R : une réponse courte et défendable par question fréquente.');
}

// ==========================================================================
const out = path.join(__dirname, process.argv[2] || 'Support-de-soutenance-NeoTravel.pptx');
p.writeFile({ fileName: out }).then(() => console.log('OK ->', out));
