// build-pptx.js — Génère le PowerPoint de soutenance NeoTravel (.pptx)
// Lancer : node build-pptx.js   (depuis ce dossier).
// Dépendance : pptxgenjs (npm install pptxgenjs). Sortie : Support-de-soutenance-NeoTravel.pptx
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const LOGO = path.join(__dirname, '..', 'assets', 'logo-neotravel.png');
const hasLogo = fs.existsSync(LOGO);

// ---- Charte NeoTravel (reprise du _docx-kit teal) ----
const C = {
  teal: '0E7A66', tealDk: '0A5346', mint: '13A884',
  tint: 'EAF4F0', tint2: 'D9F0EA', white: 'FFFFFF',
  ink: '1F2937', mute: '6B7280', line: 'CBD5E1', soft: 'F4F8F6',
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

// --------------------------------------------------------------------------
function chrome(s, idx, orateur) {
  s.addText('NeoTravel · Soutenance · 01/07/2026', { x: M, y: H - 0.44, w: 6, h: 0.3, fontSize: 9, color: C.mute, align: 'left', margin: 0, fontFace: SANS });
  s.addText(String(idx), { x: W - M - 0.7, y: H - 0.44, w: 0.7, h: 0.3, fontSize: 9, color: C.mute, align: 'right', margin: 0, fontFace: SANS });
  if (orateur) s.addText(orateur, { x: W - M - 4.2, y: 0.42, w: 4.2, h: 0.3, fontSize: 10.5, color: C.teal, align: 'right', bold: true, margin: 0, fontFace: SANS });
}
function heading(s, eyebrow, title) {
  s.addText(String(eyebrow).toUpperCase(), { x: M, y: 0.52, w: CW - 4, h: 0.3, fontSize: 12, color: C.mint, bold: true, charSpacing: 2, margin: 0, fontFace: SANS });
  s.addText(title, { x: M, y: 0.82, w: CW, h: 0.8, fontSize: 29, color: C.tealDk, bold: true, margin: 0, fontFace: SERIF });
}
function card(s, x, y, w, h, fill) {
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.09, fill: { color: fill || C.white }, line: { color: C.tint2, width: 1 }, shadow: sh() });
}
function badge(s, x, y, n, d = 0.5) {
  s.addShape(p.shapes.OVAL, { x, y, w: d, h: d, fill: { color: C.teal } });
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
  s.addText('SUPPORT DE SOUTENANCE', { x: 0, y: 2.95, w: W, h: 0.4, fontSize: 14, color: C.mint, bold: true, align: 'center', charSpacing: 3, margin: 0, fontFace: SANS });
  s.addText('Automatisation du cycle commercial', { x: 0, y: 3.4, w: W, h: 0.9, fontSize: 38, color: 'FFFFFF', bold: true, align: 'center', margin: 0, fontFace: SERIF });
  s.addText('NeoTravel — transport de groupe en autocar', { x: 0, y: 4.35, w: W, h: 0.5, fontSize: 18, color: C.tint2, align: 'center', margin: 0, fontFace: SANS });
  s.addText([
    { text: 'Équipe : Axel MOMPER · Vincent CONTER · Zakaria TOUAMI', options: { breakLine: true } },
    { text: 'Cas d’étude MBA1 — InterstellLabs · 1ᵉʳ juillet 2026', options: {} },
  ], { x: 0, y: 5.5, w: W, h: 0.9, fontSize: 13, color: 'CFE3DC', align: 'center', margin: 0, fontFace: SANS, lineSpacingMultiple: 1.3 });
  s.addNotes('Orateur : Axel — 30 s. Se présenter brièvement et annoncer le plan : objectifs du client → contexte → solution → choix techniques → prévu vs réalisé → démo live → ouverture & passation → questions. Annoncer la règle d’or dès l’ouverture.');
}

// ==========================================================================
// SLIDE 2 — Objectifs & attentes initiales (NEW)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Le cadre posé avant de coder', 'Objectifs & attentes initiales du client');
  const y = 1.78, h = 4.95, w = (CW - 0.5) / 3;
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
    'Taux de conversion devis → accepté',
    'Aucune relance oubliée',
    'Visibilité des demandes urgentes',
    'Coût IA par devis maîtrisé (bonus)',
  ], { n: 3 });
  chrome(s, 2, 'Axel · 1,5 min');
  s.addNotes('Orateur : Axel — 1,5 min. Poser le cadre : voici ce que le client attendait AVANT qu’on écrive la première ligne (périmètre, irritants, KPIs du dossier de cadrage L1). On y reviendra pour prouver qu’on répond au besoin (slide « attentes → réponses »).');
}

