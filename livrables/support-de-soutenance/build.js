// build.js — Génère le « Support de soutenance » NeoTravel en .docx (trame de slides + notes)
// Lancer : node build.js   (depuis ce dossier). Sortie : Support-de-soutenance-NeoTravel.docx
const k = require('../_docx-kit');
const { H1, H2, P, run, code, bullet, makeTable, callout, cover, toc, buildDoc, pageBreak, path } = k;

const logo = path.join(__dirname, '..', 'assets', 'logo-neotravel.png');
const body = [];

// Rendu d'une "slide" : titre (H1), sous-titre optionnel, puces, note orateur, qui parle.
function slide(n, titre, { sousTitre, puces = [], note, qui, duree } = {}) {
  body.push(H1(`Slide ${n} — ${titre}`));
  const meta = [];
  if (qui) meta.push(run('Orateur : ', { bold: true, color: k.ACCENT_DK })), meta.push(run(qui + '   '));
  if (duree) meta.push(run('Durée : ', { bold: true, color: k.ACCENT_DK })), meta.push(run(duree));
  if (meta.length) body.push(P(meta));
  if (sousTitre) body.push(P([run(sousTitre, { italics: true, color: k.GREY })]));
  puces.forEach((t) => body.push(bullet(t)));
  if (note) body.push(callout('À dire :', note));
}

// ---------------------------------------------------------------------------
body.push(H1('Mode d’emploi du support'));
body.push(P([run('Trame de la soutenance : '), run('~20 min de présentation + démo', { bold: true }), run(', puis '), run('10-15 min de questions', { bold: true }), run('. Une slide = une idée. Les blocs « À dire » sont les notes de l’orateur ; « Orateur » indique qui prend la parole — '), run('chaque membre intervient', { bold: true }), run('. À mettre en forme dans l’outil de slides de votre choix (ou à présenter tel quel en PDF).')]));
body.push(callout('Avant de commencer :', [run('lancer '), code('lancer-n8n-tunnel.bat'), run(' (2 fenêtres n8n + tunnel) et rejouer '), code('reset-complet.sql'), run(' pour des données propres. Filet de sécurité : un jeu de démo est déjà en base si le chat live échoue.')]));
body.push(H2('Répartition de la parole (proposition)'));
body.push(P('Le tableau ci-dessous propose une répartition de la prise de parole, par bloc et par slides, afin que chaque membre intervienne sur son périmètre.'));
body.push(makeTable(
  ['Bloc', 'Orateur', 'Slides'],
  [
    ['Problème & solution', 'Axel MOMPER', '1 → 4'],
    ['Démo live (parcours complet)', 'Zakaria TOUAMI', '5 → 8'],
    ['Fiabilité, choix techniques, limites', 'Vincent CONTER', '9 → 12'],
    ['Clôture & Q&R', 'Toute l’équipe', '13'],
  ],
  [3200, 3360, 2800],
));
body.push(pageBreak());

// ---------------------------------------------------------------------------
slide(1, 'Titre', {
  qui: 'Axel', duree: '30 s',
  sousTitre: 'NeoTravel — Automatisation du cycle commercial (transport de groupe en autocar).',
  puces: [
    'Cas d’étude MBA1 — InterstellLabs.',
    'Équipe : Axel MOMPER · Vincent CONTER · Zakaria TOUAMI.',
  ],
  note: 'Se présenter brièvement et annoncer le plan : problème, solution, démo live, choix techniques, limites, questions.',
});

slide(2, 'Le problème', {
  qui: 'Axel', duree: '2 min',
  sousTitre: 'NeoTravel reçoit ~60 leads/jour — l’acquisition n’est pas le problème, l’exploitation l’est.',
  puces: [
    'Friction 1 : les commerciaux (commissionnés) priorisent les gros leads → des leads payants ne sont jamais recontactés (manque à gagner).',
    'Friction 2 : acquisition bridée — sans automatisation, plus de leads = plus de charge, pas plus de CA.',
    'Tarification manuelle lente et faillible, relances oubliées, direction sans visibilité.',
  ],
  note: 'Insister : on veut mieux exploiter le flux existant et libérer les commerciaux pour les tâches à forte valeur (conseil, négociation).',
});

