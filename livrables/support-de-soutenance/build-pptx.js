// build-pptx.js — Génère le PowerPoint de soutenance NeoTravel (.pptx)
// Lancer : node build-pptx.js   (depuis ce dossier).
// Dépendance : pptxgenjs (npm install pptxgenjs). Sortie : Support-de-soutenance-NeoTravel.pptx
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const LOGO = path.join(__dirname, '..', 'assets', 'logo-neotravel.png');
const ARCH = path.join(__dirname, '..', '..', 'docs', 'architecture.svg');
const hasLogo = fs.existsSync(LOGO);
const hasArch = fs.existsSync(ARCH);

// ---- Charte NeoTravel (teal dominant + mint, accent or pour la touche « classe ») ----
const C = {
  teal: '0E7A66', tealDk: '0A5346', mint: '13A884',
  gold: 'C49A3C', goldDk: 'A9842E',
  tint: 'EAF4F0', tint2: 'D9F0EA', white: 'FFFFFF',
  ink: '1F2937', mute: '6B7280', line: 'CBD5E1', soft: 'F4F8F6',
  trackD: '155C4B',
};
const SERIF = 'Cambria';   // titres (safe font)
const SANS = 'Calibri';    // corps (safe font)

const p = new pptxgen();
p.defineLayout({ name: 'NT', width: 13.333, height: 7.5 });
p.layout = 'NT';
p.author = 'Équipe NeoTravel';
p.company = 'NeoTravel — InterstellLabs';
p.title = 'Support de soutenance — NeoTravel';

const W = 13.333, H = 7.5, M = 0.62, CW = W - 2 * M;
const sh = () => ({ type: 'outer', color: '000000', blur: 7, offset: 3, angle: 90, opacity: 0.12 });

let IDX = 0;
const TOTAL = 16;

// Pied de page commun : libellé + numéro + barre de progression. Une fois par slide.
function footer(s, dark = false) {
  IDX++;
  const muteC = dark ? 'BFD8CF' : C.mute;
  s.addText('NeoTravel · Soutenance · 01/07/2026', { x: M, y: H - 0.46, w: 6, h: 0.28, fontSize: 9, color: muteC, align: 'left', margin: 0, fontFace: SANS });
  s.addText(`${IDX} / ${TOTAL}`, { x: W - M - 1.2, y: H - 0.46, w: 1.2, h: 0.28, fontSize: 9, color: muteC, align: 'right', margin: 0, fontFace: SANS });
  const by = H - 0.16, bh = 0.06;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: by, w: CW, h: bh, rectRadius: 0.03, fill: { color: dark ? C.trackD : 'E2ECE8' }, line: { type: 'none' } });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: M, y: by, w: Math.max(0.14, CW * IDX / TOTAL), h: bh, rectRadius: 0.03, fill: { color: dark ? C.mint : C.teal }, line: { type: 'none' } });
}
function heading(s, eyebrow, title) {
  s.addShape(p.shapes.OVAL, { x: M, y: 0.63, w: 0.12, h: 0.12, fill: { color: C.gold }, line: { type: 'none' } });
  s.addText(String(eyebrow).toUpperCase(), { x: M + 0.24, y: 0.5, w: CW - 3, h: 0.3, fontSize: 12, color: C.mint, bold: true, charSpacing: 2, margin: 0, fontFace: SANS });
  s.addText(title, { x: M, y: 0.82, w: CW, h: 0.8, fontSize: 29, color: C.tealDk, bold: true, margin: 0, fontFace: SERIF });
}
function card(s, x, y, w, h, fill) {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.09, fill: { color: fill || C.white }, line: { color: C.tint2, width: 1 }, shadow: sh() });
}
function badge(s, x, y, n, d = 0.5, color) {
  s.addShape(p.shapes.OVAL, { x, y, w: d, h: d, fill: { color: color || C.teal } });
  s.addText(String(n), { x, y, w: d, h: d, fontSize: d > 0.5 ? 15 : 13, color: 'FFFFFF', bold: true, align: 'center', valign: 'middle', margin: 0, fontFace: SANS });
}
function bullets(s, items, x, y, w, h, fs = 12) {
  s.addText(items.map((t) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: true, paraSpaceAfter: 6 } })),
    { x, y, w, h, fontSize: fs, color: C.ink, valign: 'top', margin: 0, fontFace: SANS, lineSpacingMultiple: 1.03 });
}
function bulletCard(s, x, y, w, h, title, items, { n, fill, fs = 11.5 } = {}) {
  card(s, x, y, w, h, fill);
  let cy = y + 0.24;
  if (n) {
    badge(s, x + 0.26, cy, n, 0.46);
    s.addText(title, { x: x + 0.86, y: cy, w: w - 1.08, h: 0.46, fontSize: 14.5, bold: true, color: C.tealDk, valign: 'middle', margin: 0, fontFace: SANS });
    cy += 0.7;
  } else {
    s.addText(title, { x: x + 0.28, y: cy, w: w - 0.56, h: 0.4, fontSize: 14.5, bold: true, color: C.tealDk, margin: 0, fontFace: SANS });
    cy += 0.56;
  }
  bullets(s, items, x + 0.3, cy, w - 0.6, h - (cy - y) - 0.18, fs);
}
function table(s, rows, { x = M, y = 1.7, w = CW, colW, fontSize = 12 }) {
  const header = rows[0].map((c) => ({ text: c, options: { fill: { color: C.teal }, color: 'FFFFFF', bold: true, fontSize: fontSize + 0.5, align: 'left', valign: 'middle', margin: [4, 6, 4, 6], fontFace: SANS } }));
  const body = rows.slice(1).map((r, ri) => r.map((c, ci) => ({
    text: c, options: { fill: { color: ri % 2 ? C.soft : 'FFFFFF' }, color: ci === 0 ? C.tealDk : C.ink, bold: ci === 0, fontSize, align: 'left', valign: 'middle', margin: [4, 6, 4, 6], fontFace: SANS },
  })));
  s.addTable([header, ...body], { x, y, w, colW, border: { type: 'solid', pt: 0.5, color: 'D9E2DE' }, autoPage: false, valign: 'middle' });
}
function sectionDark(title, sub) {
  const s = p.addSlide();
  s.background = { color: C.tealDk };
  s.addShape(p.shapes.OVAL, { x: W - 3.2, y: -1.6, w: 4.4, h: 4.4, fill: { color: C.teal, transparency: 70 }, line: { type: 'none' } });
  s.addShape(p.shapes.OVAL, { x: -1.4, y: H - 2.6, w: 3.6, h: 3.6, fill: { color: C.mint, transparency: 80 }, line: { type: 'none' } });
  s.addShape(p.shapes.OVAL, { x: M, y: 2.5, w: 0.16, h: 0.16, fill: { color: C.gold }, line: { type: 'none' } });
  s.addText(title, { x: M, y: 2.7, w: CW, h: 1.1, fontSize: 40, color: 'FFFFFF', bold: true, margin: 0, fontFace: SERIF });
  if (sub) s.addText(sub, { x: M, y: 3.95, w: CW, h: 0.6, fontSize: 17, color: C.tint2, margin: 0, fontFace: SANS });
  return s;
}

