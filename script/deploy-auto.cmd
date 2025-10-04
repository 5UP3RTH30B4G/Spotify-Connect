@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo    🚀 DEPLOIEMENT SPOTIFY CONNECT (AUTO)
echo ============================================

REM Lecture de la configuration
if not exist "deploy-config.env" (
    echo ❌ Fichier deploy-config.env introuvable
    echo    Exécutez d'abord: configure-ssh.cmd
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

REM Étape 1: Vérifier si les clés SSH sont configurées
echo.
echo 🔍 Vérification du mode d'authentification SSH...

ssh -o BatchMode=yes -o ConnectTimeout=5 %DEPLOY_USER%@%DEPLOY_HOST% "echo 'SSH_KEY_AUTH_OK'" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Authentification par clé SSH détectée - mode sécurisé activé!
    set "AUTH_MODE=SSH_KEY"
    goto START_DEPLOYMENT
)

REM Étape 2: Si pas de clés SSH, vérifier le mot de passe sauvegardé
if exist "ssh-credentials.dat" (
    echo 🔐 Utilisation du mot de passe SSH sauvegardé...
    set "AUTH_MODE=PASSWORD"
    
    REM Charger le mot de passe
    for /f "usebackq tokens=1,2 delims==" %%A in ("ssh-credentials.dat") do (
        if "%%A"=="SSH_PASSWORD_ENCODED" (
            for /f "delims=" %%i in ('powershell -command "[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('%%B'))"') do set "SSH_PASSWORD=%%i"
        )
    )
    
    if "!SSH_PASSWORD!"=="" (
        echo ❌ Erreur lors du décodage du mot de passe
        echo    Reconfigurez avec: ssh-password-manager.cmd
        pause
        exit /b 1
    )
    
    set "SSH_CMD_PREFIX=sshpass -p "!SSH_PASSWORD!" ssh -o PreferredAuthentications=password"
    set "SCP_CMD_PREFIX=sshpass -p "!SSH_PASSWORD!" scp -o PreferredAuthentications=password"
    
) else (
    echo ⚠️  Aucune authentification automatique configurée
    echo.
    echo 💡 Options disponibles:
    echo    - Configurez des clés SSH (option 9 du menu principal)
    echo    - Ou sauvegardez le mot de passe (ssh-password-manager.cmd)
    echo.
    echo    Le mot de passe sera demandé à chaque étape...
    pause
    set "AUTH_MODE=MANUAL"
    set "SSH_CMD_PREFIX=ssh -o PreferredAuthentications=password"
    set "SCP_CMD_PREFIX=scp -o PreferredAuthentications=password"
)

:START_DEPLOYMENT

REM Définir les commandes selon le mode d'authentification
if "%AUTH_MODE%"=="SSH_KEY" (
    echo 🔑 Mode clé SSH - authentification transparente
    set "SSH_CMD_PREFIX=ssh"
    set "SCP_CMD_PREFIX=scp"
) else if "%AUTH_MODE%"=="PASSWORD" (
    echo 🔐 Mode mot de passe sauvegardé
    REM Les variables SSH_CMD_PREFIX et SCP_CMD_PREFIX sont déjà définies ci-dessus
)

REM Vérifier que le build client existe
if not exist "..\client\build" (
    echo ❌ Build du client non trouvé
    echo    Exécutez d'abord: cd ..\client && npm run build
    pause
    exit /b 1
)

echo.
echo 📦 Étape 1: Création du répertoire de déploiement sur le serveur...
!SSH_CMD_PREFIX! %DEPLOY_USER%@%DEPLOY_HOST% "mkdir -p %DEPLOY_PATH% && mkdir -p %DEPLOY_PATH%-backup"

