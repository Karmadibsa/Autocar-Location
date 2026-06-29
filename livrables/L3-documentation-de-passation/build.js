// build.js — Génère le Livrable 3 « Documentation de passation » NeoTravel en .docx
// Lancer : node build.js   (depuis ce dossier). Sortie : L3-Documentation-de-passation-NeoTravel.docx
const k = require('../_docx-kit');
const { H1, H2, P, run, code, bullet, numbered, makeTable, callout, codeBlock, cover, toc, buildDoc, pageBreak, path } = k;

const logo = path.join(__dirname, '..', 'assets', 'logo-neotravel.png');
const body = [];

// ---------------------------------------------------------------------------
body.push(H1('1. Objet & mode d’emploi'));
body.push(P([run('Cette documentation permet à la solution de '), run('vivre et d’évoluer sans ses créateurs', { bold: true }), run('. Elle s’organise en quatre parties complémentaires, chacune destinée à un public précis et résumées dans le tableau ci-dessous :')]));
body.push(makeTable(
  ['Partie', 'Pour qui', 'Contenu'],
  [
    ['A — Repreneur technique', 'Développeur qui reprend le code', 'Orientation, lancement, carte du code, déploiement, tests'],
    ['B — Équipe NeoTravel', 'Commerciaux & direction', 'Vocabulaire simple + usage quotidien de l’outil'],
    ['C — Maintenance courante', 'Développeur', 'Où modifier pricing, emails, statuts, relances'],
    ['D — Évolutions', 'Équipe + direction', 'Backlog P1/P2/P3 et prochaines évolutions'],
  ],
  [2400, 2900, 4060],
));

