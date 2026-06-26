# À faire demain — SQL, test end-to-end & vérif doc

Checklist à dérouler dans l'ordre. Coche au fur et à mesure ; en cas de blocage,
note l'étape + le message d'erreur.

---

## 0. Préparation (SQL + env + lancement)

### 0.a — Base de données (Supabase → SQL Editor)
- [ ] Lancer **`supabase/reset-complet.sql`** (recrée le schéma À JOUR : adresse client,
      token devis, `raison_refus` + jeu de données propre, chaque demande liée à un client).
  - Variante si tu ne veux pas tout recréer : **`supabase/ajout-prenom.sql`** (migration
    non destructive) puis **`supabase/reset-demo.sql`** (réinjecte les données démo).
- [ ] Auth → **URL Configuration** → ajouter aux *Redirect URLs* :
      `http://localhost:3000/reset-password` (pour le mot de passe oublié).

### 0.b — Variables d'environnement (`web/.env.local`)
- [ ] `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- [ ] `CRON_SECRET=...` (présent)
- [ ] Supabase URL + anon + service role, `RESEND_API_KEY`, `EMAIL_FROM`, `N8N_WEBHOOK_URL` (présents)

### 0.c — Lancement
- [ ] **`start.bat`** (front + n8n) — vérifier dans les logs : pas d'erreur rouge.
- [ ] n8n : les **2 workflows publiés** (Agent = webhook, Relances = schedule).
- [ ] Ouvrir `http://localhost:3000`.

---

## 1. Parcours PROSPECT (le cœur)
- [ ] Chat : *« Lyon vers Annecy, 50 personnes, aller-retour le 12 juillet 2026 »*.
- [ ] La **barre récap** se remplit (icônes Lucide : trajet, date, pax…).
- [ ] Le devis **n'apparaît qu'au moment** où l'agent demande l'email (pas avant).
- [ ] Donner **ton vrai email** → email reçu : facture propre + logo + réf `DV-…`,
      **bouton « Créer mon compte / Accepter »** + lien **« Refuser ce devis »**.
- [ ] Encart dev (en bas du chat, visible en local) → tester **« CAS COMPLEXE >85 pax »**
      → bannière avec la **raison** affichée.

## 2. Parcours CLIENT
- [ ] `/login` (boutons démo visibles en local) → **Client 1** → header **« Bonjour, Lucas »**.
- [ ] `/espace-client` → **Refuser** un devis → cocher des motifs → **Confirmer**.
- [ ] **Accepter** un autre devis → invitation à **compléter l'adresse** (section *Mon compte*) →
      enregistrer → re-télécharger le PDF : l'**adresse** apparaît sur la facture.
- [ ] **Mot de passe oublié** depuis `/login` → recevoir l'email → `/reset-password` → changer.
- [ ] Garde de route : en client, taper `/admin` dans l'URL → **redirigé**.

## 3. Parcours ADMIN
- [ ] `/login` → **Admin** → `/admin` (si ça redirige vers l'espace client : relancer
      `ajout-prenom.sql` qui réassigne le rôle admin).
- [ ] KPIs remplis ; **trier** une colonne (clic en-tête) ; **rechercher** un client ;
      cliquer une **catégorie** pour filtrer.
- [ ] Cas complexe → déplier → **Devis sur-mesure** (saisir un prix HT → « Créer et envoyer »)
      → la demande passe en *devis envoyé* et rejoint le pipeline.
- [ ] Ouvrir un devis **refusé** → voir le **motif de refus**.
- [ ] **Lancer les relances dues** → message clair (X relances / clôturées / expirées).

## 4. Divers / finitions
- [ ] **Widget chat flottant** (bas-droite) sur une page interne → reprend la **même
      conversation** que la landing (persistance).
- [ ] **/contact** → envoyer un message → reçu sur **contact@am-creative.fr**.
- [ ] **/mentions-legales** et **/confidentialite** s'affichent.
- [ ] **404** : aller sur une URL bidon → page 404 stylée.
- [ ] Responsive : réduire la fenêtre / mobile → chat, dashboard, landing restent lisibles.

---

## 5. Vérifier la DOCUMENTATION
- [ ] **API interactive (Swagger)** → `http://localhost:3000/docs` :
      toutes les routes listées, dépliables (corps + réponses + autorisations).
- [ ] **Référence du code (TypeDoc)** → `cd web && npm run doc` puis ouvrir
      `web/docs/index.html` : les modules `lib/` documentés (calculerDevis, relances…).
- [ ] **DOC_TECHNIQUE.md** se lit bien ; l'antisèche « où modifier quoi » est juste.
- [ ] **supabase/SCHEMA.md** : le diagramme mermaid s'affiche (GitHub/éditeur mermaid).

## 6. Vérifs techniques (terminal)
```bash
# moteur de prix (racine)
npm test                 # 13/13

# front (web/)
cd web
npm run lint             # 0 erreur
npx vitest run           # 26/26
npm run build            # Compiled successfully
```

---

## Si quelque chose coince
- Pas de devis dans le chat → logs n8n (extraction JSON / modèle Gemma), souvent un 500
  transitoire : renvoyer le message.
- Devis OK mais rien en base / pas d'email → logs du front (`/api/chat`), vérifier les clés
  Supabase service role + `RESEND_API_KEY`.
- `/admin` redirige → rôle admin manquant : relancer `ajout-prenom.sql`.
- Email non reçu → vérifier que tu as mis une **vraie** adresse (les comptes démo
  `client1@email.fr` n'ont pas de boîte réelle).
