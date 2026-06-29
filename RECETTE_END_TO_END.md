# Recette end-to-end — Autocar Location (app déployée)

À dérouler dans l'ordre. ✅ = OK, sinon note l'étape + l'erreur.
Site : **https://autocar-location.axel-momper.fr** · Admin n8n : **https://tummy-sheet-valiant.ngrok-free.dev**

---

## 🤝 Recette finale en équipe (à faire ensemble, sur le site en ligne)

> Objectif : **valider en groupe** que tout tourne avant la soutenance. Quelqu'un doit
> avoir lancé **`lancer-n8n-tunnel.bat`** (sinon le chat ne génère pas de devis).
> Chacun ouvre **https://autocar-location.axel-momper.fr** sur **son** téléphone/PC.

**Répartition suggérée**
- **Personne A** (prospect) : fait un devis dans le chat avec **sa vraie adresse mail**.
- **Personne B** (client) : reçoit/teste les boutons de l'email + l'espace client.
- **Personne C** (admin) : vérifie le dashboard pendant que A et B agissent.

**Chemin critique (doit marcher) — cocher OK / KO**
- [ ] A : chat *« Lyon vers Annecy, 50 personnes, aller-retour le 12 juillet 2026 »* → réponse rapide + **devis affiché**.
- [ ] A : reçoit l'**email** (devis + PDF + 2 boutons).
- [ ] B : **Refuser** depuis l'email → page + motifs → confirmé.
- [ ] B : **Accepter** (email sans compte) → **inscription pré-remplie** → crée le compte → **espace client**.
- [ ] B : dans l'espace, **accepter** un devis, **télécharger le PDF**, compléter **l'adresse**.
- [ ] C : sur **/admin**, voit la **nouvelle demande** de A apparaître, les **KPIs**, la **courbe**, le **camembert**.
- [ ] C : traite un **cas complexe** (devis sur-mesure) → le client le reçoit.
- [ ] C : **Lancer les relances dues** → message OK.
- [ ] Tous : tester sur **mobile** (responsive) + la page **/contact**.

**Verdict d'équipe** : tout coché ⇒ ✅ prêt pour la soutenance.
Nom + date du test : ____________________

---

## Détail complet (référence)

---

## 0. Prérequis (avant de tester)
- [ ] **`lancer-n8n-tunnel.bat`** lancé → 2 fenêtres (n8n + ngrok) ouvertes.
- [ ] n8n : workflow **« Autocar Location - Agent (1 LLM) »** **actif/publié** + credential Gemini OK ; workflow **Relances** publié.
- [ ] Netlify : `N8N_WEBHOOK_URL` = `https://tummy-sheet-valiant.ngrok-free.dev/webhook/neotravel` + déploiement vert.
- [ ] Supabase, dans l'ordre : `reset-complet.sql` (schéma) → `comptes-demo.sql` (comptes, 1 fois) → `seed-demo-volume.sql` (gros volume démo, ~500 devis).
  - Les clients fictifs sont sur `@demo.autocar-location.fr` → **aucun email réel** n'est envoyé (garde-fou `lib/emailGuard.ts`). Pour tester un vrai email, utiliser un compte sur un autre domaine (ex. `v.conter@live.fr`).

---

## 1. Prospect → devis (le cœur)
- [ ] Chat : *« Lyon vers Annecy, 50 personnes, aller-retour le 12 juillet 2026 »*.
- [ ] L'agent répond **vite** (≈ 3-6 s), demande les infos manquantes au besoin.
- [ ] La **barre « Votre demande »** se remplit (trajet, **date au format 12/07/2026**, passagers…).
- [ ] Le devis ne s'affiche **qu'au moment** où l'agent dit « votre devis est prêt » + demande l'email.
- [ ] Donner un **vrai email** → **carte devis** affichée + **email reçu** (vérifier Resend + boîte mail).
- [ ] Email : en-tête soigné, **résumé**, HT/TVA/TTC, **2 boutons** (Accepter / Refuser), PDF joint.
- [ ] **Cas complexe** : *« Marseille vers Lille, 120 personnes… »* → message d'escalade avec la raison.

## 2. Email → Accepter / Refuser
- [ ] **Refuser** (lien email) → page de confirmation + **motifs (checkboxes)** → confirmé.
- [ ] **Accepter** avec un email **sans compte** → arrive sur **inscription pré-remplie** (prénom/nom/email).
- [ ] **Accepter** avec un email **ayant un compte** → arrive sur **connexion** (email pré-rempli).

## 3. Espace client (connecté)
- [ ] `/login` → connexion → header **« Bonjour {prénom} »**.
- [ ] Onglet **Mes devis** : liste + **Télécharger PDF** + **Accepter / Refuser (motifs)**.
- [ ] À l'acceptation sans adresse → invitation à compléter → onglet **Mon compte**.
- [ ] Onglet **Mon compte** : modifier téléphone/adresse → **Enregistrer** → rechargé OK.
- [ ] Onglet **Mes conversations** : historique visible.
- [ ] **Mot de passe oublié** depuis `/login` → email reçu → `/reset-password` → changé.
- [ ] Garde de route : en client, taper `/admin` → redirigé.

## 4. Admin (dashboard)
- [ ] `/login` (admin) → `/admin`.
- [ ] **KPIs** + **courbe** (leads/acceptés) + **camembert motifs de refus**.
- [ ] **Plage de dates** (Du/Au) → tout se recalcule ; **Export PDF** télécharge un PDF lisible.
- [ ] Table : **tri** (colonnes), **recherche** (client/ville), **filtre** par catégorie.
- [ ] **Cas complexe** → déplier → **devis sur-mesure** (prix HT → aperçu TVA/TTC → envoyer) → la demande rejoint le pipeline + email au client.
- [ ] Devis refusé → **motif de refus** visible dans le détail.
- [ ] **Lancer les relances dues** → message clair.

## 5. Divers
- [ ] **Widget chat flottant** (bas-droite, pages internes) → reprend la même conversation.
- [ ] **/contact** : formulaire + **motif (déroulant)** → email reçu sur contact@am-creative.fr.
- [ ] **/mentions-legales** et **/confidentialite** s'affichent.
- [ ] **404** : URL bidon → page « trompé d'arrêt » 🚌.
- [ ] **Responsive** : mobile → chat, landing, dashboard restent lisibles.

## 6. Vérifs techniques (local, terminal)
```bash
npm test                       # 13/13 (moteur de prix)
cd web && npm run lint         # 0 erreur
npx vitest run                 # 29/29
npm run build                  # Compiled successfully
```

---

## Si ça coince
- **Pas de devis dans le chat** → fenêtre n8n (exécution rouge ?) ; sinon Netlify → Logs → Functions → `chat`.
- **Pas d'email** → Netlify Logs `chat` (cherche `[chat] persistance échouée`) ; souvent colonne `token` manquante (SQL pas joué) ou `RESEND_API_KEY` absente sur Netlify.
- **/admin redirige** → rôle admin manquant : rejouer `ajout-prenom.sql`.
- **Lenteur / 503** → Gemma saturé (réessayer) ; le tunnel doit tourner.