slide(3, 'La solution & la règle d’or', {
  qui: 'Axel', duree: '1,5 min',
  sousTitre: 'Un copilote qui automatise la chaîne sans déshumaniser.',
  puces: [
    'Chaîne complète : captation → qualification (agent IA) → devis déterministe → email/PDF → relances → dashboard.',
    'Règle d’or : l’IA comprend et oriente ; le prix vient TOUJOURS du code déterministe (calculer_devis()), jamais du LLM.',
    'L’humain garde la main sur les cas sensibles (HITL).',
  ],
  note: 'La règle d’or est le fil rouge de toute la soutenance : reproductible, auditable, zéro hallucination tarifaire.',
});

slide(4, 'Architecture', {
  qui: 'Axel', duree: '1,5 min',
  sousTitre: 'Option A hybride : Next.js (Netlify) + n8n/Gemma + Supabase + Resend.',
  puces: [
    'Front Next.js = UI + toute la logique métier (routes /api).',
    'Agent n8n = UN SEUL appel LLM (extraction) ; le nœud Code calcule le prix ET rédige la réponse.',
    'Supabase = PostgreSQL + Auth + RLS ; OSRM = distance routière réelle ; Resend = emails.',
  ],
  note: 'Montrer le schéma de DIAGRAMMES.md. Expliquer pourquoi un seul appel LLM : rapidité, fiabilité, pas de fuite de raisonnement.',
});

slide(5, 'Démo — parcours prospect (le cœur)', {
  qui: 'Zakaria', duree: '2 min',
  sousTitre: 'Chat : « Lyon vers Annecy, 50 personnes, aller-retour le 12 juillet 2026 ».',
  puces: [
    'La barre « Votre demande » se remplit en direct ; l’agent demande l’email.',
    'Carte devis affichée + email reçu (PDF + boutons Accepter / Refuser).',
    'Phrase clé : le prix vient du moteur, pas de l’IA ; la distance est la vraie distance routière.',
  ],
  note: 'Si Gemma renvoie un 503 ponctuel, renvoyer le message. Garder le filet : devis de démo déjà en base.',
});

slide(6, 'Démo — cas complexe (HITL)', {
  qui: 'Zakaria', duree: '1 min',
  sousTitre: 'Chat : « Marseille vers Lille, 120 personnes ».',
  puces: [
    'Au-delà de 85 passagers → message d’escalade, pas de devis automatique.',
    'La demande devient un cas complexe transmis à un humain avec le contexte.',
  ],
  note: 'Montrer que le système sait dire « non » à l’automatisation totale : c’est un gage de fiabilité, pas une limite.',
});

slide(7, 'Démo — côté client', {
  qui: 'Zakaria', duree: '1,5 min',
  sousTitre: 'De l’email à l’espace client.',
  puces: [
    'Bouton « Accepter » d’un email sans compte → inscription pré-remplie.',
    'Espace client : Mes devis (PDF, accepter/refuser avec motifs), Mes conversations, Mon compte.',
    '« Refuser » depuis l’email → page de motifs → relances stoppées.',
  ],
  note: 'Souligner le différenciateur bonus : le prospect suit ses devis et son historique.',
});

slide(8, 'Démo — dashboard admin (pilotage)', {
  qui: 'Zakaria', duree: '2 min',
  sousTitre: 'Connexion admin → /admin.',
  puces: [
    'KPIs, courbe d’évolution, camembert des motifs de refus, filtre par dates, export PDF.',
    'Cas complexe → devis sur-mesure (prix HT → TVA/TTC → envoi) → rejoint le pipeline.',
    'Messagerie HITL bidirectionnelle ; « Lancer les relances dues ».',
  ],
  note: 'C’est la preuve du pilotage par la donnée : la direction voit tout en temps réel.',
});

slide(9, 'Fiabilité & garde-fous', {
  qui: 'Vincent', duree: '1,5 min',
  sousTitre: 'Un système sûr, juste et auditable.',
  puces: [
    'Prix 100 % déterministe (calculer_devis() testé) ; 1ᵉʳ prix figé.',
    'Jeu de tests : cas types ET cas limites (0 passager, date incohérente, gros volume…).',
    'RGPD (minimisation, domaine de démo sans envoi réel) ; prompt injection (le code ne négocie jamais le prix) ; HITL.',
  ],
  note: 'Montrer rapidement npm test qui passe, et /docs (Swagger) : « toute l’API est documentée et explorable ».',
});