// ==========================================================================
// SLIDE 1 — Titre
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: C.tealDk };
  s.addShape(p.shapes.OVAL, { x: W - 3.6, y: -1.8, w: 5, h: 5, fill: { color: C.teal, transparency: 68 }, line: { type: 'none' } });
  s.addShape(p.shapes.OVAL, { x: -1.6, y: H - 2.8, w: 4, h: 4, fill: { color: C.mint, transparency: 82 }, line: { type: 'none' } });
  if (hasLogo) s.addImage({ path: LOGO, x: (W - 2.7) / 2, y: 1.15, w: 2.7, h: 1.49 });
  s.addText('SUPPORT DE SOUTENANCE', { x: 0, y: 2.95, w: W, h: 0.4, fontSize: 14, color: C.gold, bold: true, align: 'center', charSpacing: 3, margin: 0, fontFace: SANS });
  s.addText('Automatisation du cycle commercial', { x: 0, y: 3.4, w: W, h: 0.9, fontSize: 38, color: 'FFFFFF', bold: true, align: 'center', margin: 0, fontFace: SERIF });
  s.addText('NeoTravel — transport de groupe en autocar', { x: 0, y: 4.35, w: W, h: 0.5, fontSize: 18, color: C.tint2, align: 'center', margin: 0, fontFace: SANS });
  s.addText('Cas d’étude MBA1 — InterstellLabs · 1ᵉʳ juillet 2026', { x: 0, y: 5.55, w: W, h: 0.5, fontSize: 13, color: 'CFE3DC', align: 'center', margin: 0, fontFace: SANS });
  footer(s, true);
  s.addNotes('Orateur : Axel — 30 s. Se présenter brièvement et annoncer le plan : objectifs du client → contexte → solution → choix techniques → prévu vs réalisé → démo live → ouverture et passation → questions. Annoncer la règle d’or dès l’ouverture.');
}

