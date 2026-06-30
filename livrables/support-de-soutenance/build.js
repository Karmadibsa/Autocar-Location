// build.js — Génère le « Support de soutenance » NeoTravel en .docx (trame de slides + notes)
// Lancer : node build.js   (depuis ce dossier). Sortie : Support-de-soutenance-NeoTravel.docx
// Miroir, en version document, du PowerPoint produit par build-pptx.js (même plan 18 slides).
const k = require('../_docx-kit');
const { H1, H2, P, run, code, bullet, makeTable, callout, cover, toc, buildDoc, pageBreak, path } = k;

const logo = path.join(__dirname, '..', 'assets', 'logo-neotravel.png');
const body = [];

// Rendu d'une "slide" : titre (H1), méta (orateur/durée), sous-titre, puces, tableau optionnel, note.
function slide(n, titre, { sousTitre, puces = [], table, note, qui, duree } = {}) {
  body.push(H1(`Slide ${n} — ${titre}`));
  const meta = [];
  if (qui) meta.push(run('Orateur : ', { bold: true, color: k.ACCENT_DK })), meta.push(run(qui + '   '));
  if (duree) meta.push(run('Durée : ', { bold: true, color: k.ACCENT_DK })), meta.push(run(duree));
  if (meta.length) body.push(P(meta));
  if (sousTitre) body.push(P([run(sousTitre, { italics: true, color: k.GREY })]));
  puces.forEach((t) => body.push(bullet(t)));
  if (table) body.push(makeTable(table.head, table.rows, table.widths));
  if (note) body.push(callout('À dire :', note));
}

// ---------------------------------------------------------------------------
body.push(H1('Mode d’emploi du support'));
body.push(P([run('Trame de la soutenance : '), run('~20 min de présentation + démo', { bold: true }), run(', puis '), run('10-15 min de questions', { bold: true }), run('. Une slide = une idée. Les blocs « À dire » sont les notes de l’orateur ; « Orateur » indique qui prend la parole — '), run('chaque membre intervient', { bold: true }), run('. Ce document est le miroir du PowerPoint (build-pptx.js) ; présentez le .pptx, ce .docx sert de script.')]));
body.push(callout('Avant de commencer :', [run('lancer '), code('lancer-n8n-tunnel.bat'), run(' (2 fenêtres n8n + tunnel) et rejouer '), code('reset-complet.sql'), run(' pour des données propres. Filet de sécurité : un jeu de démo est déjà en base si le chat live échoue.')]));
body.push(H2('Répartition de la parole (proposition)'));
body.push(P('Le tableau ci-dessous propose une répartition de la prise de parole, par bloc et par slides, afin que chaque membre intervienne sur son périmètre.'));
body.push(makeTable(
  ['Bloc', 'Orateur', 'Slides'],
  [
    ['Problème, objectifs & solution', 'Axel MOMPER', '1 → 5, 9'],
    ['Choix techniques, fiabilité, prévu vs réalisé', 'Vincent CONTER', '6 → 8'],
    ['Démo live (parcours complet)', 'Zakaria TOUAMI', '10 → 14'],
    ['Limites, coûts, ouverture & passation', 'Vincent CONTER', '15 → 16'],
    ['Clôture & Q&R', 'Toute l’équipe', '17'],
  ],
  [3600, 3160, 2600],
));
body.push(H2('Plan & ordre logique'));
body.push(P('Objectifs → contexte → solution → choix techniques justifiés → prévu vs réalisé → correspondance attentes/réponses → démo (ce qui fonctionne) → limites & ouverture → conclusion.'));
body.push(pageBreak());

// ---------------------------------------------------------------------------
slide(1, 'Titre', {
  qui: 'Axel', duree: '30 s',
  sousTitre: 'NeoTravel — Automatisation du cycle commercial (transport de groupe en autocar).',
  puces: [
    'Cas d’étude MBA1 — InterstellLabs · 1ᵉʳ juillet 2026.',
    'Équipe : Axel MOMPER · Vincent CONTER · Zakaria TOUAMI.',
  ],
  note: 'Se présenter brièvement et annoncer le plan : objectifs du client → contexte → solution → choix techniques → prévu vs réalisé → démo live → ouverture & passation → questions. Annoncer la règle d’or dès l’ouverture.',
});

