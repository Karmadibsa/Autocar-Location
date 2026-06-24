// build-argumentaire.js — Génère "Argumentaire des choix" (support soutenance / journal de décisions)
// Lancer : node build-argumentaire.js [nom.docx]
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, TableOfContents, PageNumber, PageBreak, TabStopType, TabStopPosition,
  VerticalAlign,
} = require('docx');

const ACCENT = '0E7A66', ACCENT_DK = '0A5346', HEAD_FILL = 'D9F0EA', ZEBRA = 'F2F8F6', GREY = '666666', CW = 9360;

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const run = (text, opts = {}) => new TextRun({ text, ...opts });
const P = (t) => new Paragraph({ spacing: { after: 100 }, children: Array.isArray(t) ? t : [new TextRun(t)] });
const bullet = (t) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 50 }, children: Array.isArray(t) ? t : [new TextRun(t)] });
const border = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
function cell(content, { w, head = false, fill, align = AlignmentType.LEFT } = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((c) => typeof c === 'string'
    ? new Paragraph({ alignment: align, spacing: { after: 0 }, children: [new TextRun({ text: c, bold: head, color: head ? ACCENT_DK : '000000' })] }) : c);
  return new TableCell({ width: { size: w, type: WidthType.DXA }, shading: { fill: head ? HEAD_FILL : (fill || 'FFFFFF'), type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 110, right: 110 }, verticalAlign: VerticalAlign.CENTER, children: paras });
}
function makeTable(headers, rows, widths) {
  const headRow = new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { w: widths[i], head: true })) });
  const bodyRows = rows.map((r, ri) => new TableRow({ children: r.map((c, i) => cell(c, { w: widths[i], fill: ri % 2 ? ZEBRA : 'FFFFFF' })) }));
  return new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, borders, rows: [headRow, ...bodyRows] });
}
function callout(label, text, color = ACCENT) {
  return new Paragraph({ spacing: { before: 60, after: 160 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color, space: 8 } },
    shading: { fill: ZEBRA, type: ShadingType.CLEAR }, children: [new TextRun({ text: label + ' ', bold: true, color: ACCENT_DK }), new TextRun(text)] });
}

const body = [];
function decision(o) {
  body.push(H1(`${o.n}. ${o.titre}`));
  if (o.besoin) body.push(P([run('Besoin / contexte : ', { bold: true, color: ACCENT_DK }), run(o.besoin)]));
  body.push(P([run('Choix retenu : ', { bold: true, color: ACCENT_DK }), run(o.choix)]));
  body.push(P([run('Pourquoi : ', { bold: true, color: ACCENT_DK }), run(o.pourquoi)]));
  if (o.extra) o.extra();
  if (o.alt) body.push(P([run('Alternative écartée : ', { bold: true, color: ACCENT_DK }), run(o.alt)]));
  if (o.compromis) body.push(P([run('Compromis assumé : ', { bold: true, color: ACCENT_DK }), run(o.compromis)]));
  if (o.phrase) body.push(callout('En une phrase (soutenance) :', o.phrase));
}

// ---------- CONTENU ----------
const logo = fs.readFileSync(path.join(__dirname, 'assets', 'logo-neotravel.png'));
const cover = [
  new Paragraph({ spacing: { before: 1200, after: 200 }, alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: logo, transformation: { width: 300, height: 166 }, altText: { title: 'NeoTravel', description: 'Logo', name: 'logo' } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 80 }, children: [new TextRun({ text: 'ARGUMENTAIRE DES CHOIX', bold: true, size: 52, color: ACCENT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Défense des choix techniques — support de soutenance', size: 28, color: '333333' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: 'NEO TRAVEL', bold: true, size: 28, color: ACCENT_DK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: 'Équipe : Axel MOMPER · Vincent CONTER · Zakaria TOUAMI', size: 22, color: GREY })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Document annexe au dossier de cadrage · sert aussi de journal de décisions', italics: true, size: 20, color: GREY })] }),
  new Paragraph({ children: [new PageBreak()] }),
];
const toc = [
  new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: 'Table des matières', bold: true, size: 32, color: ACCENT })] }),
  new TableOfContents('Sommaire', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),
];

