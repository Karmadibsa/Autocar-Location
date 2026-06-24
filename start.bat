@echo off
REM ============================================================
REM  NeoTravel - Demarrage COMPLET en un clic
REM  Lance n8n + le front, chacun dans sa fenetre, avec logs.
REM  Logs : logs\n8n.log et logs\front.log (pour diagnostiquer)
REM ============================================================
cd /d "%~dp0"
if not exist logs mkdir logs

echo ============================================================
echo   NeoTravel - Demarrage (n8n + front)
echo   Front : http://localhost:3000
echo   n8n   : http://localhost:5678
echo   Logs  : %~dp0logs\
echo ============================================================
echo.

REM --- Installer les dependances du front si besoin ---
if not exist "web\node_modules" echo Installation des dependances du front (premiere fois)...
if not exist "web\node_modules" cmd /c "cd /d %~dp0web && npm install"

REM --- Lancer n8n (fenetre dediee + log) ---
REM   (cmd /c "... 2>&1" fait la fusion stderr cote cmd : pas de bruit PowerShell)
echo Lancement de n8n...
start "NeoTravel - n8n" powershell -NoExit -Command "cmd /c 'npx --yes n8n start --tunnel 2>&1' | Tee-Object -FilePath '%~dp0logs\n8n.log'"

REM --- Lancer le front (fenetre dediee + log) ---
echo Lancement du front...
start "NeoTravel - Front" powershell -NoExit -Command "Set-Location '%~dp0web'; cmd /c 'npm run dev 2>&1' | Tee-Object -FilePath '%~dp0logs\front.log'"

echo.
echo Deux fenetres se sont ouvertes (n8n et front).
echo S'il y a un souci, regarde les fichiers dans le dossier logs\.
echo Pour tout arreter : ferme les deux fenetres.
echo.
pause
