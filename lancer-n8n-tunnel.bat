@echo off
chcp 65001 >nul
title Autocar Location - n8n + Cloudflare Tunnel
echo ============================================================
echo   Autocar Location : n8n (public) + tunnel Cloudflare
echo   URL publique : https://n8n.axel-momper.fr
echo ============================================================
echo.
echo Ouverture de 2 fenetres : n8n + tunnel Cloudflare.
echo Laisse-les ouvertes pendant l'utilisation / la demo.
echo.

REM --- Fenetre 1 : n8n avec son URL publique (sinon webhooks en localhost) ---
start "n8n (Autocar Location)" cmd /k "set N8N_HOST=n8n.axel-momper.fr&& set N8N_PROTOCOL=https&& set WEBHOOK_URL=https://n8n.axel-momper.fr/&& npx n8n start"

REM --- Fenetre 2 : le tunnel Cloudflare (route n8n.axel-momper.fr -> localhost:5678) ---
start "Cloudflare Tunnel" cmd /k "cloudflared tunnel run n8n-autocar"

echo.
echo OK. Quand les 2 fenetres tournent, ouvre :  https://n8n.axel-momper.fr
echo Pour tout arreter : ferme les 2 fenetres.
echo.
pause