// ==========================================================================
// SLIDE 2 — Objectifs & attentes initiales
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Le cadre posé avant de coder', 'Objectifs & attentes initiales du client');
  const y = 1.78, h = 4.7, w = (CW - 0.5) / 3;
  bulletCard(s, M, y, w, h, 'Le périmètre — 10 fonctions', [
    'Capter le lead (chat / formulaire)',
    'Centraliser dans un CRM',
    'Qualifier la demande',
    'Détecter les infos manquantes',
    'Calculer un devis (déterministe)',
    'Générer la proposition (PDF)',
    'Envoyer le devis au client',
    'Relancer automatiquement',
    'Suivre le pipeline commercial',
    'Piloter via un dashboard',
  ], { n: 1, fs: 11 });
  bulletCard(s, M + w + 0.25, y, w, h, 'Les irritants à résoudre', [
    'Leads payants jamais recontactés (manque à gagner)',
    'Délais de réponse et devis trop lents',
    'Relances manuelles oubliées',
    'Tarification manuelle, lente et faillible',
    'Direction sans visibilité sur l’activité',
  ], { n: 2 });
  bulletCard(s, M + 2 * (w + 0.25), y, w, h, 'Les KPIs visés', [
    'Part des leads traités → ~100 %',
    'Délai demande → devis : en minutes',
    'Aucune relance oubliée',
    'Visibilité des demandes urgentes',
    'Coût IA par devis maîtrisé (bonus)',
  ], { n: 3 });
  footer(s);
  s.addNotes('Orateur : Axel — 1,5 min. Poser le cadre : voici ce que le client attendait AVANT qu’on écrive la première ligne (périmètre, irritants, KPIs du dossier de cadrage L1). On y reviendra pour prouver qu’on répond au besoin (slide attentes → réponses).');
}

// ==========================================================================
// SLIDE 3 — Contexte & problème
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Contexte NeoTravel', 'Le problème : l’exploitation, pas l’acquisition');
  card(s, M, 1.85, 4.0, 4.5, C.tint);
  s.addText('~60', { x: M, y: 2.2, w: 4.0, h: 1.3, fontSize: 66, color: C.gold, bold: true, align: 'center', margin: 0, fontFace: SERIF });
  s.addText('leads / jour', { x: M, y: 3.45, w: 4.0, h: 0.5, fontSize: 18, color: C.tealDk, bold: true, align: 'center', margin: 0, fontFace: SANS });
  s.addText('L’acquisition n’est pas le problème — le flux existant est sous-exploité, faute de capacité de traitement.',
    { x: M + 0.35, y: 4.15, w: 3.3, h: 1.9, fontSize: 12.5, color: C.ink, align: 'center', valign: 'top', margin: 0, fontFace: SANS });
  const x2 = M + 4.3, w2 = CW - 4.3;
  bulletCard(s, x2, 1.85, w2, 2.15, 'Friction 1 — des leads perdus', [
    'Commerciaux commissionnés → priorité aux gros leads.',
    'Des leads payants (Ads) ne sont jamais recontactés = manque à gagner direct.',
  ], { fs: 12.5 });
  bulletCard(s, x2, 4.2, w2, 2.15, 'Friction 2 — acquisition bridée', [
    'Sans automatisation, plus de leads = plus de charge, pas plus de CA.',
    'S’ajoutent : tarif manuel lent, relances oubliées, direction sans visibilité.',
  ], { fs: 12.5 });
  footer(s);
  s.addNotes('Orateur : Axel — 1,5 min. Insister : on veut mieux exploiter le flux existant et libérer les commerciaux pour les tâches à forte valeur (conseil, négociation).');
}

