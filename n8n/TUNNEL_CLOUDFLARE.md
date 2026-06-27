# n8n accessible en ligne via Cloudflare Tunnel (URL fixe, gratuit)

Objectif : exposer le n8n qui tourne **en local** derrière une **URL HTTPS stable**
(ex. `https://n8n.axel-momper.fr`) → à mettre **une seule fois** dans `N8N_WEBHOOK_URL`
sur Netlify. Gratuit, pas de carte bancaire.

> ⚠️ **Limite assumée (à dire en soutenance)** : avec un tunnel, n8n tourne sur ta
> machine → la *génération de devis par le chat* ne marche **que PC allumé**. Le reste
> du site (Netlify) tourne 24/7. **Pour une vraie prod**, on remplacerait le tunnel par
> un n8n **hébergé** : Oracle Cloud Free (gratuit, install Docker), Railway ou n8n Cloud
> (managé, payant). Voir `DEPLOIEMENT.md`.

## Prérequis
- Le domaine **`axel-momper.fr` doit être géré par Cloudflare** (DNS chez Cloudflare,
  plan gratuit). Si ton DNS est ailleurs et que tu ne veux pas y toucher → voir la
  **section ngrok** plus bas (URL fixe aussi, sans changer ton DNS).
- n8n installé (déjà le cas : `npx n8n`).

## Étapes (Windows / PowerShell)

### 1. Installer cloudflared
```powershell
winget install --id Cloudflare.cloudflared
```

### 2. Connecter cloudflared à ton compte Cloudflare
```powershell
cloudflared tunnel login
```
→ ouvre le navigateur, choisis le domaine `axel-momper.fr`.

### 3. Créer le tunnel
```powershell
cloudflared tunnel create n8n-autocar
```
(note l'ID affiché ; un fichier de credentials est créé dans `~/.cloudflared/`)

### 4. Router un sous-domaine vers le tunnel
```powershell
cloudflared tunnel route dns n8n-autocar n8n.axel-momper.fr
```
(crée automatiquement l'enregistrement DNS `n8n.axel-momper.fr` chez Cloudflare)

### 5. Lancer n8n en lui donnant son URL publique
n8n doit connaître son URL publique (sinon il génère des webhooks en `localhost`).
```powershell
$env:N8N_PROTOCOL="https"
$env:N8N_HOST="n8n.axel-momper.fr"
$env:WEBHOOK_URL="https://n8n.axel-momper.fr/"
npx n8n start
```
(NB : pas de `--tunnel` ici, c'est Cloudflare qui fait le tunnel.)

### 6. Démarrer le tunnel (dans un 2e terminal)
```powershell
cloudflared tunnel --url http://localhost:5678 run n8n-autocar
```
→ `https://n8n.axel-momper.fr` pointe maintenant vers ton n8n local.

### 7. Brancher le front
- **Netlify → Environment variables** : `N8N_WEBHOOK_URL = https://n8n.axel-momper.fr/webhook/neotravel` → **Redeploy**.
- **n8n** : importer `agent-workflow.json` + `relances-workflow.json`, choisir la credential Gemini sur les 2 nœuds Gemini, **publier**.
- Workflow **Relances** → nœud HTTP Request → `https://autocar-location.axel-momper.fr/api/relances`, body `{ "secret": "<CRON_SECRET>" }`.

Comme l'URL `n8n.axel-momper.fr` est **fixe**, tu n'as plus jamais à retoucher Netlify.

---

## Alternative sans toucher à ton DNS : ngrok (URL fixe gratuite)
ngrok offre **1 domaine statique gratuit** par compte (ex. `xxxx.ngrok-free.app`).
```powershell
winget install ngrok
ngrok config add-authtoken <ton-token>          # depuis le dashboard ngrok
# réserve ton domaine statique dans le dashboard ngrok, puis :
$env:WEBHOOK_URL="https://xxxx.ngrok-free.app/"
npx n8n start                                    # dans un terminal
ngrok http 5678 --domain=xxxx.ngrok-free.app     # dans un autre
```
Puis `N8N_WEBHOOK_URL = https://xxxx.ngrok-free.app/webhook/neotravel` sur Netlify.
Même principe, URL stable, **sans** mettre ton domaine sur Cloudflare.