echo.
echo 💾 Étape 2: Sauvegarde de l'installation existante...
!SSH_CMD_PREFIX! %DEPLOY_USER%@%DEPLOY_HOST% "if [ -d '%DEPLOY_PATH%/server' ]; then cp -r %DEPLOY_PATH%/server %DEPLOY_PATH%-backup/server-$(date +%%Y%%m%%d-%%H%%M%%S) 2>/dev/null || true; fi"

echo.
echo 📁 Étape 3: Transfert du client (build optimisé)...
!SCP_CMD_PREFIX! -r ..\client\build %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/client-build
!SCP_CMD_PREFIX! ..\client\package.json %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/

echo.
echo 📁 Étape 4: Transfert du serveur (sans node_modules)...
!SSH_CMD_PREFIX! %DEPLOY_USER%@%DEPLOY_HOST% "mkdir -p %DEPLOY_PATH%/server"
!SCP_CMD_PREFIX! ..\server\*.js %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/server/ 2>nul || echo "Certains fichiers .js ignorés"
!SCP_CMD_PREFIX! ..\server\package*.json %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/server/
!SCP_CMD_PREFIX! -r ..\server\routes %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/server/
!SCP_CMD_PREFIX! -r ..\server\socket %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/server/

echo.
echo 📁 Étape 5: Transfert des fichiers de configuration...
!SCP_CMD_PREFIX! ..\ecosystem.config.js %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/
!SCP_CMD_PREFIX! ..\package.json %DEPLOY_USER%@%DEPLOY_HOST%:%DEPLOY_PATH%/

echo.
echo 🔧 Étape 6: Installation et configuration sur le serveur...

echo 📁 Réorganisation des fichiers...
!SSH_CMD_PREFIX! %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH% && mkdir -p client && mv client-build client/build 2>/dev/null || true"

echo 📚 Installation des dépendances serveur...
!SSH_CMD_PREFIX! %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH%/server && npm install --production --no-audit --no-fund"

echo 📝 Configuration du fichier .env...
!SSH_CMD_PREFIX! %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH%/server && if [ ! -f .env ]; then cat > .env << 'EOF'
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=https://%DEPLOY_HOST%/auth/callback
PORT=3001
NODE_ENV=production
SESSION_SECRET=spotify_connect_secret_$(date +%%s)
CLIENT_URL=https://%DEPLOY_HOST%
EOF
fi"

echo 📦 Installation de PM2...
!SSH_CMD_PREFIX! %DEPLOY_USER%@%DEPLOY_HOST% "command -v pm2 >/dev/null || npm install -g pm2"

echo ⏹️ Arrêt de l'ancienne version...
!SSH_CMD_PREFIX! %DEPLOY_USER%@%DEPLOY_HOST% "pm2 stop spotify-connect 2>/dev/null || true && pm2 delete spotify-connect 2>/dev/null || true"

echo 🚀 Démarrage de l'application...
!SSH_CMD_PREFIX! %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH% && pm2 start ecosystem.config.js && pm2 save"

echo 📊 Statut de l'application...
!SSH_CMD_PREFIX! %DEPLOY_USER%@%DEPLOY_HOST% "pm2 status"

if %errorlevel% equ 0 (
    echo.
    echo ✅ DÉPLOIEMENT RÉUSSI!
    echo.
    echo 📋 Prochaines étapes:
    echo    1. Configurez vos clés Spotify dans %DEPLOY_PATH%/server/.env
    echo    2. Redémarrez l'app: pm2 restart spotify-connect
    echo    3. Vérifiez les logs: pm2 logs spotify-connect
    echo.
    echo 🌐 Application accessible à: https://%DEPLOY_HOST%
    
    if not exist "ssh-credentials.dat" (
        echo.
        echo 💡 Conseil: Utilisez ssh-password-manager.cmd pour sauvegarder
        echo    votre mot de passe et automatiser les futurs déploiements
    )
) else (
    echo.
    echo ❌ ERREUR LORS DU DÉPLOIEMENT
    echo    Vérifiez les logs ci-dessus pour plus de détails
)

echo.
pause