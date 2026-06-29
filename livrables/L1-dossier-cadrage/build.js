// build.js — Génère le Dossier de cadrage (Livrable 1) NeoTravel en .docx
// Lancer : node build.js  (depuis ce dossier). Sortie : Dossier-de-cadrage-NeoTravel.docx
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, TableOfContents, PageNumber, PageBreak, TabStopType, TabStopPosition,
  VerticalAlign,
} = require('docx');

// ---- Palette / constantes ----
const ACCENT = '0E7A66';      // teal foncé (titres)
const ACCENT_DK = '0A5346';   // teal très foncé
const HEAD_FILL = 'D9F0EA';   // fond entête de tableau
const ZEBRA = 'F2F8F6';       // lignes alternées
const GREY = '666666';
const CW = 9360;              // largeur contenu (US Letter, marges 1")

// ---- Helpers ----
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P = (t, opts = {}) => new Paragraph({ spacing: { after: 120 }, children: Array.isArray(t) ? t : [new TextRun({ text: t, ...opts })] });
const run = (text, opts = {}) => new TextRun({ text, ...opts });
const bullet = (t) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: Array.isArray(t) ? t : [new TextRun(t)] });
const numbered = (t, ref = 'num') => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: Array.isArray(t) ? t : [new TextRun(t)] });
const spacer = () => new Paragraph({ spacing: { after: 80 }, children: [new TextRun('')] });

const border = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

function cell(content, { w, head = false, fill, bold = false, align = AlignmentType.LEFT } = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((c) =>
    typeof c === 'string'
      ? new Paragraph({ alignment: align, spacing: { after: 0 }, children: [new TextRun({ text: c, bold: head || bold, color: head ? ACCENT_DK : '000000' })] })
      : c
  );
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: { fill: head ? HEAD_FILL : (fill || 'FFFFFF'), type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    verticalAlign: VerticalAlign.CENTER,
    children: paras,
  });
}

function makeTable(headers, rows, widths, { zebra = true } = {}) {
  const headRow = new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { w: widths[i], head: true })) });
  const bodyRows = rows.map((r, ri) =>
    new TableRow({ children: r.map((c, i) => cell(c, { w: widths[i], fill: zebra && ri % 2 ? ZEBRA : 'FFFFFF' })) })
  );
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, borders, rows: [headRow, ...bodyRows] });
}

// Encadré (callout) via paragraphe avec bordure colorée
function callout(label, text, color = ACCENT) {
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color, space: 8 } },
    shading: { fill: ZEBRA, type: ShadingType.CLEAR },
    children: [new TextRun({ text: label + ' ', bold: true, color: ACCENT_DK }), new TextRun(text)],
  });
}

// =====================================================================
//  CONTENU
// =====================================================================
const logo = fs.readFileSync(path.join(__dirname, 'assets', 'logo-neotravel.png'));
const wf1 = fs.readFileSync(path.join(__dirname, 'wireframes', '01-landing-lowfi.png'));
const wf2 = fs.readFileSync(path.join(__dirname, 'wireframes', '02-chat-lowfi.png'));
const wfImg = (data, name) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [
  new ImageRun({ type: 'png', data, transformation: { width: 620, height: 470 }, altText: { title: name, description: name, name } }),
] });
const caption = (t) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: t, italics: true, size: 18, color: GREY })] });

const cover = [
  new Paragraph({ spacing: { before: 1200, after: 200 }, alignment: AlignmentType.CENTER, children: [
    new ImageRun({ type: 'png', data: logo, transformation: { width: 300, height: 166 }, altText: { title: 'NeoTravel', description: 'Logo NeoTravel', name: 'logo' } }),
  ] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 80 }, children: [new TextRun({ text: 'DOSSIER DE CADRAGE', bold: true, size: 56, color: ACCENT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Automatisation des processus commerciaux', size: 30, color: '333333' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: 'NEO TRAVEL', bold: true, size: 28, color: ACCENT_DK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Livrable 1 — Rendu du 24 juin 2026', italics: true, color: GREY, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Équipe projet : Axel MOMPER · Vincent CONTER · Zakaria TOUAMI', size: 22, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Cas d’étude MBA1 — NeoTravel · InterstellLabs', size: 20, color: GREY })] }),
  new Paragraph({ children: [new PageBreak()] }),
];