// ===========================================================================
// PARTIE A — REPRENEUR TECHNIQUE
// ===========================================================================
body.push(pageBreak());
body.push(H1('Partie A — Procédure « repreneur » (technique)'));
body.push(H2('A.1 Le projet en 30 secondes'));
body.push(P([run('Application qui '), run('automatise le cycle commercial', { bold: true }), run(' d’un intermédiaire en transport de groupe : un chatbot qualifie le besoin → un devis chiffré automatiquement (règles fixes, jamais l’IA) → email + PDF → relances auto → dashboard. Stack : Next.js (Netlify) + Supabase + n8n/Gemma + Resend.')]));
body.push(callout('Règle d’or :', [run('l’IA comprend et oriente, mais le '), run('prix vient toujours du code déterministe', { bold: true, color: k.ACCENT_DK }), run(' ('), code('calculerDevis'), run('), jamais du modèle de langage.')]));
body.push(H2('A.2 Carte des documents'));
body.push(P('Le tableau ci-dessous oriente vers le bon document selon ce que l’on cherche à faire, pour éviter de tout lire en bloc.'));
body.push(makeTable(
  ['Tu veux…', 'Lis'],
  [
    ['Comprendre vite le projet', 'README.md'],
    ['Voir les schémas (archi, parcours, BDD, statuts)', 'DIAGRAMMES.md'],
    ['Comprendre le code (où modifier quoi)', 'DOC_TECHNIQUE.md'],
    ['L’API en interactif', 'lancer le front → /docs (Swagger) ; ou npm run doc (TypeDoc)'],
    ['Le modèle de données', 'supabase/SCHEMA.md'],
    ['Déployer / les coûts', 'DEPLOIEMENT.md · COUTS_ET_PROD.md'],
    ['Tester que tout marche', 'RECETTE_END_TO_END.md'],
    ['Monter l’agent n8n / le moteur de prix', 'n8n/README.md · pricing/README.md'],
  ],
  [4200, 5160],
));
body.push(H2('A.3 Démarrer en local (5 min)'));
body.push(...codeBlock([
  '# 1. Moteur de prix (aucune clé)',
  'npm install && npm test',
  '# 2. Base : exécuter supabase/reset-complet.sql dans Supabase (SQL Editor)',
  '# 3. Front',
  'cd web && cp .env.local.example .env.local   # remplir les clés',
  'npm install && npm run dev                   # http://localhost:3000',
  '# 4. Agent : importer n8n/agent-workflow.json (+ credential Gemini)',
]));
body.push(P([run('Vérifs : '), code('cd web && npm run lint'), run(' (0) · '), code('npx vitest run'), run(' · '), code('npm run build'), run('.')]));
body.push(H2('A.4 Les 5 choses à savoir'));
[
  'Prix déterministe : tout changement de tarif se fait dans pricing/matrices.js (+ table pricing_config), pas dans le LLM.',
  'Un seul appel LLM : n8n n’appelle Gemma qu’une fois (extraction) ; le nœud Code calcule le prix ET rédige la réponse.',
  'Sécurité : le navigateur n’a que la clé anon (RLS) ; les routes /api/* utilisent la service role côté serveur après vérification du token/rôle.',
  'Emails serverless : on attend (await) la persistance avant de répondre dans /api/chat (sinon l’email ne partirait pas).',
  'n8n en tunnel = choix MVP (0 €, PC allumé). Pour la prod 24/7 → n8n hébergé (voir COUTS_ET_PROD.md).',
].forEach((t) => body.push(numbered(t)));
body.push(H2('A.5 Carte du code (où se trouve quoi)'));
body.push(P('Le tableau suivant situe, dossier par dossier, où se trouve quoi dans le code, afin de localiser rapidement la partie à faire évoluer.'));
body.push(makeTable(
  ['Dossier', 'Rôle'],
  [
    ['web/app/', 'Pages (landing, login, espace-client, admin, contact…)'],
    ['web/app/api/', 'Toute la logique métier (chat, relances, admin-data, devis-pdf…)'],
    ['web/lib/', 'Fonctions réutilisables & testées (calculerDevis, distance, devisPdf, emailDevis, relances…)'],
    ['pricing/', 'Moteur de devis déterministe (source de vérité) + tests'],
    ['n8n/', 'Workflows de l’agent + générateur + guides'],
    ['supabase/', 'Schéma SQL, resets, jeux de données, SCHEMA.md'],
  ],
  [2200, 7160],
));
body.push(H2('A.6 Déploiement & variables d’environnement'));
body.push(P([run('Procédure complète dans '), code('DEPLOIEMENT.md'), run('. Variables sur Netlify : Supabase (URL, anon, service_role), '), code('N8N_WEBHOOK_URL'), run(', '), code('RESEND_API_KEY'), run(', '), code('EMAIL_FROM'), run(', '), code('CRON_SECRET'), run(', '), code('NEXT_PUBLIC_SITE_URL'), run('. La clé du LLM reste dans n8n.')]));

