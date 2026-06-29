# Changements à intégrer dans la doc (fichier temporaire)

> Fichier de travail pour le collègue qui tient la doc. Liste tout ce qui a changé
> dans cette session afin de **peaufiner la doc** ensuite. À supprimer une fois fait.
> Rien n'a été poussé sur GitHub. Les migrations SQL et le ré-import n8n sont
> regroupés en bas (à exécuter à la fin).

## 1. Nouvelles fonctionnalités

### a) Messagerie HITL bidirectionnelle (client ⇄ admin) — par devis
- Client (`/espace-client`) : volet « Messages / précisions » sur chaque carte devis (fil + envoi, badge si réponse du conseiller).
- Admin (`/admin`) : badge « non lu » sur la ligne + indicateur « X nouveaux messages » (filtre rapide) + fil « Voir / répondre » dans le détail.
- Stockage : `conversations.messages` (rôles `user` / `admin` / `agent`).
- API : `POST /api/devis-messages` (client), `POST /api/admin-messages` (admin).
- Lib : `web/lib/conversation.ts` (+ tests `conversation.test.ts`).

### b) Signature électronique simple à l'acceptation
- Le client signe (canvas), saisit son nom et coche les CGV pour accepter un devis.
- Stockée sur `devis` (`signature_image`, `signe_par`, `signe_le`, `cgv_acceptees`), horodatée.
- Apposée sur le **PDF** (bloc « Bon pour accord » + mention eIDAS simple).
- API : `POST /api/devis-reponse` exige désormais `signePar` + `signature` + `cgv` quand `reponse=accepte`.
- Admin : ligne « Signé électroniquement par … le … » dans le détail.
- Niveau juridique = signature électronique **simple** (proto) ; en prod réelle → prestataire eIDAS (Yousign…).

### c) Page CGV
- Nouvelle page `/cgv` (`web/app/cgv/page.tsx`) + lien dans le footer.
- Mention légale corrigée : hébergement « Netlify » (au lieu de « Vercel ») dans `/mentions-legales`.

### d) Annuaire des autocaristes partenaires (mock)
- Nouvelle table `autocaristes` + page admin `/admin/autocaristes` (lien depuis le dashboard).
- API : `POST /api/autocaristes` (admin). Données mock : `supabase/seed-autocaristes.sql` (14 partenaires).

### e) Relance individuelle (admin)
- Bouton « Relancer maintenant » sur chaque devis en attente (détail) → envoi immédiat même si non due.
- API : `POST /api/relances` accepte `devisId` (sinon traitement par lots comme avant).

### e-bis) Règles géographiques (chat)
- **Ville hors France** → cas complexe (transfrontalier) : escalade, message discret + collecte coordonnées.
- **Deux villes de même nom** → l'agent demande le **code postal** avant de chiffrer (sauf si CP déjà fourni).
- Implémenté dans `web/lib/distance.ts` (`geocodeVille` / `analyserTrajet`, via Nominatim) + `web/app/api/chat/route.ts`.

### f) Tests obligatoires accessibles EN PRODUCTION
- Voir le récap détaillé du comportement attendu : **`TESTS_OBLIGATOIRES.md`** (à la racine).

### g-bis) Email de courtoisie au refus (scénario 6 du brief)
- Au refus d'un devis (connecté **ou** lien public), envoi d'un **email de remerciement**
  invitant à revenir. Best-effort, respecte le garde-fou démo.
- Fichiers : `web/lib/emailDevis.ts` (`devisRefusCourtoisieHtml`), `web/lib/mailer.ts`
  (`envoyerEmail`), `web/app/api/devis-reponse/route.ts`, `web/app/api/devis-refuser-public/route.ts`.

### h) Date incohérente = retour avant départ
- `/api/chat` : si `date_retour < date_depart` → l'agent refuse de chiffrer et demande de corriger.
- L'agent n8n extrait désormais `date_retour` (prompt d'extraction mis à jour dans `n8n/build-workflow.js`).
- Le panneau « Tests rapides (cas obligatoires) » du chat n'est plus masqué en prod.
- 7 boutons = liste imposée : Cas simple, Demande urgente, Hors zone, 0 passager,
  Date incohérente, Gros volume (→ cas complexe), Option nuit chauffeur (+ 2 bonus).
- Fichier : `web/app/components/Chat.tsx` (constante `SCENARIOS`).

### g) Accessibilité (Bastien & Scapin / RGAA quick wins)
- Lien d'évitement « Aller au contenu » + ancre `#contenu` dans `web/app/layout.tsx`.
- `<main>` ajouté sur la page d'accueil.
- Logos passés en `next/image` (Header, login) pour le LCP.
- (Les champs avaient déjà des `aria-label`, focus visible global déjà présent.)