// ==========================================================================
// SLIDE 4 — Solution & règle d'or
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Notre réponse', 'La solution : un copilote, et une règle d’or');
  const steps = ['Captation\n(chat)', 'Qualification\n(agent IA)', 'Devis\ndéterministe', 'Email + PDF\n+ relances', 'Dashboard\nde pilotage'];
  const n = steps.length, gap = 0.35, w = (CW - (n - 1) * gap) / n, y = 2.0, h = 1.7;
  steps.forEach((t, i) => {
    const x = M + i * (w + gap);
    card(s, x, y, w, h, C.tint);
    badge(s, x + w / 2 - 0.25, y + 0.22, i + 1, 0.5);
    s.addText(t, { x: x + 0.1, y: y + 0.82, w: w - 0.2, h: 0.8, fontSize: 12.5, bold: true, color: C.tealDk, align: 'center', valign: 'top', margin: 0, fontFace: SANS });
    if (i < n - 1) s.addText('▶', { x: x + w + 0.02, y: y + h / 2 - 0.2, w: gap - 0.04, h: 0.4, fontSize: 12, color: C.mint, align: 'center', valign: 'middle', margin: 0 });
  });
  card(s, M, 4.25, CW, 1.9, C.tealDk);
  s.addText('★  La règle d’or', { x: M + 0.4, y: 4.5, w: CW - 0.8, h: 0.5, fontSize: 18, bold: true, color: C.gold, margin: 0, fontFace: SANS });
  s.addText('L’IA comprend et oriente, mais le prix vient TOUJOURS du code déterministe — jamais du modèle de langage. Reproductible, auditable, zéro hallucination tarifaire. L’humain garde la main sur les cas sensibles.',
    { x: M + 0.4, y: 5.0, w: CW - 0.8, h: 1.0, fontSize: 14, color: 'FFFFFF', valign: 'top', margin: 0, fontFace: SANS, lineSpacingMultiple: 1.1 });
  footer(s);
  s.addNotes('Orateur : Axel — 1,5 min. La règle d’or est le fil rouge de toute la soutenance. La solution automatise toute la chaîne sans déshumaniser : l’agent prépare, l’humain décide et engage. Le prix est calculé par le tool calculer_devis(), pas par le LLM.');
}

// ==========================================================================
// SLIDE 5 — Architecture (schéma réel du projet)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Vue d’ensemble', 'Architecture');
  if (hasArch) {
    const iw = 6.6, ih = iw * 640 / 980; // ratio du viewBox 980x640
    s.addImage({ path: ARCH, x: (W - iw) / 2, y: 1.7, w: iw, h: ih });
  }
  card(s, M, 5.5, CW, 0.95, C.tint2);
  s.addText([
    { text: 'Un seul appel LLM, avec Gemma 4, pour l’extraction. ', options: { bold: true, color: C.tealDk } },
    { text: 'Le nœud Code calcule le prix ET rédige la réponse → rapide (timeout 30 s), fiable, sans fuite de raisonnement.', options: { color: C.ink } },
  ], { x: M + 0.35, y: 5.5, w: CW - 0.7, h: 0.95, fontSize: 13, valign: 'middle', margin: 0, fontFace: SANS });
  footer(s);
  s.addNotes('Orateur : Axel — 1 min. Montrer le schéma réel du projet (docs/architecture.svg). Le front Next.js est le centre : il orchestre tout. Un seul appel LLM avec Gemma 4 pour l’extraction, le reste est déterministe.');
}

// ==========================================================================
// SLIDE 6 — Choix techniques (schéma en cartes)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Défense des choix', 'Choix techniques : pas seulement quoi, mais pourquoi');
  const decisions = [
    ['Orchestration', 'n8n', 'Mise en place visuelle et rapide, relances intégrées, courbe d’apprentissage douce.'],
    ['Modèle IA', 'Gemma 4', 'Gratuit (quota AI Studio), sorties JSON structurées fiables, latence basse, rôle d’assistance seul.'],
    ['Données & Authentification', 'Supabase', 'Base, Authentification et sécurité par ligne dans une seule stack, dashboard sur-mesure sans surcoût.'],
    ['Appels LLM', 'Un seul (extraction)', 'Tient dans le timeout 30 s, moins d’erreurs 503, aucune fuite de raisonnement vers le client.'],
  ];
  const y0 = 1.75, gap = 0.3, w = (CW - gap) / 2, h = 1.62;
  decisions.forEach(([label, choix, why], i) => {
    const x = M + (i % 2) * (w + gap), yy = y0 + Math.floor(i / 2) * (h + gap);
    card(s, x, yy, w, h, i % 2 ? C.soft : C.tint);
    s.addShape(p.shapes.OVAL, { x: x + 0.28, y: yy + 0.28, w: 0.14, h: 0.14, fill: { color: C.gold }, line: { type: 'none' } });
    s.addText(label.toUpperCase(), { x: x + 0.52, y: yy + 0.18, w: w - 0.8, h: 0.32, fontSize: 11, bold: true, color: C.mint, charSpacing: 1, margin: 0, fontFace: SANS });
    s.addText(choix, { x: x + 0.52, y: yy + 0.46, w: w - 0.8, h: 0.4, fontSize: 17, bold: true, color: C.tealDk, margin: 0, fontFace: SERIF });
    s.addText(why, { x: x + 0.32, y: yy + 0.92, w: w - 0.64, h: h - 1.0, fontSize: 11.5, color: C.ink, valign: 'top', margin: 0, fontFace: SANS, lineSpacingMultiple: 1.02 });
  });
  const ly = y0 + 2 * (h + gap);
  card(s, M, ly, CW, 0.95, C.tealDk);
  s.addText([
    { text: 'Limite observée — ', options: { bold: true, color: C.gold } },
    { text: '503 ponctuels du LLM. Mitigée par des retries, et le prix comme la réponse ne dépendent pas du LLM : le devis sort quand même.', options: { color: 'FFFFFF' } },
  ], { x: M + 0.4, y: ly, w: CW - 0.8, h: 0.95, fontSize: 13, valign: 'middle', margin: 0, fontFace: SANS });
  footer(s);
  s.addNotes('Orateur : Vincent — 2 min. Défendre chaque décision par ses critères (coût, qualité, latence, sorties structurées, compatibilité stack) et assumer la limite observée. Renvoyer à l’Argumentaire des choix (L1) pour le détail.');
}