// ==========================================================================
// SLIDE 3 — Contexte & problème
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Contexte NeoTravel', 'Le problème : l’exploitation, pas l’acquisition');
  // stat card
  card(s, M, 1.85, 4.0, 4.5, C.tint);
  s.addText('~60', { x: M, y: 2.2, w: 4.0, h: 1.3, fontSize: 66, color: C.teal, bold: true, align: 'center', margin: 0, fontFace: SERIF });
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
  chrome(s, 3, 'Axel · 1,5 min');
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
  // règle d'or
  card(s, M, 4.25, CW, 1.9, C.tealDk);
  s.addText('★  La règle d’or', { x: M + 0.4, y: 4.5, w: CW - 0.8, h: 0.5, fontSize: 18, bold: true, color: C.mint, margin: 0, fontFace: SANS });
  s.addText('L’IA comprend et oriente, mais le prix vient TOUJOURS du code déterministe ( calculer_devis() ) — jamais du modèle de langage. Reproductible, auditable, zéro hallucination tarifaire. L’humain garde la main sur les cas sensibles (HITL).',
    { x: M + 0.4, y: 5.0, w: CW - 0.8, h: 1.0, fontSize: 14, color: 'FFFFFF', valign: 'top', margin: 0, fontFace: SANS, lineSpacingMultiple: 1.1 });
  chrome(s, 4, 'Axel · 1,5 min');
  s.addNotes('Orateur : Axel — 1,5 min. La règle d’or est le fil rouge de toute la soutenance. La solution automatise toute la chaîne sans déshumaniser : l’agent prépare, l’humain décide et engage.');
}

// ==========================================================================
// SLIDE 5 — Architecture
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Vue d’ensemble', 'Architecture — Option A hybride');
  // top : front
  card(s, M + 2.5, 1.8, CW - 5.0, 0.95, C.tint);
  s.addText('Front Next.js (Netlify) — UI + toute la logique métier (routes /api)', { x: M + 2.5, y: 1.8, w: CW - 5.0, h: 0.95, fontSize: 13.5, bold: true, color: C.tealDk, align: 'center', valign: 'middle', margin: 0, fontFace: SANS });
  // services row
  const svc = [
    ['Agent n8n + Gemma', 'extraction — 1 appel LLM'],
    ['calculer_devis()', 'prix déterministe'],
    ['Supabase', 'PostgreSQL + Auth + RLS'],
    ['OSRM', 'distance routière réelle'],
    ['Resend', 'emails (devis, relances)'],
  ];
  const n = svc.length, gap = 0.3, w = (CW - (n - 1) * gap) / n, y = 3.35, h = 1.55;
  svc.forEach(([t, d], i) => {
    const x = M + i * (w + gap);
    card(s, x, y, w, h, C.white);
    s.addText(t, { x: x + 0.12, y: y + 0.2, w: w - 0.24, h: 0.7, fontSize: 12.5, bold: true, color: C.teal, align: 'center', valign: 'middle', margin: 0, fontFace: SANS });
    s.addText(d, { x: x + 0.12, y: y + 0.88, w: w - 0.24, h: 0.55, fontSize: 10.5, color: C.mute, align: 'center', valign: 'top', margin: 0, fontFace: SANS });
  });
  // highlight
  card(s, M, 5.35, CW, 0.95, C.tint2);
  s.addText([
    { text: 'Un seul appel LLM (extraction). ', options: { bold: true, color: C.tealDk } },
    { text: 'Le nœud Code calcule le prix ET rédige la réponse → rapide (timeout 30 s), fiable (moins de 503), pas de fuite de raisonnement.', options: { color: C.ink } },
  ], { x: M + 0.35, y: 5.35, w: CW - 0.7, h: 0.95, fontSize: 13, valign: 'middle', margin: 0, fontFace: SANS });
  chrome(s, 5, 'Axel · 1 min');
  s.addNotes('Orateur : Axel — 1 min. Montrer le schéma (DIAGRAMMES.md / docs/architecture.svg). Le front est le centre : il orchestre tout. Insister sur le « 1 seul appel LLM ».');
}