body.push(P([run('Ce document justifie chaque décision structurante du projet : le besoin, le choix retenu, les alternatives écartées et le compromis assumé. Il sert de support à la '), run('défense des choix en soutenance (Bloc C)', { bold: true }), run(' et de '), run('journal de décisions', { bold: true }), run(' (démarche Agile).')]));

decision({ n: 1, titre: 'Automatiser toute la chaîne (pas un simple chatbot)',
  besoin: 'NeoTravel reçoit ~60 leads/jour sous-exploités ; le sujet est tout le cycle commercial, pas un assistant conversationnel.',
  choix: 'Un prototype couvrant les 10 fonctions, de la captation au dashboard.',
  pourquoi: 'Un chatbot seul ne répond pas au besoin (piège n°1 de la FAQ). La cohérence de la chaîne prime sur la perfection d’un maillon.',
  alt: 'Un chatbot isolé sans process derrière (base, calcul, devis, relances, statuts).',
  compromis: 'Chaque brique reste volontairement basique pour couvrir toute la chaîne dans la semaine.',
  phrase: 'On n’a pas fait un chatbot — on a automatisé le cycle commercial de bout en bout.' });

decision({ n: 2, titre: 'Tarification déterministe : calculer_devis(), jamais le LLM',
  besoin: 'Un devis engage commercialement NeoTravel : il doit être exact, reproductible et auditable.',
  choix: 'Un moteur de règles en code (calculer_devis()), construit et testé en isolation, exposé comme outil que l’agent appelle.',
  pourquoi: 'Un LLM peut halluciner un prix, varier d’un appel à l’autre et n’est pas auditable ; il est aussi manipulable par injection de prompt. Le code, lui, ne négocie pas.',
  alt: 'Laisser l’IA estimer/calculer le prix en langage naturel.',
  compromis: 'Aucun réel : c’est la règle d’or du sujet. Le coût est seulement de bien documenter les règles.',
  phrase: 'Le LLM décide quoi faire ; le code calcule le prix — toujours, de façon auditable.' });

decision({ n: 3, titre: 'Orchestration : Option A (n8n au cœur)',
  besoin: 'Orchestrer l’agent, ses outils et les relances, avec une équipe globalement peu à l’aise en code.',
  choix: 'Le nœud AI Agent de n8n comme cerveau ; le front n’est qu’une UI branchée sur un webhook n8n.',
  pourquoi: 'Orchestration visuelle, courbe d’apprentissage douce, relances natives (Schedule Trigger), résultat solide rapidement.',
  alt: 'Tout coder dans le front (Option B, Vercel AI SDK) : plus exigeant, état conversationnel à gérer.',
  compromis: 'Part de code « agent » plus mince et UI 100 % sur-mesure à intégrer via webhook. On garde le cerveau dans n8n pour ne pas dupliquer la logique.',
  phrase: 'n8n nous donne un agent fiable rapidement, sans réécrire un orchestrateur.' });