// ==========================================================================
// SLIDE 7 — Fiabilité & garde-fous
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Un système sûr, juste et auditable', 'Fiabilité & garde-fous');
  const y = 1.8, gy = 0.3, w = (CW - 0.4) / 2, h = (4.95 - gy) / 2;
  bulletCard(s, M, y, w, h, 'Prix déterministe', ['calculer_devis() testé, jamais le LLM.', '1ᵉʳ prix figé (distance estimée).'], { fs: 12.5 });
  bulletCard(s, M + w + 0.4, y, w, h, 'Tests : types ET limites', ['0 passager, date incohérente, gros volume…', 'Au-delà de 85 passagers → escalade, pas de prix.'], { fs: 12.5 });
  bulletCard(s, M, y + h + gy, w, h, 'RGPD', ['Minimisation, données fictives ou minimales.', 'Domaine de démo = aucun envoi réel.'], { fs: 12.5 });
  bulletCard(s, M + w + 0.4, y + h + gy, w, h, 'Prompt injection & HITL', ['Le code ne négocie jamais le prix.', 'Tout cas hors cadre escaladé à un humain.'], { fs: 12.5 });
  footer(s);
  s.addNotes('Orateur : Vincent — 1 min. Montrer rapidement npm test qui passe et /docs (Swagger) : toute l’API est documentée et explorable.');
}

// ==========================================================================
// SLIDE 8 — Prévu vs réalisé (schéma à flèches)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Transparence', 'Prévu (L1) → réalisé (L2/L3)');
  const rows = [
    ['Modèle gpt-4o-mini', 'Gemma 4 (gratuit)', 'Quota AI Studio, sorties JSON suffisantes.'],
    ['Distance estimée plus tard (P2)', 'Distance estimée dès le MVP', 'Service gratuit sans clé, devis juste tout de suite.'],
    ['n8n hébergé (cloud)', 'Tunnel local à URL fixe (0 €)', 'MVP gratuit suffisant, voie de prod documentée.'],
    ['Espace client = bonus', 'Livré (devis, conversations, messagerie)', 'Forte valeur client, simple dans Supabase.'],
    ['Dashboard simple', 'Dashboard riche (courbe, camembert, export)', 'Supabase facilitait un vrai pilotage.'],
  ];
  const y0 = 1.75, rh = 0.9, gap = 0.08;
  rows.forEach(([prevu, real, why], i) => {
    const yy = y0 + i * (rh + gap);
    card(s, M, yy, CW, rh, i % 2 ? C.soft : C.white);
    s.addText(prevu, { x: M + 0.3, y: yy, w: 3.0, h: rh, fontSize: 11.5, color: C.mute, valign: 'middle', margin: 0, fontFace: SANS });
    s.addText('→', { x: M + 3.35, y: yy, w: 0.5, h: rh, fontSize: 18, bold: true, color: C.gold, align: 'center', valign: 'middle', margin: 0 });
    s.addText(real, { x: M + 3.95, y: yy, w: 3.25, h: rh, fontSize: 12, bold: true, color: C.tealDk, valign: 'middle', margin: 0, fontFace: SANS });
    s.addText(why, { x: M + 7.35, y: yy, w: CW - 7.6, h: rh, fontSize: 11, italic: true, color: C.ink, valign: 'middle', margin: 0, fontFace: SANS });
  });
  footer(s);
  s.addNotes('Orateur : Vincent — 1,5 min. Assumer les écarts comme des décisions, pas des oublis. Message : on a tenu le cap (chaîne complète) et certains arbitrages ont amélioré le résultat.');
}