slide(2, 'Objectifs & attentes initiales du client', {
  qui: 'Axel', duree: '1,5 min',
  sousTitre: 'Le cadre posé AVANT d’écrire la première ligne de code (dossier de cadrage L1).',
  puces: [
    'Périmètre — 10 fonctions : capter le lead, centraliser (CRM), qualifier, détecter les manquants, calculer le devis, générer le PDF, l’envoyer, relancer, suivre le pipeline, piloter via dashboard.',
    'Irritants à résoudre : leads payants jamais recontactés, devis trop lents, relances oubliées, tarif manuel faillible, direction sans visibilité.',
    'KPIs visés : part des leads traités → ~100 %, délai demande→devis en minutes, taux de conversion, aucune relance oubliée, coût IA/devis maîtrisé (bonus).',
  ],
  note: 'Poser le cadre : voici ce que le client attendait. On y reviendra (slide 9) pour prouver qu’on répond au besoin.',
});

slide(3, 'Le contexte & le problème', {
  qui: 'Axel', duree: '1,5 min',
  sousTitre: 'NeoTravel reçoit ~60 leads/jour — l’acquisition n’est pas le problème, l’exploitation l’est.',
  puces: [
    'Friction 1 : les commerciaux (commissionnés) priorisent les gros leads → des leads payants ne sont jamais recontactés (manque à gagner).',
    'Friction 2 : acquisition bridée — sans automatisation, plus de leads = plus de charge, pas plus de CA.',
    'S’ajoutent : tarification manuelle lente et faillible, relances oubliées, direction sans visibilité.',
  ],
  note: 'Insister : mieux exploiter le flux existant et libérer les commerciaux pour les tâches à forte valeur (conseil, négociation).',
});

slide(4, 'La solution & la règle d’or', {
  qui: 'Axel', duree: '1,5 min',
  sousTitre: 'Un copilote qui automatise la chaîne sans déshumaniser.',
  puces: [
    'Chaîne complète : captation → qualification (agent IA) → devis déterministe → email/PDF → relances → dashboard.',
    'Règle d’or : l’IA comprend et oriente ; le prix vient TOUJOURS du code déterministe (calculer_devis()), jamais du LLM.',
    'L’humain garde la main sur les cas sensibles (HITL).',
  ],
  note: 'La règle d’or est le fil rouge de toute la soutenance : reproductible, auditable, zéro hallucination tarifaire.',
});

slide(5, 'Architecture', {
  qui: 'Axel', duree: '1 min',
  sousTitre: 'Option A hybride : Next.js (Netlify) + n8n/Gemma + Supabase + Resend.',
  puces: [
    'Front Next.js = UI + toute la logique métier (routes /api).',
    'Agent n8n = UN SEUL appel LLM (extraction) ; le nœud Code calcule le prix ET rédige la réponse.',
    'Supabase = PostgreSQL + Auth + RLS ; OSRM = distance routière réelle ; Resend = emails.',
  ],
  note: 'Montrer le schéma (docs/architecture.svg / DIAGRAMMES.md). Pourquoi un seul appel LLM : rapidité, fiabilité, pas de fuite de raisonnement.',
});

slide(6, 'Choix techniques justifiés', {
  qui: 'Vincent', duree: '2 min',
  sousTitre: 'Pas seulement ce qu’on a fait, mais pourquoi — avec les critères.',
  table: {
    head: ['Décision', 'Retenu', 'Critères & pourquoi'],
    rows: [
      ['Orchestration', 'n8n (Option A)', 'Mise en place visuelle et rapide, relances intégrées, courbe d’apprentissage douce — vs Vercel AI SDK.'],
      ['Modèle IA', 'Gemma (gemma-4-31b-it)', 'Coût gratuit (quota AI Studio), sorties JSON structurées fiables, latence basse ; rôle d’assistance seul.'],
      ['Données & Auth', 'Supabase (PostgreSQL)', 'Base + Auth + RLS dans une seule stack → dashboard custom sans surcoût, sécurité par ligne — vs Airtable.'],
      ['Appels LLM', 'Un seul (extraction)', 'Tient dans le timeout 30 s, moins d’erreurs 503, aucune fuite de raisonnement vers le client.'],
      ['Limite observée', '503 ponctuels du LLM', 'Mitigée : retries + prix et réponse indépendants du LLM → le devis sort même si le modèle hésite.'],
    ],
    widths: [1700, 2200, 5460],
  },
  note: 'Défendre chaque décision par ses critères (coût, qualité, latence, sorties structurées, compatibilité stack) et assumer la limite. Renvoyer à l’« Argumentaire des choix » (L1).',
});

