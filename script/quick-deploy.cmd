@echo off
setlocal

REM ===============================================
REM    Déploiement Rapide - Client seulement
REM ===============================================

REM Configuration (utilise les variables d'environnement)
set "VPS_HOST=%DEPLOY_HOST%"
set "VPS_USER=%DEPLOY_USER%"
set "VPS_PATH=%DEPLOY_PATH%"

REM Valeurs par défaut si les variables d'environnement ne sont pas définies
if "%VPS_HOST%"=="" set "VPS_HOST=your-server.com"
if "%VPS_USER%"=="" set "VPS_USER=root"
if "%VPS_PATH%"=="" set "VPS_PATH=/var/www/spotify-connect"

echo 📋 Configuration:
echo    Serveur: %VPS_USER%@%VPS_HOST%
echo    Chemin: %VPS_PATH%
echo.

echo 🔨 Build du client...
cd client
npm run build
if errorlevel 1 (
    echo ❌ ERREUR : Build échoué
    pause
    exit /b 1
)
cd ..

echo 📤 Déploiement...
scp -r client\build %VPS_USER%@%VPS_HOST%:%VPS_PATH%/client/

if errorlevel 1 (
    echo ❌ ERREUR : Déploiement échoué
    pause
    exit /b 1
)

echo.
echo ✅ Déploiement rapide terminé !
echo 🌐 https://spotify-connect.mooo.com
echo.

pause