const toc = [
  new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'Table des matières', bold: true, size: 32, color: ACCENT })] }),
  new TableOfContents('Sommaire', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),
];

const body = [];

// 1. CONTEXTE & JUSTIFICATION
body.push(H1('1. Contexte & justification'));
body.push(P('NeoTravel est une PME fondée en 2010, spécialisée dans le transport de personnes en groupe (particuliers, associations, collectivités, entreprises). Son modèle repose sur l’intermédiation : l’entreprise ne possède pas de flotte propre, mais orchestre la mise en relation entre les clients et un réseau d’autocaristes partenaires qualifiés. Sa valeur ajoutée réside dans sa capacité à comprendre un besoin, qualifier la demande, négocier les meilleures conditions et sécuriser la prestation.'));
body.push(P([run('NeoTravel reçoit '), run('environ 60 leads par jour', { bold: true }), run(' via son site et ses campagnes. L’acquisition n’est donc pas le problème : l’enjeu est la '), run('sous-exploitation du flux existant', { bold: true }), run('. Le traitement manuel crée un goulot d’étranglement structurel.')]));
body.push(H2('Les frictions identifiées'));
body.push(P([run('Friction 1 — Priorisation commerciale. ', { bold: true, color: ACCENT_DK }), run('Les commerciaux étant commissionnés, ils priorisent naturellement les demandes à fort potentiel. Des leads acquis via des campagnes payantes (Google Ads) sont donc peu ou pas recontactés, ce qui représente un manque à gagner direct et des investissements publicitaires gaspillés.')]));
body.push(P([run('Friction 2 — Acquisition bridée. ', { bold: true, color: ACCENT_DK }), run('NeoTravel limite volontairement ses campagnes : sans automatisation, plus de leads signifie surtout plus de pression opérationnelle, pas plus de chiffre d’affaires.')]));
body.push(callout('Enjeu :', 'mieux exploiter le flux existant — traiter chaque opportunité avec méthode, accélérer les réponses, automatiser les relances, et libérer les commerciaux pour les tâches à forte valeur humaine (conseil, négociation, cas complexes).'));

// 2. OBJECTIF
body.push(H1('2. Objectif du projet'));
body.push(P([run('Concevoir et livrer un prototype cohérent qui '), run('automatise l’ensemble du cycle commercial', { bold: true }), run(' de NeoTravel, de la captation du lead jusqu’au dashboard de pilotage, '), run('sans déshumaniser', { bold: true }), run(' la relation client. L’automatisation prend en charge les tâches répétitives et fiabilise les processus ; l’humain reste au cœur des situations complexes.')]));
body.push(P([run('L’outil est pensé comme un '), run('copilote', { bold: true }), run(' : un facilitateur de décision et un gain de temps sur les tâches répétitives. Il prépare et propose ; le commercial garde la main sur le conseil, la négociation et l’engagement.')]));
body.push(P([run('Principe directeur : ', { bold: true }), run('l’IA décide et oriente, le code exécute. Le prix d’un devis — engagement commercial — est '), run('toujours calculé par un moteur de règles déterministe', { bold: true, color: ACCENT_DK }), run(', jamais par le raisonnement du modèle de langage.')]));