decision({ n: 4, titre: 'Données : Supabase plutôt qu’Airtable',
  besoin: 'Stocker demandes, devis, relances et matrices ; piloter l’activité ; et — point clé — nous développons déjà une interface (landing + chatbot), donc un espace /admin et un espace client sont à portée de main.',
  choix: 'Supabase (PostgreSQL managé) avec Auth et Row Level Security intégrés ; dashboard et portail codés dans la même app Next.js.',
  pourquoi: 'Vraie base relationnelle (relations, SQL, contraintes), authentification et sécurité par ligne (RLS) intégrées, triggers / Database Webhooks / realtime, et familiarité de l’équipe. Comme le front existe de toute façon, le dashboard custom n’est plus un surcoût mais une simple route.',
  extra: () => {
    body.push(P([run('Comparaison Supabase vs Airtable :', { bold: true })]));
    body.push(makeTable(
      ['Critère', 'Airtable', 'Supabase (retenu)'],
      [
        ['Dashboard de pilotage', 'Interface no-code gratuite', 'Page React/Next dans notre app (à coder, mais l’app existe déjà)'],
        ['Authentification applicative', 'Non intégrée à notre app', 'Supabase Auth (admin + portail lead) clé en main'],
        ['Sécurité par utilisateur', 'Partages limités', 'Row Level Security (chacun voit ses données)'],
        ['Base de données', 'Tableur amélioré, quotas API', 'PostgreSQL réel : relations, SQL, triggers'],
        ['Automatisation DB', 'Automations basiques', 'Triggers, Database Webhooks → n8n, realtime'],
        ['Familiarité équipe', 'Jamais utilisé', 'Déjà pratiqué'],
        ['Valorisation soutenance', 'Prototype no-code', 'Stack pro et transférable'],
      ],
      [2200, 3200, 3960],
    ));
  },
  alt: 'Airtable + son Interface no-code : dashboard gratuit, mais pas d’authentification intégrée à notre application, base de type tableur (relations et quotas limités), et impossibilité d’offrir un espace de connexion lead dans notre interface.',
  compromis: 'On code le dashboard et le portail — mais c’est marginal puisque l’app front est déjà nécessaire ; cela concentre toutefois du développement sur le profil codeur de l’équipe (dashboard gardé minimal).',
  phrase: 'Comme on développe déjà l’interface, Supabase réunit base + authentification + dashboard + portail client dans une seule stack cohérente.' });
body.push(callout('Conformité aux consignes :', 'la fiche stack autorise explicitement « Données = Airtable OU Supabase ». Le choix Supabase en Option A est un montage hybride permis, à confirmer au follow-up du 25/06.'));

decision({ n: 5, titre: 'Dashboard de pilotage : page custom dans l’app (lit Supabase)',
  choix: 'Une route /admin (React/Next) qui lit Supabase, avec quelques cartes KPI et une table filtrable, mises à jour en temps réel (realtime).',
  pourquoi: 'Intégré à notre application et à notre authentification ; KPIs actionnables pour la direction (leads, devis, conversion, relances, délais).',
  alt: 'L’Interface Airtable (no-code) — écartée avec le choix Supabase.',
  compromis: 'À coder, donc gardé volontairement minimal pour tenir la semaine.' });

decision({ n: 6, titre: 'Authentification : Supabase Auth + RLS (admin et lead)',
  besoin: 'Un espace admin pour la direction/les commerciaux, et — en différenciateur — un espace de connexion pour les leads.',
  choix: 'Supabase Auth (magic link), sécurisé par Row Level Security : chaque utilisateur ne voit que ses données.',
  pourquoi: 'Solution clé en main, sécurisée au niveau base, qui couvre d’un seul mécanisme l’admin et le portail client.',
  compromis: 'Stocker des comptes = données personnelles → privacy by design, minimisation, consentement, et données fictives en démonstration.',
  phrase: 'Un seul système d’authentification gère l’admin ET l’espace client, sécurisé par RLS.' });

decision({ n: 7, titre: 'Portail lead (connexion prospect) — différenciateur',
  besoin: 'Permettre au prospect de suivre l’avancement de ses devis et de retrouver son historique de conversation.',
  choix: 'Un espace /espace-client (connexion magic link) listant ses devis (statut, PDF) et ses échanges.',
  pourquoi: 'Transparence et réassurance (valeurs de NeoTravel), et réduction des relances : le lead suit lui-même son dossier. Rare chez un intermédiaire.',
  alt: 'Aucun espace client (suivi uniquement par email).',
  compromis: 'Fonctionnalité bonus (P2), gardée légère pour ne pas déborder la semaine ; vigilance RGPD renforcée.',
  phrase: 'Le lead se connecte et suit ses devis et ses conversations — un vrai plus relationnel.' });

decision({ n: 8, titre: 'Modèle LLM : OpenAI gpt-4o-mini',
  besoin: 'Un modèle pour qualifier, extraire des paramètres structurés et reformuler — pas pour calculer.',
  choix: 'gpt-4o-mini (avec Gemini Flash / Claude Haiku en plan B).',
  pourquoi: 'Coût très faible (le crédit 10-15 € tient des milliers de tests), sorties structurées strictes (JSON Schema) fiables, latence basse, intégration n8n bien documentée.',
  alt: 'Un modèle haut de gamme (GPT-4o, Claude Sonnet) : coût et latence plus élevés, risque d’épuiser le crédit.',
  phrase: 'Le meilleur modèle n’est pas le plus puissant, c’est le plus adapté au bon coût.' });

