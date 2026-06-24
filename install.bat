@echo off
REM ============================================================
REM  NeoTravel - Installation (a lancer UNE fois)
REM  Installe les dependances et verifie le moteur de devis.
REM ============================================================
cd /d "%~dp0"
echo === Dependances racine (outils de generation des livrables) ===
call npm install
echo.
echo === Tests du moteur de devis (calculer_devis) ===
call npm test
echo.
echo === Dependances du front (web) ===
cd web
call npm install
echo.
echo === Termine. Lance start.bat pour demarrer le front. ===
pause