// 3. DIAGNOSTIC & PRIORISATION
body.push(H1('3. Diagnostic & priorisation'));
body.push(P('Évaluation des problèmes (échelle 1 à 5) puis des solutions, pour positionner le MVP sur ce qui crée le plus de valeur dans le temps imparti.'));
body.push(H2('3.1 Matrice de priorisation des problèmes'));
body.push(makeTable(
  ['Problème', 'Impact CA', 'Impact client', 'Urgence', 'Complexité', 'Priorité'],
  [
    ['Leads payants non recontactés', '5', '4', '5', '2', 'P1'],
    ['Délais de réponse / devis lents', '4', '5', '4', '3', 'P1'],
    ['Relances manuelles oubliées', '4', '3', '4', '2', 'P1'],
    ['Tarification manuelle (lente, erreurs)', '3', '3', '3', '3', 'P2'],
    ['Manque de visibilité direction', '3', '1', '2', '3', 'P2'],
    ['Acquisition bridée par la charge', '4', '1', '2', '4', 'P3'],
    ['Cas complexes mal tracés', '2', '3', '2', '4', 'P3'],
  ],
  [2860, 1100, 1300, 1100, 1300, 1700],
));
body.push(P([run('Lecture : ', { italics: true }), run('plus l’impact (CA/client/urgence) est fort et la complexité faible, plus la priorité est haute. Les trois problèmes P1 forment le cœur du MVP.', { italics: true, color: GREY })]));
body.push(H2('3.2 Matrice de priorisation des solutions'));
body.push(makeTable(
  ['Solution', 'Valeur métier', 'Faisabilité', 'Coût', 'Délai', 'Priorité'],
  [
    ['Moteur de devis déterministe calculer_devis()', '5', '5', 'Faible', 'Court', 'P1'],
    ['Centralisation CRM (base structurée)', '5', '4', 'Faible', 'Court', 'P1'],
    ['Relances automatisées (n8n)', '4', '4', 'Faible', 'Court', 'P1'],
    ['Escalade humaine (HITL)', '4', '5', 'Faible', 'Court', 'P1'],
    ['Agent IA de qualification (landing/chat)', '4', '3', 'Moyen', 'Moyen', 'P2'],
    ['Génération automatique du devis PDF', '3', '4', 'Faible', 'Court', 'P2'],
    ['Dashboard de pilotage', '3', '4', 'Faible', 'Moyen', 'P2'],
  ],
  [3460, 1300, 1300, 1100, 1100, 1100],
));

// 4. AS-IS / TO-BE
body.push(H1('4. Cartographie As-Is / To-Be'));
body.push(H2('4.1 Processus actuel (As-Is) — majoritairement manuel'));
body.push(makeTable(
  ['Étape', 'Aujourd’hui', 'Point de douleur'],
  [
    ['1. Demande', 'Formulaire web', 'Données partielles, non qualifiées'],
    ['2. Qualification', 'Lecture par un commercial', 'Chronophage, dépend de la disponibilité'],
    ['3. Tarification', 'Grille appliquée à la main', 'Lent, risque d’erreur, non auditable'],
    ['4. Devis', 'Rédigé manuellement', 'Délai, format hétérogène'],
    ['5. Envoi', 'Email manuel', 'Retard à l’envoi'],
    ['6. Relances', 'Selon disponibilité', 'Souvent oubliées'],
    ['7. Suivi/pilotage', 'Aucun outil consolidé', 'Direction sans visibilité'],
  ],
  [1700, 3500, 4160],
));
body.push(H2('4.2 Processus cible (To-Be) — automatisé ET supervisé'));
body.push(makeTable(
  ['Étape', 'Automatisé', 'Intervention / supervision humaine'],
  [
    ['1. Captation', 'Landing conversationnelle : le prospect exprime son besoin en langage naturel', 'Bascule vers un conseiller si le prospect le demande'],
    ['2. Qualification', 'L’agent structure la demande et détecte les champs manquants', 'Revue humaine des demandes ambiguës ou atypiques'],
    ['3. Tarification', 'Tool déterministe calculer_devis() — prix exact et auditable', 'Validation des devis hors seuils (montant élevé, trajet atypique, > 85 pax)'],
    ['4. Devis', 'Génération automatique d’un PDF formaté', 'Relecture avant envoi pour les cas sensibles'],
    ['5. Envoi', 'Envoi (ou simulation) par email pour les devis standard', 'Validé par un commercial pour les offres engageantes'],
    ['6. Relances', 'Séquences automatiques : J+2 / J+3 / J+7, max 2', 'Le commercial reprend la main sur les leads chauds (relation, négociation)'],
    ['7. Pilotage', 'CRM à jour + dashboard direction avec alertes', 'La direction décide et arbitre ; cas complexes escaladés avec contexte'],
  ],
  [1400, 4260, 3700],
));
body.push(callout('Digitaliser sans déshumaniser :', 'l’outil est un facilitateur de décision et un gain de temps sur les tâches répétitives — pas un pilote automatique. L’agent prépare la décision ; l’humain décide, négocie et engage NeoTravel. À chaque étape sensible, un humain garde la main.'));
body.push(H2('4.3 La place de l’humain'));
body.push(P('L’automatisation libère du temps sur le répétitif pour le réinvestir là où l’humain crée le plus de valeur :'));
['Conseil et expertise sur les demandes complexes ou atypiques.',
 'Négociation et sécurisation des gros dossiers à fort enjeu.',
 'Validation des engagements commerciaux (devis hors seuils, offres sensibles).',
 'Relation client : reprise des leads chauds, gestion des imprévus.',
 'Arbitrages et décisions de pilotage côté direction.',
].forEach((t) => body.push(bullet(t)));
body.push(P([run('Le commercial reste le '), run('décideur', { bold: true }), run(' ; l’agent et les outils sont ses '), run('copilotes', { bold: true }), run('.')]));