// ==========================================================================
// SLIDE 9 — Attentes client → réponses (schéma à flèches)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'On répond au besoin', 'Attentes du client → réponses livrées');
  const rows = [
    ['Capter et centraliser chaque lead', 'Chat + création automatique de la fiche en base.'],
    ['Qualifier et détecter les manquants', 'Agent n8n, extraction des paramètres + questions ciblées.'],
    ['Un devis juste, en quelques secondes', 'calculer_devis() déterministe + distance estimée, figé.'],
    ['Une proposition professionnelle', 'PDF généré + email avec boutons Accepter / Refuser.'],
    ['Ne plus oublier les relances', 'Séquences automatiques J+2 / J+3 / J+7 (max 2) + relance manuelle.'],
    ['Donner de la visibilité à la direction', 'Dashboard admin : KPIs, courbe, camembert, export PDF.'],
    ['Garder l’humain sur les cas sensibles', 'Escalade au-delà de 85 passagers + messagerie client ↔ conseiller.'],
  ];
  const y0 = 1.72, rh = 0.66, gap = 0.06;
  rows.forEach(([att, rep], i) => {
    const yy = y0 + i * (rh + gap);
    card(s, M, yy, CW, rh, i % 2 ? C.soft : C.white);
    s.addText(att, { x: M + 0.3, y: yy, w: 4.2, h: rh, fontSize: 11.5, bold: true, color: C.tealDk, valign: 'middle', margin: 0, fontFace: SANS });
    s.addText('→', { x: M + 4.55, y: yy, w: 0.45, h: rh, fontSize: 16, bold: true, color: C.gold, align: 'center', valign: 'middle', margin: 0 });
    s.addText(rep, { x: M + 5.1, y: yy, w: CW - 5.35, h: rh, fontSize: 11.5, color: C.ink, valign: 'middle', margin: 0, fontFace: SANS });
  });
  footer(s);
  s.addNotes('Orateur : Axel — 1,5 min. Boucler avec la slide 2 : chaque attente initiale a sa réponse concrète. C’est la preuve qu’on a traité le besoin du client, pas seulement construit une démo.');
}

// ==========================================================================
// SLIDE 10 — Section : Ce qui fonctionne (dark divider)
// ==========================================================================
{
  const s = sectionDark('Ce qui fonctionne', 'Démonstration live — le parcours complet, en conditions réelles.');
  s.addText('Parcours prospect  ·  cas complexe (HITL)  ·  espace client  ·  dashboard admin',
    { x: M, y: 4.7, w: CW, h: 0.5, fontSize: 14, color: C.mint, bold: true, margin: 0, fontFace: SANS });
  footer(s, true);
  s.addNotes('Orateur : Zakaria. Transition vers la démo live. Pré-requis : lancer lancer-n8n-tunnel.bat + reset-complet.sql. Filet de sécurité : un jeu de démo est déjà en base si le chat live échoue.');
}

// ==========================================================================
// SLIDES 11-12 — Démo (2 sous-démos par slide pour combler l'espace)
// ==========================================================================
function demoDuo(eyebrow, title, left, right, note) {
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, eyebrow, title);
  const y = 1.8, h = 4.85, w = (CW - 0.4) / 2;
  [[M, left], [M + w + 0.4, right]].forEach(([x, col]) => {
    card(s, x, y, w, h, C.white);
    s.addText(col.title, { x: x + 0.3, y: y + 0.24, w: w - 0.6, h: 0.45, fontSize: 16, bold: true, color: C.tealDk, margin: 0, fontFace: SANS });
    let by = y + 0.78;
    if (col.scenario) {
      card(s, x + 0.3, by, w - 0.6, 0.85, C.tint2);
      s.addText([{ text: '💬  ', options: {} }, { text: col.scenario, options: { italic: true, bold: true, color: C.tealDk } }],
        { x: x + 0.45, y: by, w: w - 0.9, h: 0.85, fontSize: 12.5, valign: 'middle', margin: 0, fontFace: SANS });
      by += 1.05;
    }
    bullets(s, col.items, x + 0.32, by, w - 0.64, y + h - by - 0.2, 12.5);
  });
  footer(s);
  s.addNotes(note);
}
demoDuo('Démo — le cœur', 'Parcours prospect & cas complexe',
  {
    title: 'Parcours prospect → devis',
    scenario: 'Lyon → Annecy, 50 personnes, aller-retour le 12 juillet 2026',
    items: [
      'La barre « Votre demande » se remplit en direct, l’agent demande l’email.',
      'Carte devis affichée + email reçu (PDF joint + boutons Accepter / Refuser).',
      'Le prix vient du moteur, pas de l’IA, et la distance est estimée automatiquement.',
    ],
  },
  {
    title: 'Cas complexe → escalade (HITL)',
    scenario: 'Marseille → Lille, 120 personnes',
    items: [
      'Au-delà de 85 passagers → message d’escalade, aucun devis automatique.',
      'La demande devient un « cas complexe » transmis à un humain avec le contexte.',
      'Dire « non » à l’automatisation totale est un gage de fiabilité, pas une limite.',
    ],
  },
  'Orateur : Zakaria — 3 min. Si Gemma renvoie un 503 ponctuel, renvoyer le message. Filet : devis de démo déjà en base. Le cas complexe montre que le système connaît ses limites.');

