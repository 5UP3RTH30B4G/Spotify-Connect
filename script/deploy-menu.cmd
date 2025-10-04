@echo off
echo.
echo =============================================
echo    🎵 SPOTIFY CONNECT - DÉPLOIEMENT SSH
echo =============================================
echo.
echo Système de déploiement avec authentification SSH par mot de passe
echo.

:MENU
echo.
echo 📋 Menu principal:
echo.
echo 1. ⚙️  Configurer le serveur de déploiement
echo 2. � Gérer le mot de passe SSH (sauvegarder/tester)
echo 3. �🔍 Tester la connexion SSH
echo 4. 🏗️  Construire l'application (npm run build)
echo 5. 🚀 Déployer l'application (automatique)
echo 6. 📊 Voir les logs et gérer l'application
echo 7. 🔧 Configurer les clés Spotify (via SSH)
echo 8. ❓ Aide et documentation
echo 9. 🔑 Configurer les clés SSH
echo 0. 🚪 Quitter
echo.

set /p "CHOICE=Votre choix (0-9): "

if "%CHOICE%"=="1" goto CONFIGURE
if "%CHOICE%"=="2" goto PASSWORD_MANAGER
if "%CHOICE%"=="3" goto TEST
if "%CHOICE%"=="4" goto BUILD
if "%CHOICE%"=="5" goto DEPLOY
if "%CHOICE%"=="6" goto LOGS
if "%CHOICE%"=="7" goto ENV_CONFIG
if "%CHOICE%"=="8" goto HELP
if "%CHOICE%"=="9" goto SSH_KEYS
if "%CHOICE%"=="0" goto EXIT

echo ❌ Choix invalide
goto MENU

:CONFIGURE
echo.
echo ⚙️  Configuration du serveur...
call configure-ssh.cmd
goto MENU

:PASSWORD_MANAGER
echo.
echo 🔐 Gestion du mot de passe SSH...
call ssh-password-manager.cmd
goto MENU

:TEST
echo.
echo 🔍 Test de connexion...
call test-ssh.cmd
goto MENU

:BUILD
echo.
echo 🏗️  Construction de l'application...
echo.
if not exist "..\client\package.json" (
    echo ❌ Répertoire client non trouvé
    pause
    goto MENU
)

echo 📦 Build du client React...
cd ..\client
call npm run build
if %errorlevel% equ 0 (
    echo ✅ Build réussi!
) else (
    echo ❌ Erreur lors du build
    pause
)
cd ..\script
goto MENU

:DEPLOY
echo.
echo 🚀 Déploiement de l'application...
call deploy-auto.cmd
goto MENU

:LOGS
echo.
echo 📊 Gestion de l'application...
call logs-ssh.cmd
goto MENU

echo.
echo 🔧 Configuration des clés Spotify...
if not exist "deploy-config.env" (
    echo ❌ Configuration de déploiement non trouvée
    echo    Configurez d'abord le serveur (option 1)
    pause
    goto MENU
)

for /f "usebackq tokens=1,2 delims==" %%A in ("deploy-config.env") do (
    if "%%A"=="DEPLOY_HOST" set "DEPLOY_HOST=%%B"
    if "%%A"=="DEPLOY_USER" set "DEPLOY_USER=%%B"
    if "%%A"=="DEPLOY_PATH" set "DEPLOY_PATH=%%B"
)

echo.
echo 📝 Configuration du fichier .env sur le serveur...
echo.
set /p "CLIENT_ID=Spotify Client ID: "
set /p "CLIENT_SECRET=Spotify Client Secret: "

echo.
echo 📡 Connexion au serveur...