// 5. PERIMETRE
body.push(H1('5. Périmètre'));
body.push(P('Le livrable est un prototype cohérent qui démontre toute la chaîne, pas une application prête pour la production. La cohérence du parcours prime sur la perfection d’un maillon.'));
body.push(H2('Inclus (les 10 fonctions attendues)'));
[
  'Captation d’un lead / demande client',
  'Centralisation automatique dans un outil de suivi commercial (CRM)',
  'Qualification de la demande',
  'Détection des informations manquantes',
  'Calcul automatique d’un devis (moteur déterministe)',
  'Génération d’un devis / proposition (PDF)',
  'Envoi (ou simulation d’envoi) du devis au client',
  'Système de relances client',
  'Suivi du pipeline commercial',
  'Reporting des indicateurs commerciaux (dashboard)',
].forEach((t) => body.push(numbered(t)));
body.push(H2('Exclu (hors périmètre de la semaine)'));
['Application prête pour la production / robustesse industrielle',
 'Gestion exhaustive de tous les cas limites',
 'Interface parfaitement designée (wireframes « rough » suffisent)',
 'CRM analytique complet (une vue/dashboard simple suffit)',
 'WhatsApp officiel (coût + vérification Meta) — email par défaut',
 'Paiement, réservation partenaire et coordination logistique aval',
 'Données personnelles réelles (fictives/minimales uniquement)',
].forEach((t) => body.push(bullet(t)));
body.push(callout('Différenciateur (bonus, hors cœur MVP) :', 'espace de connexion lead (/espace-client) permettant au prospect de suivre ses devis et son historique de conversation — gardé léger, avec vigilance RGPD.'));

// 6. ARCHITECTURE & MODELE DE DONNEES
body.push(H1('6. Architecture cible & modèle de données'));
body.push(P([run('Architecture retenue (Option A hybride — n8n au cœur) : ', { bold: true }), run('une landing web + chatbot transmet la demande à un agent IA orchestré dans n8n. L’agent mène la conversation puis appelle des outils pour agir ; le calcul du prix est délégué à un nœud Code déterministe. Le cerveau de l’agent reste dans n8n — l’application Next.js n’est qu’UI + accès aux données.')]));
body.push(new Paragraph({ spacing: { before: 80, after: 60 }, shading: { fill: 'F4F4F4', type: ShadingType.CLEAR }, children: [
  new TextRun({ text: 'App Next.js : /  (landing + chat)   ·   /admin  (dashboard)   ·   /espace-client  (portail lead)', font: 'Consolas', size: 18 }),
] }));
body.push(new Paragraph({ spacing: { after: 120 }, shading: { fill: 'F4F4F4', type: ShadingType.CLEAR }, children: [
  new TextRun({ text: 'Chat → Agent IA (n8n) → [ lookup règles · calculer_devis() · devis PDF · écriture Supabase · relances ] → Supabase (Postgres + Auth + RLS)', font: 'Consolas', size: 18 }),
] }));
body.push(P([run('Socle de données : ', { bold: true }), run('Supabase (PostgreSQL managé) avec Auth et Row Level Security. Le dashboard de pilotage est une page /admin de l’app Next.js qui lit Supabase (mise à jour temps réel via realtime). Relances et notifications via n8n (Schedule Trigger + email Resend/Brevo).')]));
body.push(H2('Modèle de données (tables Supabase / PostgreSQL)'));
body.push(makeTable(
  ['Table', 'Champs principaux'],
  [
    ['clients', 'id, email, type_client, nom/société, téléphone, consentement, créé_le — lié à Supabase Auth'],
    ['demandes', 'id, client_id (FK), départ, destination, date_départ/retour, nb_passagers, type_trajet, urgence, distance_km, statut, score_complétude, commentaire'],
    ['matrices', 'grille km, coef saison, coef date, coef capacité, options, TVA, marge — paramètres pilotables'],
    ['devis', 'id, demande_id (FK), montant HT/TTC, lignes de calcul, coefficients, statut, lien PDF, date_envoi, prochaine_relance, nb_relances'],
    ['relances', 'id, devis_id (FK), type (J+2/J+3/J+7), date planifiée, statut, date_envoi'],
    ['conversations', 'id, client_id (FK), messages (rôle, contenu, horodatage) — historique du chat'],
  ],
  [1700, 7660],
));
body.push(P([run('Sécurité : ', { bold: true }), run('Row Level Security (RLS) — un client n’accède qu’à ses propres demandes, devis et conversations ; les rôles admin accèdent au pipeline complet. Authentification via Supabase Auth (magic link) pour /admin et le portail /espace-client. (Les 4 tables minimales demandées — demandes, matrices, devis, relances — sont couvertes ; clients et conversations sont l’extension qui rend possible le portail lead.)')]));
body.push(H2('Statuts commerciaux (machine à états)'));
body.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Nouveau lead → Demande incomplète → Demande qualifiée → Devis envoyé → Relance 1/2 → Accepté / Refusé / Cas complexe transmis → Clôturé', font: 'Consolas', size: 20 })] }));