slide(10, 'Choix techniques défendus', {
  qui: 'Vincent', duree: '1,5 min',
  sousTitre: 'Pourquoi ces décisions.',
  puces: [
    'n8n (Option A) : orchestration visuelle + relances intégrées.',
    'Un seul appel LLM : rapide, fiable, économe.',
    'Supabase plutôt qu’Airtable : base + Auth + RLS dans une seule stack (dashboard custom sans surcoût).',
    'Gemma (gratuit) : rôle d’assistance uniquement.',
  ],
  note: 'Renvoyer à l’« Argumentaire des choix » (L1) pour le détail des décisions.',
});

slide(11, 'Limites & arbitrages assumés', {
  qui: 'Vincent', duree: '1 min',
  sousTitre: 'Ce qu’on assume, et pourquoi.',
  puces: [
    'n8n en tunnel local = choix MVP (0 €, dépend du PC) ; voie de prod 24/7 documentée.',
    'Périmètre : prototype cohérent de bout en bout, pas une app de production (cas limites non exhaustifs).',
    'Distance estimée/réelle au MVP ; péages forfaitaires (P2).',
  ],
  note: 'Assumer franchement : la cohérence du parcours prime sur la perfection d’un maillon.',
});

slide(12, 'MVP vs prod & coûts', {
  qui: 'Vincent', duree: '1 min',
  sousTitre: 'Du 0 € à la prod sereine.',
  puces: [
    'Aujourd’hui (MVP) : ~0 €/mois (tunnel local).',
    'Prod « éco » 24/7 : ~0-1 €/mois (n8n sur Oracle Free).',
    'Prod « sereine » recommandée : ~30 €/mois (Supabase Pro + n8n hébergé).',
  ],
  note: 'Détails et 4 scénarios chiffrés dans COUTS_ET_PROD.md. Le seul élément à changer pour la prod : héberger n8n.',
});

slide(13, 'Clôture & questions', {
  qui: 'Toute l’équipe', duree: '+ 10-15 min Q/R',
  sousTitre: 'Ce qu’on a prouvé.',
  puces: [
    'Compris le métier, construit un flux complet, sécurisé le pricing, rendu la solution reprenable.',
    'Remerciements + ouverture aux questions.',
  ],
  note: 'Chaque membre reste disponible sur son périmètre. Voir l’annexe : questions probables et réponses prêtes.',
});

// ---------------------------------------------------------------------------
body.push(pageBreak());
body.push(H1('Annexe — Questions probables & réponses prêtes'));
body.push(P('Le tableau ci-dessous rassemble les questions les plus probables du jury et une réponse prête, courte et défendable, pour chacune.'));
body.push(makeTable(
  ['Question', 'Réponse'],
  [
    ['Pourquoi pas le LLM pour le prix ?', 'Reproductibilité, auditabilité, zéro hallucination tarifaire ; le LLM ne fait qu’extraire.'],
    ['C’est vraiment en ligne ?', 'Oui : front + base + emails 24/7 ; seul l’agent (chat) dépend du tunnel — assumé et documenté.'],
    ['Et si Gemma sature (503) ?', 'Retries automatiques ; le moteur de prix et la réponse ne dépendent pas du LLM.'],
    ['Combien ça coûterait en vrai ?', '4 scénarios chiffrés (COUTS_ET_PROD.md) : ~0 € en éco, ~30 €/mois en prod sereine.'],
    ['Comment un autre dev reprend le projet ?', 'Documentation de passation (L3) : 5 min pour relancer en local ; Swagger/TypeDoc pour le détail.'],
    ['Comment changer un tarif ?', 'pricing/matrices.js (+ pricing_config), relancer npm test, reporter dans n8n. Jamais via le LLM.'],
    ['Et la RGPD ?', 'Minimisation, données fictives/minimales, domaine de démo sans envoi réel, RLS par utilisateur.'],
  ],
  [3400, 5960],
));

// ===========================================================================
buildDoc({
  title: 'Support de soutenance — NeoTravel',
  footerTitle: 'NeoTravel · Support de soutenance',
  outPath: path.join(__dirname, process.argv[2] || 'Support-de-soutenance-NeoTravel.docx'),
  children: [
    ...cover({ logoPath: logo, title: 'SUPPORT DE SOUTENANCE', subtitle: 'Trame de présentation & démonstration', livrable: 'Soutenance — 1ᵉʳ juillet 2026' }),
    ...toc(),
    ...body,
  ],
});
