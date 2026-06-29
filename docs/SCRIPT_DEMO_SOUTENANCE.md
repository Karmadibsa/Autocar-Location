# Script de démo — soutenance Autocar Location

Durée cible : **~8-10 min de démo** + questions. Avant de commencer : lancer
**`lancer-n8n-tunnel.bat`** (2 fenêtres n8n + ngrok) et avoir rejoué `reset-complet.sql`
pour des données propres.

---

## 0. Pitch d'ouverture (30 s)
> « Autocar Location automatise le **cycle commercial** d'un intermédiaire en transport de
> groupe : un prospect décrit son besoin en langage naturel, l'IA qualifie, et un **devis
> chiffré automatiquement** part par email — avec relances et un dashboard de pilotage.
> Notre **règle d'or** : l'IA comprend, mais le **prix vient toujours d'un moteur déterministe**,
> jamais du modèle de langage. C'est reproductible et auditable. »

## 1. Le parcours prospect (le cœur) — 2 min
- Sur la landing, montrer le **chat**. Taper : *« Lyon vers Annecy, 50 personnes, aller-retour le 12 juillet 2026 »*.
- Souligner : la **barre « Votre demande »** se remplit en direct, l'agent demande l'email.
- Donner un vrai email → **carte devis** + **email reçu** (montrer la boîte mail + le PDF + les boutons Accepter/Refuser).
- Phrase clé : *« le prix est calculé par notre moteur, pas par l'IA ; et la distance est la vraie distance routière. »*

## 2. Le cas complexe (intervention humaine) — 1 min
- Taper : *« Marseille vers Lille, 120 personnes »* → message d'**escalade** (> 85 passagers).
- Phrase clé : *« au-delà d'un seuil, on bascule sur un humain — c'est le HITL. »*

## 3. Côté client — 1,5 min
- Bouton **Accepter** d'un email envoyé à une adresse **sans compte** → **inscription pré-remplie**.
- Dans l'**espace client** : mini-dashboard (KPIs), onglets **Mes devis / Mes conversations / Mon compte**, **accepter/refuser** (avec motifs), compléter l'adresse pour la facture.

## 4. Côté admin (pilotage) — 2,5 min
- Connexion admin → **/admin**.
- Montrer : **KPIs**, **courbe** d'évolution, **camembert des motifs de refus**, **filtre par dates**, **export PDF**.
- **Cas complexe** → déplier → **devis sur-mesure** (saisir un prix HT, aperçu TVA/TTC, envoyer) → la demande rejoint le pipeline.
- **Lancer les relances dues**.

## 5. La technique & les choix — 1,5 min
- **Architecture** (montrer DIAGRAMMES.md) : Next.js (Netlify) + n8n/Gemma + Supabase + Resend.
- **1 seul appel LLM** (extraction) ; le reste est déterministe → rapide, fiable, pas de fuite de raisonnement.
- **Sécurité** : RLS Supabase + service role côté serveur uniquement.
- **Doc** : montrer **`/docs`** (Swagger interactif) → « toute l'API est documentée et explorable ».
- **MVP vs prod** (assumé) : n8n en **tunnel** (0 €, PC allumé) ; pour de la **vraie prod 24/7** → n8n hébergé. Coûts détaillés dans **COUTS_ET_PROD.md** (~30 €/mois en prod sereine, ~0 € en éco).

---

## Questions probables (réponses prêtes)
- **« Pourquoi pas le LLM pour le prix ? »** → reproductibilité, auditabilité, zéro hallucination tarifaire ; le LLM ne fait qu'extraire.
- **« C'est vraiment en ligne ? »** → oui, front + base + emails 24/7 ; seul l'agent (chat) dépend du tunnel → expliqué, et la voie de prod est documentée.
- **« Et si Gemma tombe / sature (503) ? »** → retries automatiques ; et le moteur de prix + la réponse ne dépendent pas du LLM.
- **« Combien ça coûterait en vrai ? »** → COUTS_ET_PROD.md : 4 scénarios chiffrés.
- **« Comment un autre dev reprend le projet ? »** → PASSATION.md (orientation 5 min) + DIAGRAMMES + DOC_TECHNIQUE + Swagger/TypeDoc.

## Filet de sécurité (si le chat live échoue)
- Gemma peut renvoyer un 503 ponctuel → **renvoyer le message** (ça repart).
- En secours : un **devis de démo est déjà en base** (jeu `reset-complet.sql`) → montrer l'espace client + l'admin remplis sans dépendre du live.