// 7. STACK & LLM
body.push(H1('7. Choix de stack & modèle LLM'));
body.push(H2('7.1 Stack — Option A hybride (n8n + Supabase) retenue'));
body.push(P('L’équipe vise un résultat solide et maîtrisé sans surcharge de code. n8n offre une orchestration visuelle à courbe d’apprentissage douce ; la compétence en code de l’équipe est mobilisée là où elle compte : le nœud Code qui héberge calculer_devis() et l’app Next.js (front + dashboard).'));
body.push(P([run('Données sur Supabase (et non Airtable) : ', { bold: true }), run('comme une interface front est de toute façon nécessaire (landing + chat), Supabase apporte dans une seule stack la base relationnelle, l’authentification (admin + portail lead) et la sécurité par ligne (RLS) — le dashboard custom n’est alors plus un surcoût. Justification détaillée dans l’« Argumentaire des choix » (décision n°4).')]));
body.push(makeTable(
  ['Brique', 'Outil retenu', 'Justification'],
  [
    ['Interface prospect', 'Next.js / React (Vercel)', 'Hébergement gratuit, UI de chat branchée sur webhook n8n'],
    ['Orchestration agent', 'n8n — nœud AI Agent', 'Cerveau centralisé, visuel, rapide à mettre en place'],
    ['Calcul du prix', 'Nœud Code n8n (JS)', 'Déterministe, testé en isolation, aucun appel LLM'],
    ['Données / Auth', 'Supabase (PostgreSQL)', 'Base relationnelle + Auth + RLS, lue par n8n et par l’app'],
    ['Auth & portail lead', 'Supabase Auth + RLS', 'Login admin + espace client (suivi devis / conversations)'],
    ['Relances / emails', 'n8n Schedule + Resend/Brevo', 'Planification simple, envoi d’emails de test'],
    ['Pilotage', 'Page /admin (React → Supabase)', 'Dashboard intégré à l’app, KPIs en temps réel'],
  ],
  [2100, 2700, 4560],
));
body.push(H2('7.2 Modèle LLM — OpenAI gpt-4o-mini'));
body.push(P('Le modèle n’a qu’un rôle d’assistance (qualifier, extraire des paramètres structurés, reformuler) — il ne calcule jamais le prix. Le meilleur modèle n’est donc pas le plus puissant, mais le plus adapté au bon coût.'));
body.push(makeTable(
  ['Critère', 'Évaluation de gpt-4o-mini'],
  [
    ['Coût', 'Très faible (~0,15 €/M tokens entrée) : le crédit 10-15 € couvre des milliers de tests'],
    ['Sorties structurées', 'Mode JSON Schema strict natif : extraction fiable des paramètres avant calculer_devis()'],
    ['Latence', 'Basse — chat fluide'],
    ['Compatibilité n8n', 'Intégration OpenAI la mieux documentée dans le nœud AI Agent'],
    ['Adéquation', 'Largement suffisant pour qualifier/extraire ; alternatives plan B : Gemini Flash, Claude Haiku'],
  ],
  [2200, 7160],
));