slide(7, 'Fiabilité & garde-fous', {
  qui: 'Vincent', duree: '1 min',
  sousTitre: 'Un système sûr, juste et auditable.',
  puces: [
    'Prix 100 % déterministe (calculer_devis() testé) ; 1ᵉʳ prix figé (distance réelle OSRM).',
    'Jeu de tests : cas types ET cas limites (0 passager, date incohérente, gros volume, > 85 pax → escalade).',
    'RGPD (minimisation, domaine de démo sans envoi réel) ; prompt injection (le code ne négocie jamais le prix) ; HITL.',
  ],
  note: 'Montrer rapidement npm test qui passe, et /docs (Swagger) : « toute l’API est documentée et explorable ».',
});

slide(8, 'Prévu (L1) vs réalisé (L2/L3)', {
  qui: 'Vincent', duree: '1,5 min',
  sousTitre: 'Transparence sur les écarts entre le cadrage et la réalisation.',
  table: {
    head: ['Prévu — cadrage L1', 'Réalisé', 'Raison de l’écart'],
    rows: [
      ['Modèle gpt-4o-mini', 'Gemma (gratuit)', 'Quota AI Studio, sorties JSON suffisantes ; le LLM ne fait qu’extraire.'],
      ['Distance estimée (API en P2)', 'Distance routière réelle (OSRM) dès le MVP', 'Service gratuit, sans clé → devis plus juste tout de suite.'],
      ['n8n hébergé (cloud)', 'Tunnel local à URL fixe (0 €)', 'MVP gratuit et suffisant pour la démo ; voie de prod documentée.'],
      ['Espace client = bonus', 'Livré : suivi devis + conversations + messagerie HITL', 'Forte valeur client, faisable simplement dans Supabase.'],
      ['Dashboard simple', 'Dashboard riche : courbe, camembert, export PDF', 'Supabase facilitait un vrai pilotage par la donnée.'],
    ],
    widths: [2500, 2900, 3960],
  },
  note: 'Assumer les écarts comme des décisions, pas des oublis. On a tenu le cap (chaîne complète) et certains arbitrages ont amélioré le résultat.',
});

slide(9, 'Attentes du client → réponses livrées', {
  qui: 'Axel', duree: '1,5 min',
  sousTitre: 'On boucle avec la slide 2 : chaque attente a sa réponse concrète.',
  table: {
    head: ['Attente du client', 'Réponse apportée par la solution'],
    rows: [
      ['Capter et centraliser chaque lead', 'Chat + création automatique de la fiche (clients / demandes) en base.'],
      ['Qualifier et détecter les manquants', 'Agent n8n : extraction des paramètres + questions ciblées avant devis.'],
      ['Un devis juste, en quelques secondes', 'calculer_devis() déterministe + distance routière réelle, figé.'],
      ['Une proposition professionnelle', 'PDF généré + email avec boutons Accepter / Refuser.'],
      ['Ne plus oublier les relances', 'Séquences automatiques J+2 / J+3 / J+7 (max 2) + relance manuelle.'],
      ['Donner de la visibilité à la direction', 'Dashboard /admin : KPIs, courbe, camembert des refus, export PDF.'],
      ['Garder l’humain sur les cas sensibles', 'Escalade HITL (> 85 pax) + messagerie bidirectionnelle client ↔ conseiller.'],
    ],
    widths: [3400, 5960],
  },
  note: 'C’est la preuve qu’on a traité le besoin du client, pas seulement construit une démo.',
});

slide(10, 'Ce qui fonctionne — démo live', {
  qui: 'Zakaria',
  sousTitre: 'Démonstration du parcours complet, en conditions réelles.',
  puces: [
    'Au programme : parcours prospect · cas complexe (HITL) · espace client · dashboard admin.',
  ],
  note: 'Transition vers la démo. Pré-requis lancés (tunnel + données propres). Filet : jeu de démo déjà en base si le chat échoue.',
});