// ===========================================================================
// PARTIE B — ÉQUIPE NEOTRAVEL
// ===========================================================================
body.push(pageBreak());
body.push(H1('Partie B — Procédure « équipe NeoTravel »'));
body.push(P('Cette partie s’adresse aux commerciaux et à la direction : elle explique le vocabulaire en mots simples, puis l’usage quotidien de l’outil. Aucune compétence technique requise.'));
body.push(H2('B.1 Les termes clés, expliqués simplement'));
body.push(P('Le tableau ci-dessous traduit en mots simples les termes que l’on rencontre dans l’outil et la documentation, sans jargon technique.'));
body.push(makeTable(
  ['Terme', 'En clair'],
  [
    ['Lead / demande', 'Un prospect qui exprime un besoin de transport.'],
    ['Agent IA / chatbot', 'L’assistant qui discute avec le prospect et comprend son besoin. Il oriente, il ne fixe pas les prix.'],
    ['Devis déterministe', 'Le prix est calculé par des règles fixes (le « moteur »), pas par l’IA. Il est donc toujours juste et explicable.'],
    ['Qualification', 'Vérifier qu’une demande est complète (trajet, dates, passagers) avant de chiffrer.'],
    ['Cas complexe / escalade', 'Une demande trop grosse (> 85 passagers) ou atypique : l’outil passe la main à un commercial.'],
    ['HITL (humain dans la boucle)', 'Les décisions sensibles restent validées par un humain.'],
    ['Relance', 'Email de rappel automatique si le client ne répond pas (J+2, J+3, J+7, max 2).'],
    ['Pipeline', 'La liste des demandes et leur état d’avancement (nouveau, devis envoyé, accepté…).'],
    ['Dashboard', 'L’écran de pilotage : chiffres clés, courbes, export.'],
  ],
  [3000, 6360],
));
body.push(callout('À ne jamais dire :', [run('« l’IA calcule le prix ». La bonne formulation : '), run('l’agent collecte les informations et appelle le moteur', { bold: true }), run(' qui calcule le prix de manière déterministe.')]));
body.push(H2('B.2 Utiliser l’outil au quotidien'));
body.push(P([run('Se connecter sur '), code('/login'), run(' (compte admin) → arrivée sur le dashboard '), code('/admin'), run('.')]));
body.push(P('Le tableau ci-dessous regroupe les actions les plus courantes et la manière de les réaliser depuis le dashboard.'));
body.push(makeTable(
  ['Je veux…', 'Comment faire'],
  [
    ['Voir l’activité', 'Dashboard : KPIs, courbe leads/acceptés, camembert des motifs de refus.'],
    ['Filtrer une période', 'Choisir une plage de dates (Du / Au) — tout se recalcule.'],
    ['Exporter un bilan', 'Bouton « Export PDF » des statistiques.'],
    ['Retrouver une demande', 'Table : recherche par client/ville, tri par colonne, filtre par catégorie.'],
    ['Traiter un cas complexe', 'Déplier la demande → saisir un prix HT → aperçu TVA/TTC → envoyer. Le client reçoit le devis.'],
    ['Marquer gagné / perdu', 'Sur une demande : « Accepté » ou « Perdu ».'],
    ['Répondre à un client', 'Messagerie : badge « nouveaux messages » → ouvrir → répondre. Le client reçoit la réponse.'],
    ['Lancer les rappels', 'Bouton « Lancer les relances dues ».'],
  ],
  [3000, 6360],
));
body.push(H2('B.3 Les 7 situations gérées'));
body.push(P('Le tableau suivant décrit les sept situations commerciales que l’outil sait gérer et le comportement attendu pour chacune.'));
body.push(makeTable(
  ['Situation', 'Ce qui se passe'],
  [
    ['Demande simple complète', 'Qualifiée, devis calculé et envoyé, pipeline à jour.'],
    ['Demande incomplète', 'L’agent réclame les infos manquantes avant de chiffrer.'],
    ['Demande urgente', 'Priorité haute, majoration selon anticipation.'],
    ['Devis sans réponse', 'Relances automatiques J+2 ou J+3/J+7 (max 2), puis clôture.'],
    ['Devis accepté', 'Statut « gagné », relances stoppées.'],
    ['Devis refusé', 'Statut mis à jour, motif conservé (camembert).'],
    ['Cas complexe', 'Transfert à un commercial avec tout le contexte.'],
  ],
  [3000, 6360],
));