// 8. ROADMAP 3 PHASES
body.push(H1('8. Roadmap en 3 phases'));
body.push(makeTable(
  ['Phase', 'Contenu', 'Statut MVP'],
  [
    ['1 — Structurer', 'Socle de données (CRM), statuts, moteur calculer_devis() testé', 'Cœur du MVP de la semaine'],
    ['2 — Automatiser', 'Devis PDF, envoi email, relances n8n, dashboard de pilotage', 'Traversée fine dans le MVP'],
    ['3 — IA', 'Agent conversationnel (landing/chat), qualification, détection des manquants, personnalisation des relances, escalade HITL', 'Démontré de bout en bout'],
  ],
  [1900, 5760, 1700],
));
body.push(callout('Position du MVP :', 'la semaine couvre intégralement la Phase 1 et démontre une traversée complète des Phases 2 et 3 (prototype de bout en bout). L’industrialisation (robustesse, cas limites exhaustifs, hébergement complet) est renvoyée au post-MVP.'));

// 9. SCENARIOS DE CONVERSATION
body.push(H1('9. Scénarios de conversation de l’agent'));
body.push(P('L’agent collecte les informations requises, détecte les manquantes, puis appelle les outils. Flux simplifié :'));
body.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Accueil → collecte (départ, destination, dates, nb passagers, options) → champs manquants ? → oui : reformuler/demander · non : calculer_devis() → devis PDF → envoi → relance planifiée. Cas atypique → escalade humaine.', font: 'Consolas', size: 20 })] }));
body.push(H2('Les 7 scénarios démontrés'));
body.push(makeTable(
  ['Scénario', 'Comportement attendu'],
  [
    ['1. Demande simple complète', 'Qualifiée → devis calculé → proposition générée → pipeline à jour'],
    ['2. Demande incomplète', 'Détection des champs manquants → demande de complément avant devis'],
    ['3. Demande urgente', 'Priorité élevée, notification interne, majoration / validation humaine'],
    ['4. Devis sans réponse', 'Relances J+2 (urgent) ou J+3/J+7 (standard), max 2 puis clôturé'],
    ['5. Devis accepté', 'Statut « gagné », arrêt des relances, transmission équipe réservation'],
    ['6. Devis refusé', 'Statut mis à jour, email de courtoisie, traçabilité conservée'],
    ['7. Cas complexe', 'Refus d’automatisation totale → escalade humaine avec contexte (HITL)'],
  ],
  [2600, 6760],
));

// 10. CONTRAINTES
body.push(H1('10. Contraintes'));
body.push(makeTable(
  ['Type', 'Contrainte'],
  [
    ['Métier', 'Dépendance aux partenaires autocaristes ; saisonnalité forte ; qualité de service à sécuriser'],
    ['Tarification', 'Multi-critères (distance, capacité, saison, urgence, options) — doit rester auditable'],
    ['Budget', 'Outils < 1000 €/mois (réaliste PME) ; crédit IA 10-15 € par groupe, plafonné'],
    ['Conformité', 'RGPD : minimisation, données fictives/minimales, pas de PII en clair dans les logs'],
    ['Délai', 'Une semaine ; remise L1 le 24/06, prototype le 29/06, soutenance le 01/07'],
    ['Réglementation', 'Temps de conduite/repos, licences, assurances (à intégrer côté partenaires)'],
  ],
  [1700, 7660],
));

// 11. HYPOTHESES
body.push(H1('11. Hypothèses majeures'));
body.push(P('Les zones non spécifiées par les règles de pricing sont tranchées par des hypothèses documentées (à valider au follow-up du 25/06), marquées [HYPOTHESE] dans le code.'));
[
  'Formule au-delà de 180 km : distance × 2 × 2,5 € (le ×2 = retour à vide du car).',
  'Seuils d’anticipation : < 7 j = DD_PRIORITAIRE (+10 %), 7-29 j = DD_URGENT (+5 %), 30-89 j = DD_NORMAL (-5 %), ≥ 90 j = DD_3MOISETPLUS (-10 %).',
  'Ordre de calcul : base → coefficients (additifs) → options → marge +15 % → TVA 10 %.',
  'Distance saisie/estimée par le prospect au MVP ; API d’itinéraire en évolution (P2).',
  'Péages : forfait 0 € par défaut au MVP, paramétrable dans la table Matrices.',
  'Modèle LLM : gpt-4o-mini ; données de test fictives uniquement.',
].forEach((t) => body.push(bullet(t)));