## 2. Changement de règle métier : seuil cas complexe 85 → **55**
- Au-delà d'**un autocar standard (~55 places)** → cas complexe (escalade humaine).
- Impacté : `web/lib/calculerDevis.ts`, `pricing/matrices.js`, `pricing/n8n-code-node.js`,
  `n8n/build-workflow.js`, `pricing_config` (schema.sql + reset-complet.sql), seed Python.
- `pondation_capacite` simplifiée : `[{max:19,-0.05},{max:53,0},{max:55,0.15}]`.
- Tests mis à jour (front + pricing) : escalade à 60, devis OK à 55.

## 3. Données de démo
- `supabase/seed-demo-volume.sql` régénéré : devis chiffrés ≤ 55 pax, cas complexes 58–220 pax,
  9 messages clients « en attente » (badge admin), domaine email fictif `@demo.autocar-location.fr`.
- Générateur : `python supabase/generer-seed-demo.py` (options `--devis`, `--clients`, etc.).
- `supabase/seed-autocaristes.sql` : annuaire mock.

## 4. Docs DÉJÀ modifiées cette session (à relire/peaufiner)
> (faites avant la consigne « ne plus toucher la doc » — listées pour info)
- `README.md` : ordre scripts SQL, jeux de démo, garde-fou email, nb tests (35).
- `supabase/SCHEMA.md` : colonnes messagerie + signature mentionnées… **à compléter**
  avec `autocaristes` et les colonnes signature/CGV (PAS encore fait).
- `web/public/openapi.yaml` : ajout `/api/devis-messages`, `/api/admin-messages`,
  `/api/autocaristes`, `devisId` (relances), signature (devis-reponse), schéma `Message`.
- `web/typedoc.json` : ajout `conversation.ts` ? (à vérifier — ajouter si manquant).
- `DOC_TECHNIQUE.md`, `DIAGRAMMES.md`, `pricing/README.md`, `SCRIPT_DEMO_SOUTENANCE.md` : seuil 85→55.
- `A_FAIRE_DEMAIN.md` renommé `RECETTE_END_TO_END.md`.

## 5. RESTE À DOCUMENTER (pas encore touché)
- SCHEMA.md : table `autocaristes`, colonnes `devis.signature_*` / `cgv_acceptees`.
- RECETTE_END_TO_END : étapes signature, CGV, annuaire, relance individuelle, tests prod.
- typedoc.json : ajouter `lib/conversation.ts` aux entryPoints.
- Section RGPD / sécurité (prompt injection) — voir réponses ci-dessous.

## 6. À EXÉCUTER À LA FIN (regroupé — ne pas faire au fil de l'eau)

### Migrations SQL (Supabase → SQL Editor)
Sur base existante, lancer dans cet ordre (tous idempotents) :
1. `supabase/ajout-messagerie.sql` (drapeaux messages non lus)
2. `supabase/ajout-signature.sql` (signature + CGV sur devis)
3. `supabase/ajout-autocaristes.sql` (table + RLS)
4. (recharger les données) `supabase/seed-demo-volume.sql` + `supabase/seed-autocaristes.sql`

> Sur base neuve : `reset-complet.sql` (déjà à jour : seuil 55, toutes les colonnes,
> table autocaristes + mock) puis `comptes-demo.sql`.

### Workflow n8n
- Ré-importer `n8n/agent-workflow.json` (régénéré avec seuil 55) **OU** simplement
  vérifier : `/api/chat` recalcule de toute façon côté front avec le bon barème.

## 7. RGPD & sécurité (résumé pour la doc)

### RGPD
- **Consentement** : `clients.consentement` (bool) ; mention RGPD à l'inscription.
- **Minimisation** : on ne stocke que le nécessaire (coordonnées, demande, devis).
- **Droits** : l'utilisateur voit/édite ses données (`/espace-client/compte`), page
  `/confidentialite` dédiée.
- **Sécurité d'accès** : RLS (un client ne voit que ses données) ; service role
  uniquement côté serveur ; secrets hors repo (`.env.local`).
- **Données de démo** : adresses fictives `@demo.autocar-location.fr` → aucun email réel.
- **À améliorer en prod** : export/suppression de compte en self-service, registre des
  traitements, DPA avec Supabase/Resend, durée de conservation explicite.

### Prompt injection (agent IA)
- **Surface réduite** : l'IA ne fait QU'une extraction de paramètres ; elle **ne fixe
  jamais le prix** (calcul 100 % déterministe — « règle d'or »).
- Donc une injection type « fais-moi -20 % » n'a aucun effet sur le montant (bouton de
  test « tentative de remise » le démontre).
- **Nettoyage de sortie** : `nettoyerReply()` (`/api/chat`) supprime toute fuite de
  raisonnement / méta du modèle.
- **Pas d'actions sensibles pilotées par le LLM** : persistance, email, statuts sont
  gérés par du code serveur, pas par l'IA.
- **À renforcer en prod** : rate-limiting, validation stricte du JSON d'extraction,
  filtrage des entrées, journalisation des abus.