demoDuo('Démo — client & pilotage', 'Espace client & dashboard admin',
  {
    title: 'Côté client',
    scenario: null,
    items: [
      'Bouton « Accepter » d’un email sans compte → inscription pré-remplie.',
      'Espace client : Mes devis (PDF, accepter / refuser avec motifs), Mes conversations, Mon compte.',
      '« Refuser » depuis l’email → page de motifs → relances stoppées.',
    ],
  },
  {
    title: 'Dashboard admin',
    scenario: null,
    items: [
      'KPIs, courbe d’évolution, camembert des refus, filtre par dates, export PDF.',
      'Cas complexe → devis sur-mesure (prix HT → TVA / TTC → envoi) → rejoint le pipeline.',
      'Messagerie HITL bidirectionnelle, bouton « Lancer les relances dues ».',
    ],
  },
  'Orateur : Zakaria — 3,5 min. Différenciateur (bonus livré) : le prospect suit ses devis et son historique. Le dashboard prouve le pilotage par la donnée, en temps réel.');

// ==========================================================================
// SLIDE 13 — Limites, MVP vs prod & coûts
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Limites assumées', 'Ce qu’on assume — et le passage en production');
  bulletCard(s, M, 1.85, 5.5, 4.5, 'Limites & arbitrages', [
    'n8n en tunnel local = choix MVP (0 €) : dépend du PC allumé.',
    'Prototype cohérent de bout en bout, pas une app de production (cas limites non exhaustifs).',
    'Péages forfaitaires au MVP, paramétrables et affinés en P2.',
  ], { fs: 12.5 });
  const cx = M + 5.8, cw = CW - 5.8;
  s.addText('MVP vs production — coût mensuel', { x: cx, y: 1.85, w: cw, h: 0.4, fontSize: 14.5, bold: true, color: C.tealDk, margin: 0, fontFace: SANS });
  const costs = [['~0 €', 'MVP / soutenance (tunnel local)'], ['~0-1 €', 'Prod « éco » 24/7 (n8n Oracle Free)'], ['~30 €', 'Prod « sereine » — recommandée']];
  const ch = 1.12, cgap = 0.18; let cy = 2.4;
  costs.forEach(([v, d], i) => {
    card(s, cx, cy, cw, ch, i === 2 ? C.tint2 : C.tint);
    s.addText(v, { x: cx + 0.2, y: cy, w: 2.1, h: ch, fontSize: 26, bold: true, color: i === 2 ? C.gold : C.teal, align: 'center', valign: 'middle', margin: 0, fontFace: SERIF });
    s.addText(d, { x: cx + 2.4, y: cy, w: cw - 2.6, h: ch, fontSize: 12.5, color: C.ink, valign: 'middle', margin: 0, fontFace: SANS });
    cy += ch + cgap;
  });
  footer(s);
  s.addNotes('Orateur : Vincent — 1,5 min. Assumer franchement : la cohérence du parcours prime sur la perfection d’un maillon. Le seul élément à changer pour la prod : héberger n8n. 4 scénarios chiffrés dans COUTS_ET_PROD.md.');
}