// ==========================================================================
// SLIDE 6 — Choix techniques justifiés (NEW renforced)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Défense des choix', 'Choix techniques : pas seulement quoi, mais pourquoi');
  table(s, [
    ['Décision', 'Retenu', 'Critères & pourquoi'],
    ['Orchestration', 'n8n (Option A)', 'Mise en place visuelle et rapide, relances intégrées, courbe d’apprentissage douce — vs Vercel AI SDK.'],
    ['Modèle IA', 'Gemma (gemma-4-31b-it)', 'Coût : gratuit (quota AI Studio). Sorties JSON structurées fiables. Latence basse. Rôle d’assistance seul.'],
    ['Données & Auth', 'Supabase (PostgreSQL)', 'Base + Auth + RLS dans une seule stack → dashboard custom sans surcoût, sécurité par ligne — vs Airtable.'],
    ['Appels LLM', 'Un seul (extraction)', 'Tient dans le timeout 30 s, moins d’erreurs 503, aucune fuite de raisonnement vers le client.'],
    ['Limite observée', '503 ponctuels du LLM', 'Mitigée : retries + prix et réponse indépendants du LLM → le devis sort même si le modèle hésite.'],
  ], { y: 1.78, colW: [2.3, 2.9, CW - 5.2], fontSize: 12 });
  chrome(s, 6, 'Vincent · 2 min');
  s.addNotes('Orateur : Vincent — 2 min. Défendre chaque décision par ses critères (coût, qualité, latence, sorties structurées, compatibilité stack) et assumer la limite observée. Renvoyer à l’« Argumentaire des choix » (L1) pour le détail.');
}

// ==========================================================================
// SLIDE 7 — Fiabilité & garde-fous
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Un système sûr, juste et auditable', 'Fiabilité & garde-fous');
  const y = 1.8, gy = 0.3, w = (CW - 0.4) / 2, h = (4.95 - gy) / 2;
  bulletCard(s, M, y, w, h, 'Prix déterministe', ['calculer_devis() testé ; jamais le LLM.', '1ᵉʳ prix figé (distance réelle OSRM).'], { fs: 12.5 });
  bulletCard(s, M + w + 0.4, y, w, h, 'Tests : types ET limites', ['0 passager, date incohérente, gros volume…', '> 85 passagers → escalade, pas de prix.'], { fs: 12.5 });
  bulletCard(s, M, y + h + gy, w, h, 'RGPD', ['Minimisation, données fictives/minimales.', 'Domaine de démo = aucun envoi réel.'], { fs: 12.5 });
  bulletCard(s, M + w + 0.4, y + h + gy, w, h, 'Prompt injection & HITL', ['Le code ne négocie jamais le prix.', 'Tout cas hors cadre escaladé à un humain.'], { fs: 12.5 });
  chrome(s, 7, 'Vincent · 1 min');
  s.addNotes('Orateur : Vincent — 1 min. Montrer rapidement « npm test » qui passe et /docs (Swagger) : toute l’API est documentée et explorable.');
}

// ==========================================================================
// SLIDE 8 — Prévu vs réalisé (NEW)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Transparence', 'Prévu (L1) vs réalisé (L2/L3)');
  table(s, [
    ['Prévu — dossier de cadrage', 'Réalisé', 'Raison de l’écart'],
    ['Modèle gpt-4o-mini', 'Gemma (gratuit)', 'Quota AI Studio, sorties JSON suffisantes ; le LLM ne fait qu’extraire.'],
    ['Distance estimée (API en P2)', 'Distance routière réelle (OSRM) dès le MVP', 'Service gratuit, sans clé → devis plus juste tout de suite.'],
    ['n8n hébergé (cloud)', 'Tunnel local à URL fixe (0 €)', 'MVP gratuit et suffisant pour la démo ; voie de prod documentée.'],
    ['Espace client = bonus', 'Livré : suivi devis + conversations + messagerie HITL', 'Forte valeur client, faisable simplement dans Supabase.'],
    ['Dashboard simple', 'Dashboard riche : courbe, camembert, export PDF', 'Supabase facilitait un vrai pilotage par la donnée.'],
  ], { y: 1.78, colW: [3.3, 3.5, CW - 6.8], fontSize: 11.5 });
  chrome(s, 8, 'Vincent · 1,5 min');
  s.addNotes('Orateur : Vincent — 1,5 min. Assumer les écarts comme des décisions, pas des oublis. Message : on a tenu le cap (chaîne complète) et certains arbitrages ont amélioré le résultat (distance réelle, bonus livrés).');
}