:: Utiliser le système automatisé existant
echo @echo off > temp_env_config.cmd
echo set "CLIENT_ID=%CLIENT_ID%" >> temp_env_config.cmd
echo set "CLIENT_SECRET=%CLIENT_SECRET%" >> temp_env_config.cmd
echo ssh %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH%/server && echo 'Configuration du fichier .env...' && if [ -f '.env' ]; then cp .env .env.backup.$(date +%%%%Y%%%%m%%%%d-%%%%H%%%%M%%%%S); fi && cat ^> .env ^<^< 'EOF' >> temp_env_config.cmd
echo # Spotify API Configuration >> temp_env_config.cmd
echo SPOTIFY_CLIENT_ID=%CLIENT_ID% >> temp_env_config.cmd
echo SPOTIFY_CLIENT_SECRET=%CLIENT_SECRET% >> temp_env_config.cmd
echo SPOTIFY_REDIRECT_URI=https://%DEPLOY_HOST%/auth/callback >> temp_env_config.cmd
echo. >> temp_env_config.cmd
echo # Server Configuration >> temp_env_config.cmd
echo PORT=3001 >> temp_env_config.cmd
echo NODE_ENV=production >> temp_env_config.cmd
echo. >> temp_env_config.cmd
echo # Session Configuration >> temp_env_config.cmd
echo SESSION_SECRET=spotify_connect_secret_$(date +%%%%s) >> temp_env_config.cmd
echo. >> temp_env_config.cmd
echo # Frontend URL >> temp_env_config.cmd
echo CLIENT_URL=https://%DEPLOY_HOST% >> temp_env_config.cmd
echo EOF >> temp_env_config.cmd
echo && echo '✅ Fichier .env configuré!' && echo 'Redémarrage de l application...' && cd %DEPLOY_PATH% && pm2 restart spotify-connect && pm2 status" >> temp_env_config.cmd

:: Vérifier si le mot de passe SSH est sauvegardé pour utilisation automatique
if exist "ssh-credentials.dat" (
    echo ✅ Utilisation du mot de passe SSH sauvegardé...
    call ssh-password-manager.cmd auto-exec temp_env_config.cmd
) else (
    echo ⚠️ Mot de passe SSH non sauvegardé - saisie manuelle requise
    call temp_env_config.cmd
)

if exist "temp_env_config.cmd" del temp_env_config.cmd
fi

# Créer le nouveau .env
cat > .env << 'EOF'
# Spotify API Configuration
SPOTIFY_CLIENT_ID=%CLIENT_ID%
SPOTIFY_CLIENT_SECRET=%CLIENT_SECRET%
SPOTIFY_REDIRECT_URI=https://%DEPLOY_HOST%/auth/callback

# Server Configuration
PORT=3001
NODE_ENV=production

# Session Configuration
SESSION_SECRET=spotify_connect_secret_$(date +%%s)

# Frontend URL
CLIENT_URL=https://%DEPLOY_HOST%
EOF

echo '✅ Fichier .env configuré!'
echo 'Redémarrage de l\'application...'
cd %DEPLOY_PATH%
pm2 restart spotify-connect
pm2 status
"

echo.
echo ✅ Configuration terminée!
pause
goto MENU

:HELP
echo.
echo ❓ AIDE ET DOCUMENTATION
echo =========================
echo.
echo 📖 Guide d'utilisation:
echo.
echo 1. PREMIÈRE UTILISATION:
echo    - Exécutez l'option 1 pour configurer votre serveur
echo    - Testez la connexion avec l'option 2
echo    - Construisez l'app avec l'option 3
echo    - Déployez avec l'option 4
echo.
echo 2. PRÉREQUIS SERVEUR:
echo    - Ubuntu/Debian avec accès SSH
echo    - Node.js 14+ (sera installé si manquant)
echo    - Accès internet pour npm
echo.
echo 3. CONFIGURATION SPOTIFY:
echo    - Créez une app sur https://developer.spotify.com/
echo    - Notez votre Client ID et Client Secret
echo    - Configurez l'URL de callback: https://VOTRE_DOMAINE/auth/callback
echo.
echo 4. STRUCTURE DE DÉPLOIEMENT:
echo    %DEPLOY_PATH%/
echo    ├── client/build/     # Frontend React
echo    ├── server/           # Backend Node.js
echo    ├── ecosystem.config.js
echo    └── package.json
echo.
echo 5. COMMANDES UTILES SUR LE SERVEUR:
echo    pm2 status            # Voir le statut
echo    pm2 logs spotify-connect  # Voir les logs
echo    pm2 restart spotify-connect  # Redémarrer
echo    nano %DEPLOY_PATH%/server/.env  # Modifier config
echo.
echo 6. DÉPANNAGE:
echo    - Vérifiez les logs avec l'option 5
echo    - Testez la connectivité avec l'option 2
echo    - Vérifiez la config Spotify avec l'option 6
echo.
pause
goto MENU

:SSH_KEYS
echo.
echo 🔑 Configuration des clés SSH...
call setup-ssh-keys.cmd
goto MENU

:EXIT
echo.
echo 👋 Au revoir!
echo.
exit /b 0