// ==========================================================================
// SLIDE 14 — Ouverture V2 & passation
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Et après', 'Ouverture vers une V2 & passation livrée');
  const w = (CW - 0.5) / 2, y = 1.8, h = 4.7;
  card(s, M, y, w, h, C.white);
  s.addText('Ouverture — vers une version 2', { x: M + 0.3, y: y + 0.25, w: w - 0.6, h: 0.45, fontSize: 15, bold: true, color: C.tealDk, margin: 0, fontFace: SANS });
  bullets(s, [
    'P1 — héberger n8n 24/7 (chat indépendant du PC) + Supabase Pro (base toujours active).',
    'P2 — distance & péages enrichis par trajet, observabilité coût/tokens par devis, notifications internes (urgent, cas complexe).',
    'P3 — canal WhatsApp officiel, A/B testing des relances, rôles fins (commercial / manager).',
  ], M + 0.32, y + 0.8, w - 0.64, h - 1.0, 12);
  card(s, M + w + 0.5, y, w, h, C.tint);
  s.addText('Passation déjà livrée (L3)', { x: M + w + 0.8, y: y + 0.25, w: w - 0.6, h: 0.45, fontSize: 15, bold: true, color: C.tealDk, margin: 0, fontFace: SANS });
  bullets(s, [
    'Procédure repreneur : relancer le projet en local en 5 min.',
    'Procédure équipe NeoTravel : termes clés en clair + usage quotidien.',
    'Maintenance documentée : modifier pricing, emails, statuts, relances.',
    'Backlog P1/P2/P3 + README, API Swagger (/docs), TypeDoc.',
  ], M + w + 0.82, y + 0.8, w - 0.64, h - 1.6, 12);
  s.addText('→ La solution peut vivre et évoluer sans ses créateurs.', { x: M + w + 0.82, y: y + h - 0.62, w: w - 1.0, h: 0.5, fontSize: 12.5, italic: true, bold: true, color: C.gold, margin: 0, fontFace: SANS });
  footer(s);
  s.addNotes('Orateur : Vincent — 1,5 min. Deux messages : (1) le projet a une suite claire (backlog priorisé), (2) il est déjà reprenable grâce à la doc de passation L3. Répond au critère « rendre la solution reprenable ».');
}

// ==========================================================================
// SLIDE 15 — Clôture (dark)
// ==========================================================================
{
  const s = sectionDark('Ce qu’on a prouvé', null);
  const items = ['Compris le métier et le besoin du client', 'Construit un flux complet de bout en bout', 'Sécurisé le pricing (déterministe, auditable)', 'Rendu la solution reprenable (passation)'];
  const w = (CW - 0.5) / 2, y = 4.0, h = 1.0;
  items.forEach((t, i) => {
    const x = M + (i % 2) * (w + 0.5), yy = y + Math.floor(i / 2) * (h + 0.25);
    s.addShape(p.shapes.OVAL, { x, y: yy + 0.25, w: 0.42, h: 0.42, fill: { color: C.mint } });
    s.addText('✓', { x, y: yy + 0.25, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: C.tealDk, align: 'center', valign: 'middle', margin: 0 });
    s.addText(t, { x: x + 0.6, y: yy, w: w - 0.7, h: h, fontSize: 14, color: 'FFFFFF', valign: 'middle', margin: 0, fontFace: SANS });
  });
  s.addText('Merci — nous sommes à vous pour vos questions.', { x: M, y: 6.35, w: CW, h: 0.5, fontSize: 16, bold: true, color: C.gold, margin: 0, fontFace: SANS });
  footer(s, true);
  s.addNotes('Orateur : toute l’équipe — puis 10-15 min de Q&R. Chaque membre reste disponible sur son périmètre (voir l’annexe : questions probables et réponses prêtes).');
}

// ==========================================================================
// SLIDE 16 — Annexe Q&R
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Annexe', 'Questions probables & réponses prêtes');
  table(s, [
    ['Question du jury', 'Réponse'],
    ['Pourquoi pas le LLM pour le prix ?', 'Reproductibilité, auditabilité, zéro hallucination tarifaire. Le LLM ne fait qu’extraire.'],
    ['C’est vraiment en ligne ?', 'Oui : front + base + emails 24/7. Seul l’agent (chat) dépend du tunnel — assumé et documenté.'],
    ['Et si Gemma sature (503) ?', 'Retries automatiques. Le moteur de prix et la réponse ne dépendent pas du LLM.'],
    ['Combien ça coûterait en vrai ?', '4 scénarios chiffrés : ~0 € en éco, ~30 €/mois en prod sereine (COUTS_ET_PROD.md).'],
    ['Comment un autre dev reprend le projet ?', 'Doc de passation (L3) : 5 min pour relancer en local, Swagger / TypeDoc pour le détail.'],
    ['Comment changer un tarif ?', 'pricing/matrices.js (+ pricing_config), relancer npm test, reporter dans n8n. Jamais via le LLM.'],
    ['Et la RGPD ?', 'Minimisation, données fictives ou minimales, domaine de démo sans envoi réel, accès cloisonné par utilisateur.'],
  ], { y: 1.78, colW: [4.4, CW - 4.4], fontSize: 11 });
  footer(s);
  s.addNotes('Annexe de secours pour le Q&R : une réponse courte et défendable par question fréquente.');
}

// ==========================================================================
const out = path.join(__dirname, process.argv[2] || 'Support-de-soutenance-NeoTravel.pptx');
p.writeFile({ fileName: out }).then(() => console.log('OK ->', out));