// 12. CRITERES DE SUCCES / KPIs
body.push(H1('12. Critères de succès & KPIs'));
body.push(makeTable(
  ['Indicateur', 'Cible / sens'],
  [
    ['Part des leads traités', 'Tendre vers 100 % (aucun lead payant sans réponse)'],
    ['Délai demande → devis envoyé', 'Réduction forte vs traitement manuel (objectif : minutes)'],
    ['Taux de conversion devis → accepté', 'À suivre et augmenter'],
    ['Devis générés / envoyés / acceptés / refusés', 'Comptage dans le dashboard'],
    ['Relances déclenchées / en attente', 'Aucune relance oubliée'],
    ['Demandes urgentes en cours', 'Visibilité temps réel pour la direction'],
    ['Coût IA par devis (tokens) [bonus]', 'Maîtrise du budget'],
  ],
  [3800, 5560],
));

// 13. ESTIMATION DES GAINS (ROI)
body.push(H1('13. Estimation des gains (ROI)'));
body.push(P('Estimation illustrative du retour attendu, à affiner avec les données réelles de NeoTravel. Principe : l’automatisation ne crée pas de demande — elle exploite mieux le flux existant (≈ 60 leads/jour), aujourd’hui en partie perdu faute de capacité de traitement.'));
body.push(H2('13.1 Modèle quantitatif (hypothèses prudentes)'));
body.push(makeTable(
  ['Hypothèse', 'Valeur'],
  [
    ['Leads entrants par mois (~60/jour)', '≈ 1 250'],
    ['Part aujourd’hui non / mal traitée [HYPOTHÈSE]', '30 %'],
    ['Leads récupérés / mois grâce à l’automatisation', '≈ 300'],
    ['Taux de transformation devis → signé [HYPOTHÈSE]', '20 %'],
    ['Prestations signées supplémentaires / mois', '≈ 60'],
    ['Panier moyen HT par prestation [HYPOTHÈSE]', '1 500 €'],
    ['Marge commerciale', '15 %'],
    ['→ Marge additionnelle estimée / mois', '≈ 13 500 €'],
    ['→ Marge additionnelle estimée / an', '≈ 162 000 €'],
  ],
  [6260, 3100],
));
body.push(H2('13.2 Coût de la solution & payback'));
body.push(P([run('Coût des outils (Supabase, n8n, Vercel, emailing, crédit IA) : '), run('< 1 000 €/mois', { bold: true }), run(' (≈ 12 000 €/an), conforme à la cible PME. Rapporté au gain estimé, le '), run('retour sur investissement est atteint en moins d’un mois', { bold: true, color: ACCENT_DK }), run('.')]));
body.push(H2('13.3 Gains qualitatifs'));
['Aucun lead payant laissé sans réponse (fin du manque à gagner de la Friction 1).',
 'Temps commercial libéré : les devis standard et les relances ne sont plus manuels.',
 'Campagnes d’acquisition « débridables » sans saturer les équipes (Friction 2).',
 'Réponses plus rapides → meilleur taux de transformation.',
 'Visibilité direction en temps réel (pilotage par la donnée).',
].forEach((t) => body.push(bullet(t)));
body.push(callout('Note :', 'chiffres illustratifs fondés sur des hypothèses à valider avec les données réelles de NeoTravel ; l’objectif est de montrer l’ordre de grandeur — un ROI très favorable même avec des hypothèses prudentes.'));