// ==========================================================================
// SLIDE 9 — Attentes client -> réponses livrées (NEW mapping)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'On répond au besoin', 'Attentes du client → réponses livrées');
  table(s, [
    ['Attente du client', 'Réponse apportée par la solution'],
    ['Capter et centraliser chaque lead', 'Chat + création automatique de la fiche (clients / demandes) en base.'],
    ['Qualifier et détecter les manquants', 'Agent n8n : extraction des paramètres + questions ciblées avant devis.'],
    ['Un devis juste, en quelques secondes', 'calculer_devis() déterministe + distance routière réelle, figé.'],
    ['Une proposition professionnelle', 'PDF généré + email avec boutons Accepter / Refuser.'],
    ['Ne plus oublier les relances', 'Séquences automatiques J+2 / J+3 / J+7 (max 2) + relance manuelle.'],
    ['Donner de la visibilité à la direction', 'Dashboard /admin : KPIs, courbe, camembert des refus, export PDF.'],
    ['Garder l’humain sur les cas sensibles', 'Escalade HITL (> 85 pax) + messagerie bidirectionnelle client ↔ conseiller.'],
  ], { y: 1.78, colW: [4.5, CW - 4.5], fontSize: 11.5 });
  chrome(s, 9, 'Axel · 1,5 min');
  s.addNotes('Orateur : Axel — 1,5 min. Boucler avec la slide 2 : chaque attente initiale a sa réponse concrète. C’est la preuve qu’on a traité le besoin du client, pas seulement construit une démo.');
}

// ==========================================================================
// SLIDE 10 — Section : Ce qui fonctionne (dark divider)
// ==========================================================================
{
  const s = sectionDark('Ce qui fonctionne', 'Démonstration live — le parcours complet, en conditions réelles.');
  s.addText('Parcours prospect  ·  cas complexe (HITL)  ·  espace client  ·  dashboard admin',
    { x: M, y: 4.7, w: CW, h: 0.5, fontSize: 14, color: C.mint, bold: true, margin: 0, fontFace: SANS });
  chrome(s, 10, 'Zakaria');
  s.addNotes('Orateur : Zakaria. Transition vers la démo live. Pré-requis : lancer lancer-n8n-tunnel.bat + reset-complet.sql. Filet de sécurité : un jeu de démo est déjà en base si le chat live échoue.');
}

// ==========================================================================
// SLIDES 11-14 — Démo
// ==========================================================================
function demoSlide(idx, eyebrow, title, scenario, items, note, orateur) {
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, eyebrow, title);
  let y = 1.85;
  if (scenario) {
    card(s, M, y, CW, 0.95, C.tint2);
    s.addText([{ text: '💬  ', options: {} }, { text: scenario, options: { italic: true, color: C.tealDk, bold: true } }],
      { x: M + 0.35, y, w: CW - 0.7, h: 0.95, fontSize: 14, valign: 'middle', margin: 0, fontFace: SANS });
    y += 1.2;
  }
  card(s, M, y, CW, 6.55 - y, C.white);
  bullets(s, items, M + 0.4, y + 0.3, CW - 0.8, 6.2 - y, 14);
  chrome(s, idx, orateur);
  s.addNotes(note);
}
demoSlide(11, 'Démo — le cœur', 'Parcours prospect → devis',
  'Lyon → Annecy, 50 personnes, aller-retour le 12 juillet 2026.',
  ['La barre « Votre demande » se remplit en direct ; l’agent demande l’email.',
   'Carte devis affichée + email reçu (PDF joint + boutons Accepter / Refuser).',
   'Phrase clé : le prix vient du moteur, pas de l’IA ; la distance est la vraie distance routière.'],
  'Orateur : Zakaria — 2 min. Si Gemma renvoie un 503 ponctuel, renvoyer le message. Garder le filet : devis de démo déjà en base.', 'Zakaria · 2 min');
