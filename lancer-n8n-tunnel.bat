@echo off
chcp 65001 >nul
title Autocar Location - n8n + ngrok

REM ====================================================================
REM  >>> A REMPLIR UNE FOIS : ton domaine statique ngrok
REM      (cree-le sur https://dashboard.ngrok.com  ->  Domains)
set NGROK_DOMAIN=tummy-sheet-valiant.ngrok-free.dev
REM ====================================================================

echo ============================================================
echo   Autocar Location : n8n + tunnel ngrok
echo   URL publique : https://%NGROK_DOMAIN%
echo ============================================================
echo.
echo Ouverture de 2 fenetres : n8n + ngrok. Laisse-les ouvertes.
echo.

REM --- Fenetre 1 : n8n avec son URL publique (sinon webhooks en localhost) ---
start "n8n (Autocar Location)" cmd /k "set N8N_PROTOCOL=https&& set N8N_HOST=%NGROK_DOMAIN%&& set WEBHOOK_URL=https://%NGROK_DOMAIN%/&& npx n8n start"

REM --- Fenetre 2 : le tunnel ngrok (URL fixe -> localhost:5678) ---
start "ngrok" cmd /k "ngrok http 5678 --domain=%NGROK_DOMAIN%"

echo.
echo OK. Quand les 2 fenetres tournent, ouvre :  https://%NGROK_DOMAIN%
echo Variable Netlify : N8N_WEBHOOK_URL = https://%NGROK_DOMAIN%/webhook/neotravel
echo Pour tout arreter : ferme les 2 fenetres.
echo.
pause