// 14. PARTIES PRENANTES
body.push(H1('14. Parties prenantes'));
body.push(makeTable(
  ['Partie prenante', 'Rôle / intérêt'],
  [
    ['Équipe commerciale', 'Bénéficiaire : moins de tâches répétitives, plus de temps à forte valeur'],
    ['Agents de réservation', 'Reçoivent les dossiers gagnés et les cas complexes escaladés'],
    ['Direction commerciale', 'Pilotage du pipeline et des performances via le dashboard'],
    ['Prospects', 'Réponse rapide, expérience fluide et rassurante'],
    ['Partenaires autocaristes', 'Mobilisés en aval (hors périmètre prototype)'],
    ['Équipe projet', 'Axel MOMPER, Vincent CONTER, Zakaria TOUAMI — conception, développement, restitution'],
  ],
  [2500, 6860],
));

// 14. RISQUES & LIMITES
body.push(H1('15. Risques & limites'));
body.push(makeTable(
  ['Risque / limite', 'Mitigation'],
  [
    ['Prix erroné si calculé par le LLM', 'Calcul 100 % déterministe via calculer_devis(), testé en isolation'],
    ['Hallucination de l’agent (zone/règle inventée)', 'Réponses ancrées sur la base (lookup) ; « no sources, no answer »'],
    ['Injection de prompt par le prospect', 'Le code ne négocie pas le prix ; séparation données/instructions ; HITL'],
    ['Crédit IA épuisé en milieu de semaine', 'Modèle éco (gpt-4o-mini), suivi du budget, tests ciblés'],
    ['Relances en double / devis dupliqués', 'Clé d’idempotence + statuts ; délai court en démo, config réelle documentée'],
    ['Périmètre trop ambitieux en 1 semaine', 'MVP = chaîne complète basique avant toute sophistication'],
  ],
  [3800, 5560],
));

// 15. DECISION ATTENDUE
body.push(H1('16. Décision attendue / recommandation'));
body.push(P([run('Recommandation : ', { bold: true }), run('GO sur l’Option A hybride (n8n au cœur, données Supabase) avec le modèle gpt-4o-mini, pour un MVP couvrant l’ensemble de la chaîne commerciale. Le moteur de devis déterministe est construit et testé en premier, puis l’agent est posé dessus.')]));
body.push(P([run('Conditions : ', { bold: true }), run('validation au follow-up du 25/06 des hypothèses de pricing (section 11) et du choix de stack/modèle ; respect du budget (< 1000 €/mois, crédit IA 10-15 €) ; données de test fictives (RGPD).')]));
body.push(callout('Critère de réussite :', 'prouver que l’équipe a compris le métier, construit un flux complet, sécurisé le pricing (déterministe et auditable) et rendu la solution reprenable.'));

// ANNEXE A — WIREFRAMES
body.push(new Paragraph({ children: [new PageBreak()] }));
body.push(H1('Annexe A — Wireframes (low-fidelity)'));
body.push(P('Wireframes « rough » annotés, produits avant le développement pour valider la structure de l’interface et la manière dont elle sert le flux commercial (la conversation au centre). Le rendu haute-fidélité (charte graphique appliquée) sera réalisé séparément.'));
body.push(H2('Écran 1 — Landing conversationnelle'));
body.push(wfImg(wf1, 'Wireframe landing'));
body.push(caption('La conversation est la pièce maîtresse de la page, visible sans scroll — elle remplace le formulaire.'));
body.push(H2('Écran 2 — Conversation (collecte → devis → escalade)'));
body.push(wfImg(wf2, 'Wireframe chat'));
body.push(caption('Le prix s’affiche dans une carte devis générée par le moteur déterministe ; le récapitulatif se remplit au fil de la collecte ; les cas complexes sont escaladés à un humain.'));

// =====================================================================
//  DOCUMENT
// =====================================================================
const doc = new Document({
  creator: 'Équipe NeoTravel',
  title: 'Dossier de cadrage — NeoTravel',
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: ACCENT, font: 'Arial' },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, color: ACCENT_DK, font: 'Arial' },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] },
      { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } },
      children: [
        new TextRun({ text: 'NeoTravel · Dossier de cadrage', size: 16, color: GREY }),
        new TextRun({ text: '\tPage ', size: 16, color: GREY }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY }),
        new TextRun({ text: ' / ', size: 16, color: GREY }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREY }),
      ],
    })] }) },
    children: [...cover, ...toc, ...body],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, process.argv[2] || 'Dossier-de-cadrage-NeoTravel.docx');
  fs.writeFileSync(out, buf);
  console.log('OK ->', out);
});