demoSlide(12, 'Démo — savoir dire non', 'Cas complexe → escalade humaine (HITL)',
  'Marseille → Lille, 120 personnes.',
  ['Au-delà de 85 passagers → message d’escalade, aucun devis automatique.',
   'La demande devient un « cas complexe » transmis à un humain avec tout le contexte.',
   'Montrer que dire « non » à l’automatisation totale est un gage de fiabilité, pas une limite.'],
  'Orateur : Zakaria — 1 min. C’est un point fort : le système connaît ses limites et protège l’engagement commercial.', 'Zakaria · 1 min');
demoSlide(13, 'Démo — côté client', 'De l’email à l’espace client', null,
  ['Bouton « Accepter » d’un email sans compte → inscription pré-remplie.',
   'Espace client : Mes devis (PDF, accepter/refuser avec motifs), Mes conversations, Mon compte.',
   '« Refuser » depuis l’email → page de motifs → relances stoppées automatiquement.'],
  'Orateur : Zakaria — 1,5 min. Souligner le différenciateur (bonus livré) : le prospect suit ses devis et son historique.', 'Zakaria · 1,5 min');
demoSlide(14, 'Démo — pilotage', 'Dashboard admin', null,
  ['KPIs, courbe d’évolution, camembert des motifs de refus, filtre par dates, export PDF.',
   'Cas complexe → devis sur-mesure (prix HT → aperçu TVA/TTC → envoi) → rejoint le pipeline.',
   'Messagerie HITL bidirectionnelle ; bouton « Lancer les relances dues ».'],
  'Orateur : Zakaria — 2 min. C’est la preuve du pilotage par la donnée : la direction voit tout en temps réel.', 'Zakaria · 2 min');

// ==========================================================================
// SLIDE 15 — Limites, MVP vs prod & coûts
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Limites assumées', 'Ce qu’on assume — et le passage en production');
  bulletCard(s, M, 1.85, 5.5, 4.5, 'Limites & arbitrages', [
    'n8n en tunnel local = choix MVP (0 €) : dépend du PC allumé.',
    'Prototype cohérent de bout en bout, pas une app de production (cas limites non exhaustifs).',
    'Péages forfaitaires au MVP (paramétrables, affinés en P2).',
  ], { fs: 12.5 });
  // coûts (3 cartes)
  const cx = M + 5.8, cw = CW - 5.8;
  s.addText('MVP vs production — coût mensuel', { x: cx, y: 1.85, w: cw, h: 0.4, fontSize: 14.5, bold: true, color: C.tealDk, margin: 0, fontFace: SANS });
  const costs = [['~0 €', 'MVP / soutenance (tunnel local)'], ['~0-1 €', 'Prod « éco » 24/7 (n8n Oracle Free)'], ['~30 €', 'Prod « sereine » — recommandée']];
  const ch = 1.12, cgap = 0.18; let cy = 2.4;
  costs.forEach(([v, d], i) => {
    card(s, cx, cy, cw, ch, i === 2 ? C.tint2 : C.tint);
    s.addText(v, { x: cx + 0.2, y: cy, w: 2.1, h: ch, fontSize: 26, bold: true, color: C.teal, align: 'center', valign: 'middle', margin: 0, fontFace: SERIF });
    s.addText(d, { x: cx + 2.4, y: cy, w: cw - 2.6, h: ch, fontSize: 12.5, color: C.ink, valign: 'middle', margin: 0, fontFace: SANS });
    cy += ch + cgap;
  });
  chrome(s, 15, 'Vincent · 1,5 min');
  s.addNotes('Orateur : Vincent — 1,5 min. Assumer franchement : la cohérence du parcours prime sur la perfection d’un maillon. Le seul élément à changer pour la prod : héberger n8n. 4 scénarios chiffrés dans COUTS_ET_PROD.md.');
}