slide(11, 'Démo — parcours prospect (le cœur)', {
  qui: 'Zakaria', duree: '2 min',
  sousTitre: 'Chat : « Lyon vers Annecy, 50 personnes, aller-retour le 12 juillet 2026 ».',
  puces: [
    'La barre « Votre demande » se remplit en direct ; l’agent demande l’email.',
    'Carte devis affichée + email reçu (PDF + boutons Accepter / Refuser).',
    'Phrase clé : le prix vient du moteur, pas de l’IA ; la distance est la vraie distance routière.',
  ],
  note: 'Si Gemma renvoie un 503 ponctuel, renvoyer le message. Garder le filet : devis de démo déjà en base.',
});

slide(12, 'Démo — cas complexe (HITL)', {
  qui: 'Zakaria', duree: '1 min',
  sousTitre: 'Chat : « Marseille vers Lille, 120 personnes ».',
  puces: [
    'Au-delà de 85 passagers → message d’escalade, pas de devis automatique.',
    'La demande devient un cas complexe transmis à un humain avec le contexte.',
  ],
  note: 'Montrer que le système sait dire « non » à l’automatisation totale : c’est un gage de fiabilité, pas une limite.',
});

slide(13, 'Démo — côté client', {
  qui: 'Zakaria', duree: '1,5 min',
  sousTitre: 'De l’email à l’espace client.',
  puces: [
    'Bouton « Accepter » d’un email sans compte → inscription pré-remplie.',
    'Espace client : Mes devis (PDF, accepter/refuser avec motifs), Mes conversations, Mon compte.',
    '« Refuser » depuis l’email → page de motifs → relances stoppées.',
  ],
  note: 'Souligner le différenciateur (bonus livré) : le prospect suit ses devis et son historique.',
});

slide(14, 'Démo — dashboard admin (pilotage)', {
  qui: 'Zakaria', duree: '2 min',
  sousTitre: 'Connexion admin → /admin.',
  puces: [
    'KPIs, courbe d’évolution, camembert des motifs de refus, filtre par dates, export PDF.',
    'Cas complexe → devis sur-mesure (prix HT → TVA/TTC → envoi) → rejoint le pipeline.',
    'Messagerie HITL bidirectionnelle ; « Lancer les relances dues ».',
  ],
  note: 'C’est la preuve du pilotage par la donnée : la direction voit tout en temps réel.',
});

slide(15, 'Limites, MVP vs prod & coûts', {
  qui: 'Vincent', duree: '1,5 min',
  sousTitre: 'Ce qu’on assume, et le passage en production.',
  puces: [
    'n8n en tunnel local = choix MVP (0 €, dépend du PC) ; voie de prod 24/7 documentée.',
    'Prototype cohérent de bout en bout, pas une app de production (cas limites non exhaustifs) ; péages forfaitaires (P2).',
    'Coûts : ~0 €/mois (MVP) · ~0-1 €/mois (éco 24/7, n8n Oracle Free) · ~30 €/mois (prod sereine, recommandée).',
  ],
  note: 'Assumer franchement : la cohérence du parcours prime sur la perfection d’un maillon. Le seul élément à changer pour la prod : héberger n8n. 4 scénarios chiffrés dans COUTS_ET_PROD.md.',
});

slide(16, 'Ouverture vers une V2 & passation livrée', {
  qui: 'Vincent', duree: '1,5 min',
  sousTitre: 'Le projet a une suite claire et il est déjà reprenable.',
  puces: [
    'Ouverture V2 — P1 : héberger n8n 24/7 + Supabase Pro (base toujours active).',
    'Ouverture V2 — P2 : distance & péages enrichis par trajet, observabilité coût/tokens par devis, notifications internes (urgent, cas complexe).',
    'Ouverture V2 — P3 : canal WhatsApp officiel, A/B testing des relances, rôles fins (commercial / manager).',
    'Passation livrée (L3) : procédure repreneur (5 min), procédure équipe (termes en clair), maintenance (pricing, emails, statuts, relances), backlog ; + README, Swagger /docs, TypeDoc.',
  ],
  note: 'Deux messages : (1) le projet a une suite priorisée, (2) il vit déjà sans nous grâce à la doc de passation L3. Répond au critère « rendre la solution reprenable ».',
});

slide(17, 'Clôture & questions', {
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