// ===========================================================================
// PARTIE C — MAINTENANCE COURANTE
// ===========================================================================
body.push(pageBreak());
body.push(H1('Partie C — Comment modifier pricing, emails, statuts, relances'));
body.push(P('Antisèche destinée au développeur qui maintient l’outil. Règle générale : modifier la logique pure (web/lib/ ou pricing/), relancer les tests, puis reporter dans n8n si nécessaire.'));
body.push(H2('C.1 Modifier le pricing'));
[
  'Tarifs / TVA / marge / coefficients : pricing/matrices.js (source de vérité) + table pricing_config en base.',
  'Reporter la même valeur dans le miroir TS web/lib/calculerDevis.ts ET dans le nœud Code n8n (pricing/n8n-code-node.js).',
  'Seuil d’escalade (85 pax) : seuil_escalade_passagers dans les matrices.',
  'Toujours relancer npm test après modification (anti-régression).',
].forEach((t) => body.push(bullet(t)));
body.push(callout('Important :', 'le barème est pilotable sans toucher à l’algorithme. Ne jamais déplacer le calcul du prix vers le LLM.'));
body.push(H2('C.2 Modifier les emails'));
[
  'Contenu / gabarit de l’email de devis : web/lib/emailDevis.ts.',
  'PDF joint (logo, mentions, totaux) : web/lib/devisPdf.ts.',
  'Expéditeur : variable EMAIL_FROM (doit appartenir au domaine vérifié sur Resend).',
  'Domaines « démo » sans envoi réel : variable EMAIL_DEMO_DOMAINS (garde-fou web/lib/emailGuard.ts).',
].forEach((t) => body.push(bullet(t)));
body.push(H2('C.3 Modifier les statuts'));
[
  'Cycle de vie d’une demande : enums dans supabase/schema.sql (et le code qui les fait évoluer dans web/app/api/*).',
  'Transitions : routes demande-statut, devis-reponse, devis-manuel.',
  'Voir le diagramme des statuts dans DIAGRAMMES.md (§5).',
].forEach((t) => body.push(bullet(t)));
body.push(H2('C.4 Modifier les relances'));
[
  'Cadence (J+2 / J+3 / J+7), nombre max, expiration : web/lib/relances.ts (logique pure, testée).',
  'Déclenchement planifié : workflow n8n relances-workflow.json (fréquence du Schedule Trigger).',
  'Exécution : web/app/api/relances/route.ts (protégée par CRON_SECRET).',
].forEach((t) => body.push(bullet(t)));

// ===========================================================================
// PARTIE D — BACKLOG & ÉVOLUTIONS
// ===========================================================================
body.push(pageBreak());
body.push(H1('Partie D — Backlog P1/P2/P3 & prochaines évolutions'));
body.push(H2('D.1 État livré (MVP)'));
body.push(P('Sont livrés et fonctionnels : moteur de devis testé, agent de qualification, devis PDF + email, relances, escalade HITL, dashboard de pilotage, espace client, messagerie HITL.'));
body.push(H2('D.2 Backlog priorisé des évolutions'));
body.push(P('Le tableau ci-dessous liste les évolutions envisagées, priorisées de P1 (la plus utile à court terme) à P3, avec le bénéfice attendu pour chacune.'));
body.push(makeTable(
  ['Priorité', 'Évolution', 'Bénéfice'],
  [
    ['P1', 'Héberger n8n 24/7 (Railway / Oracle Free / VPS)', 'Le chat ne dépend plus d’un PC allumé'],
    ['P1', 'Empêcher la mise en pause de Supabase (offre Pro)', 'Disponibilité continue de la base'],
    ['P2', 'Distance par API d’itinéraire enrichie + péages par trajet', 'Devis encore plus précis'],
    ['P2', 'Observabilité : coût/tokens par devis dans le dashboard', 'Pilotage fin du budget IA'],
    ['P2', 'Notifications internes (demande urgente, cas complexe)', 'Réactivité commerciale'],
    ['P3', 'Canal WhatsApp officiel (en plus de l’email)', 'Toucher le client sur son canal préféré'],
    ['P3', 'A/B testing des messages de relance', 'Meilleur taux de réponse'],
    ['P3', 'Rôles fins (commercial / manager) et droits associés', 'Organisation à plus grande échelle'],
  ],
  [1100, 5060, 3200],
));
body.push(callout('Critère de reprise :', 'le système peut vivre et évoluer sans ses créateurs — un développeur le relance en 5 min (Partie A), une équipe l’utilise sans formation technique (Partie B), et les réglages courants sont documentés (Partie C).'));

// ===========================================================================
buildDoc({
  title: 'Documentation de passation — NeoTravel',
  footerTitle: 'NeoTravel · Livrable 3 — Documentation de passation',
  outPath: path.join(__dirname, process.argv[2] || 'L3-Documentation-de-passation-NeoTravel.docx'),
  children: [
    ...cover({ logoPath: logo, title: 'DOCUMENTATION DE PASSATION', subtitle: 'Procédure repreneur & procédure équipes', livrable: 'Livrable 3 — Rendu du 29 juin 2026' }),
    ...toc(),
    ...body,
  ],
});