// ==========================================================================
// SLIDE 16 — Ouverture V2 & passation (NEW)
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Et après', 'Ouverture vers une V2 & passation livrée');
  const w = (CW - 0.5) / 2, y = 1.8, h = 4.95;
  // Ouverture
  card(s, M, y, w, h, C.white);
  s.addText('Ouverture — vers une version 2', { x: M + 0.3, y: y + 0.25, w: w - 0.6, h: 0.45, fontSize: 15, bold: true, color: C.tealDk, margin: 0, fontFace: SANS });
  bullets(s, [
    'P1 — héberger n8n 24/7 (chat indépendant du PC) + Supabase Pro (base toujours active).',
    'P2 — distance & péages enrichis par trajet ; observabilité coût/tokens par devis ; notifications internes (urgent, cas complexe).',
    'P3 — canal WhatsApp officiel ; A/B testing des relances ; rôles fins (commercial / manager).',
  ], M + 0.32, y + 0.8, w - 0.64, h - 1.0, 12);
  // Passation
  card(s, M + w + 0.5, y, w, h, C.tint);
  s.addText('Passation déjà livrée (L3)', { x: M + w + 0.8, y: y + 0.25, w: w - 0.6, h: 0.45, fontSize: 15, bold: true, color: C.tealDk, margin: 0, fontFace: SANS });
  bullets(s, [
    'Procédure repreneur : relancer le projet en local en 5 min.',
    'Procédure équipe NeoTravel : termes clés expliqués en clair + usage quotidien.',
    'Maintenance documentée : modifier pricing, emails, statuts, relances.',
    'Backlog P1/P2/P3 + README, API Swagger (/docs), TypeDoc.',
  ], M + w + 0.82, y + 0.8, w - 0.64, h - 1.6, 12);
  s.addText('→ La solution peut vivre et évoluer sans ses créateurs.', { x: M + w + 0.82, y: y + h - 0.7, w: w - 1.0, h: 0.5, fontSize: 12.5, italic: true, bold: true, color: C.teal, margin: 0, fontFace: SANS });
  chrome(s, 16, 'Vincent · 1,5 min');
  s.addNotes('Orateur : Vincent — 1,5 min. Deux messages : (1) le projet a une suite claire (backlog priorisé), (2) il est déjà reprenable grâce à la doc de passation L3. Répond au critère « rendre la solution reprenable ».');
}

// ==========================================================================
// SLIDE 17 — Clôture (dark)
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
  s.addText('Merci — nous sommes à vous pour vos questions.', { x: M, y: 6.45, w: CW, h: 0.5, fontSize: 16, bold: true, color: C.mint, margin: 0, fontFace: SANS });
  chrome(s, 17, 'Toute l’équipe + Q&R');
  s.addNotes('Orateur : toute l’équipe — puis 10-15 min de Q&R. Chaque membre reste disponible sur son périmètre (voir l’annexe : questions probables et réponses prêtes).');
}

// ==========================================================================
// SLIDE 18 — Annexe Q&R
// ==========================================================================
{
  const s = p.addSlide();
  s.background = { color: 'FFFFFF' };
  heading(s, 'Annexe', 'Questions probables & réponses prêtes');
  table(s, [
    ['Question du jury', 'Réponse'],
    ['Pourquoi pas le LLM pour le prix ?', 'Reproductibilité, auditabilité, zéro hallucination tarifaire ; le LLM ne fait qu’extraire.'],
    ['C’est vraiment en ligne ?', 'Oui : front + base + emails 24/7 ; seul l’agent (chat) dépend du tunnel — assumé et documenté.'],
    ['Et si Gemma sature (503) ?', 'Retries automatiques ; le moteur de prix et la réponse ne dépendent pas du LLM.'],
    ['Combien ça coûterait en vrai ?', '4 scénarios chiffrés : ~0 € en éco, ~30 €/mois en prod sereine (COUTS_ET_PROD.md).'],
    ['Comment un autre dev reprend le projet ?', 'Doc de passation (L3) : 5 min pour relancer en local ; Swagger / TypeDoc pour le détail.'],
    ['Comment changer un tarif ?', 'pricing/matrices.js (+ pricing_config), relancer npm test, reporter dans n8n. Jamais via le LLM.'],
    ['Et la RGPD ?', 'Minimisation, données fictives/minimales, domaine de démo sans envoi réel, RLS par utilisateur.'],
  ], { y: 1.78, colW: [4.4, CW - 4.4], fontSize: 11 });
  chrome(s, 18, null);
  s.addNotes('Annexe de secours pour le Q&R : une réponse courte et défendable par question fréquente.');
}

// ==========================================================================
const out = path.join(__dirname, process.argv[2] || 'Support-de-soutenance-NeoTravel.pptx');
p.writeFile({ fileName: out }).then(() => console.log('OK ->', out));