decision({ n: 9, titre: 'Relances & automatisation : n8n (Schedule + webhooks)',
  besoin: 'Relancer J+2 (urgent), J+3 puis J+7 (standard), au maximum 2 fois, sans doublon.',
  choix: 'Workflows n8n (Schedule Trigger) déclenchés par les statuts, avec écriture/lecture Supabase (Database Webhooks possibles).',
  pourquoi: 'Planification simple et robuste ; idempotence assurée par une clé + contrainte d’unicité pour éviter les relances en double.',
  phrase: 'Les relances sont planifiées et dédupliquées par n8n, jamais oubliées ni envoyées deux fois.' });

decision({ n: 10, titre: 'Canal de relance : email (Resend/Brevo) plutôt que WhatsApp',
  choix: 'Email par défaut via Resend ou Brevo.',
  pourquoi: 'Gratuit et trivial à brancher. L’API WhatsApp officielle implique un coût et une vérification Meta — hors périmètre d’une semaine.',
  alt: 'WhatsApp Business API — renvoyé en évolution future.',
  phrase: 'Email pour le MVP ; WhatsApp serait une évolution, pas une priorité.' });

decision({ n: 11, titre: 'Captation : landing conversationnelle plutôt que formulaire',
  choix: 'Une interface où la conversation est centrale (inspiration Mindtrip.ai), pas un widget en coin.',
  pourquoi: 'Meilleur taux de complétion, données plus riches et plus fiables, expérience plus humaine — le prospect se sent écouté, pas traité.',
  alt: 'Un formulaire classique (reste un fallback acceptable et justifiable pour les champs obligatoires).',
  phrase: 'On remplace le formulaire par une conversation qui guide, reformule et qualifie.' });

decision({ n: 12, titre: 'Human-in-the-loop : garder l’humain dans la boucle',
  besoin: 'Digitaliser sans déshumaniser : préserver le conseil, la négociation et les cas complexes.',
  choix: 'Des points de validation/escalade : devis hors seuils, cas atypiques, faible certitude ou données incomplètes → reprise humaine avec contexte.',
  pourquoi: 'Un devis inhabituel ou un cas ambigu ne doit pas être « résolu » par une invention ; un handoff au bon moment est un signe de fiabilité, pas un échec.',
  phrase: 'L’agent prépare la décision ; l’humain décide, négocie et engage NeoTravel.' });

decision({ n: 13, titre: 'Hébergement : Vercel (front) + n8n (tunnel accepté en démo)',
  choix: 'Front déployé sur Vercel ; agent n8n joignable via tunnel local pendant la démo (hébergement complet = bonus).',
  pourquoi: 'Déploiement front gratuit et instantané ; le tunnel local est explicitement accepté par les consignes pour la démonstration.',
  compromis: 'Hébergement complet de la stack (n8n Cloud/VPS) renvoyé en bonus.' });

// ---------- DOCUMENT ----------
const doc = new Document({
  creator: 'Équipe NeoTravel', title: 'Argumentaire des choix — NeoTravel',
  styles: { default: { document: { run: { font: 'Arial', size: 22 } } }, paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: ACCENT, font: 'Arial' },
      paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } } } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, color: ACCENT_DK, font: 'Arial' },
      paragraph: { spacing: { before: 160, after: 90 }, outlineLevel: 1 } },
  ] },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 260 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 4 } }, children: [
        new TextRun({ text: 'NeoTravel · Argumentaire des choix', size: 16, color: GREY }),
        new TextRun({ text: '\tPage ', size: 16, color: GREY }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: GREY }),
        new TextRun({ text: ' / ', size: 16, color: GREY }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: GREY }),
      ] })] }) },
    children: [...cover, ...toc, ...body],
  }],
});
Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, process.argv[2] || 'Argumentaire-des-choix-NeoTravel.docx');
  fs.writeFileSync(out, buf);
  console.log('OK ->', out);
});
