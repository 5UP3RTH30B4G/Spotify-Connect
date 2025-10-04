@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo    🚀 DEPLOIEMENT SPOTIFY CONNECT (SSH)
echo ============================================

REM Lecture de la configuration
if not exist "deploy-config.env" (
    echo ❌ Fichier deploy-config.env introuvable
    echo    Créez le fichier avec votre configuration
    pause
    exit /b 1
)

echo 📖 Lecture de la configuration...
for /f "usebackq tokens=1,2 delims==" %%A in ("deploy-config.env") do (
    if not "%%A"=="" if not "%%A"=="REM" if not "%%A"=="#" (
        set "%%A=%%B"
        echo    %%A = %%B
    )
)

if "%DEPLOY_HOST%"=="" (
    echo ❌ DEPLOY_HOST non configuré
    pause
    exit /b 1
)

echo.
echo 🎯 Cible de déploiement: %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%

REM Vérifier que le build client existe
if not exist "..\client\build" (
    echo ❌ Build du client non trouvé
    echo    Exécutez d'abord: cd ..\client && npm run build
    pause
    exit /b 1
)

echo.
echo 📦 Étape 1: Création du répertoire de déploiement sur le serveur...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "mkdir -p %DEPLOY_PATH% && mkdir -p %DEPLOY_PATH%-backup"

echo.
echo 💾 Étape 2: Sauvegarde de l'installation existante...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "if [ -d '%DEPLOY_PATH%/server' ]; then cp -r %DEPLOY_PATH%/server %DEPLOY_PATH%-backup/server-$(date +%%Y%%m%%d-%%H%%M%%S) 2>/dev/null || true; fi"

echo.
echo 📁 Étape 3: Transfert du client (build optimisé)...
scp -o PreferredAuthentications=password -r ..\client\build %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/client-build
scp -o PreferredAuthentications=password ..\client\package.json %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/

echo.
echo 📁 Étape 4: Transfert du serveur (sans node_modules)...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "mkdir -p %DEPLOY_PATH%/server"
scp -o PreferredAuthentications=password ..\server\*.js %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/server/
scp -o PreferredAuthentications=password ..\server\package*.json %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/server/
scp -o PreferredAuthentications=password -r ..\server\routes %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/server/
scp -o PreferredAuthentications=password -r ..\server\socket %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/server/

echo.
echo 📁 Étape 5: Transfert des fichiers de configuration...
scp -o PreferredAuthentications=password ..\ecosystem.config.js %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/
scp -o PreferredAuthentications=password ..\package.json %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/

echo.
echo 🔧 Étape 6: Installation et configuration sur le serveur...

echo 📁 Réorganisation des fichiers...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH% && mkdir -p client && mv client-build client/build 2>/dev/null || true"

echo 📚 Installation des dépendances serveur...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH%/server && npm install --production --no-audit --no-fund"

echo 📝 Configuration du fichier .env...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH%/server && if [ ! -f .env ]; then echo 'SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=https://%DEPLOY_HOST%/auth/callback
PORT=3001
NODE_ENV=production
SESSION_SECRET=spotify_connect_secret_$(date +%%s)
CLIENT_URL=https://%DEPLOY_HOST%' > .env; fi"

echo 📦 Installation de PM2...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "command -v pm2 >/dev/null || npm install -g pm2"

echo ⏹️ Arrêt de l'ancienne version...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "pm2 stop spotify-connect 2>/dev/null || true && pm2 delete spotify-connect 2>/dev/null || true"

echo 🚀 Démarrage de l'application...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH% && pm2 start ecosystem.config.js && pm2 save"

echo 📊 Statut de l'application...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "pm2 status"

if %errorlevel% equ 0 (
    echo.
    echo ✅ DÉPLOIEMENT RÉUSSI!
    echo.
    echo 📋 Prochaines étapes:
    echo    1. Configurez vos clés Spotify dans %DEPLOY_PATH%/server/.env
    echo    2. Redémarrez l'app: ssh %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH% && pm2 restart spotify-connect"
    echo    3. Vérifiez les logs: ssh %DEPLOY_USER%@%DEPLOY_HOST% "pm2 logs spotify-connect"
    echo.
    echo 🌐 Application accessible à: https://%DEPLOY_HOST%
) else (
    echo.
    echo ❌ ERREUR LORS DU DÉPLOIEMENT
    echo    Vérifiez les logs ci-dessus pour plus de détails
)

echo.
pause