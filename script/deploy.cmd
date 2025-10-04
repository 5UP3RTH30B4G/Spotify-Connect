@echo off
setlocal enabledelayedexpansion

REM ===============================================
REM    Script de Déploiement Spotify Connect
REM ===============================================

echo.
echo ============================================
echo    🚀 DEPLOIEMENT SPOTIFY CONNECT
echo ============================================
echo.

REM Configuration par défaut (à modifier ou utiliser des variables d'environnement)
set "VPS_HOST=%DEPLOY_HOST%"
set "VPS_USER=%DEPLOY_USER%"
set "VPS_PATH=%DEPLOY_PATH%"
set "DEPLOY_TYPE=full"
set "BUILD_CLIENT=true"
set "RESTART_SERVER=true"

REM Valeurs par défaut si les variables d'environnement ne sont pas définies
if "%VPS_HOST%"=="" set "VPS_HOST=your-server.com"
if "%VPS_USER%"=="" set "VPS_USER=root"
if "%VPS_PATH%"=="" set "VPS_PATH=/var/www/spotify-connect"

REM Traitement des arguments
:parse_args
if "%~1"=="" goto :start_deploy
if "%~1"=="--host" (
    set "VPS_HOST=%~2"
    shift
    shift
    goto :parse_args
)
if "%~1"=="--user" (
    set "VPS_USER=%~2"
    shift
    shift
    goto :parse_args
)
if "%~1"=="--path" (
    set "VPS_PATH=%~2"
    shift
    shift
    goto :parse_args
)
if "%~1"=="--client-only" (
    set "DEPLOY_TYPE=client"
    shift
    goto :parse_args
)
if "%~1"=="--server-only" (
    set "DEPLOY_TYPE=server"
    set "BUILD_CLIENT=false"
    shift
    goto :parse_args
)
if "%~1"=="--no-build" (
    set "BUILD_CLIENT=false"
    shift
    goto :parse_args
)
if "%~1"=="--no-restart" (
    set "RESTART_SERVER=false"
    shift
    goto :parse_args
)
if "%~1"=="--help" (
    goto :show_help
)
shift
goto :parse_args

:start_deploy
echo 📋 Configuration du déploiement :
echo    - Serveur : %VPS_USER%@%VPS_HOST%
echo    - Chemin  : %VPS_PATH%
echo    - Type    : %DEPLOY_TYPE%
echo    - Build   : %BUILD_CLIENT%
echo    - Restart : %RESTART_SERVER%
echo.

REM Vérification de la connexion
echo 🔍 Vérification de la connexion SSH...
ssh -o ConnectTimeout=10 -o BatchMode=yes %VPS_USER%@%VPS_HOST% "echo 'Connexion SSH OK'" >nul 2>&1
if errorlevel 1 (
    echo ❌ ERREUR : Impossible de se connecter à %VPS_USER%@%VPS_HOST%
    echo    Vérifiez vos clés SSH et la connectivité réseau
    pause
    exit /b 1
)
echo ✅ Connexion SSH réussie

REM Build du client si nécessaire
if "%BUILD_CLIENT%"=="true" (
    if "%DEPLOY_TYPE%"=="full" goto :build_client
    if "%DEPLOY_TYPE%"=="client" goto :build_client
    goto :skip_build
    
    :build_client
    echo.
    echo 🔨 Construction du client React...
    cd client
    if errorlevel 1 (
        echo ❌ ERREUR : Dossier client introuvable
        pause
        exit /b 1
    )
    
    echo    - Installation des dépendances...
    npm install --silent
    if errorlevel 1 (
        echo ❌ ERREUR : Installation des dépendances échouée
        pause
        exit /b 1
    )
    
    echo    - Build en cours...
    npm run build
    if errorlevel 1 (
        echo ❌ ERREUR : Build du client échoué
        pause
        exit /b 1
    )
    
    cd ..
    echo ✅ Build du client terminé
)

:skip_build

REM Déploiement des fichiers
echo.
echo 📤 Déploiement des fichiers...

if "%DEPLOY_TYPE%"=="client" goto :deploy_client_only
if "%DEPLOY_TYPE%"=="server" goto :deploy_server_only

REM Déploiement complet
:deploy_full
echo    - Déploiement du client...
scp -r client\build %VPS_USER%@%VPS_HOST%:%VPS_PATH%/client/ >nul 2>&1
if errorlevel 1 (
    echo ❌ ERREUR : Échec du déploiement du client
    pause
    exit /b 1
)

echo    - Déploiement du serveur...
scp -r server %VPS_USER%@%VPS_HOST%:%VPS_PATH%/ >nul 2>&1
if errorlevel 1 (
    echo ❌ ERREUR : Échec du déploiement du serveur
    pause
    exit /b 1
)

scp ecosystem.config.js %VPS_USER%@%VPS_HOST%:%VPS_PATH%/ >nul 2>&1
scp package.json %VPS_USER%@%VPS_HOST%:%VPS_PATH%/ >nul 2>&1
goto :deploy_complete

:deploy_client_only
echo    - Déploiement du client uniquement...
scp -r client\build %VPS_USER%@%VPS_HOST%:%VPS_PATH%/client/ >nul 2>&1
if errorlevel 1 (
    echo ❌ ERREUR : Échec du déploiement du client
    pause
    exit /b 1
)
goto :deploy_complete

:deploy_server_only
echo    - Déploiement du serveur uniquement...
scp -r server %VPS_USER%@%VPS_HOST%:%VPS_PATH%/ >nul 2>&1
if errorlevel 1 (
    echo ❌ ERREUR : Échec du déploiement du serveur
    pause
    exit /b 1
)
scp ecosystem.config.js %VPS_USER%@%VPS_HOST%:%VPS_PATH%/ >nul 2>&1
scp package.json %VPS_USER%@%VPS_HOST%:%VPS_PATH%/ >nul 2>&1
goto :deploy_complete

:deploy_complete
echo ✅ Fichiers déployés avec succès

REM Installation des dépendances serveur si nécessaire
if "%DEPLOY_TYPE%"=="client" goto :skip_server_deps
echo.
echo 📦 Installation des dépendances serveur...
ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH%/server && npm install --production --silent" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Avertissement : Installation des dépendances échouée
) else (
    echo ✅ Dépendances installées
)

:skip_server_deps

REM Redémarrage du serveur
if "%RESTART_SERVER%"=="false" goto :skip_restart
if "%DEPLOY_TYPE%"=="client" goto :skip_restart

echo.
echo 🔄 Redémarrage du serveur...

REM Arrêter PM2 proprement
ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && pm2 stop ecosystem.config.js" >nul 2>&1

REM Démarrer PM2
ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && pm2 start ecosystem.config.js" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Échec du démarrage normal, tentative de kill et restart...
    ssh %VPS_USER%@%VPS_HOST% "pm2 kill && cd %VPS_PATH% && pm2 start ecosystem.config.js" >nul 2>&1
    if errorlevel 1 (
        echo ❌ ERREUR : Impossible de redémarrer le serveur
        echo    Connectez-vous manuellement pour diagnostiquer
        pause
        exit /b 1
    )
)

echo ✅ Serveur redémarré

:skip_restart

REM Vérification finale
echo.
echo 🔍 Vérification du statut final...
ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && pm2 status" 2>nul
if errorlevel 1 (
    echo ⚠️  Impossible de vérifier le statut PM2
) else (
    echo ✅ Statut PM2 vérifié
)

echo.
echo ============================================
echo    🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !
echo ============================================
echo.
echo 🌐 Votre application est accessible sur :
echo    https://spotify-connect.mooo.com
echo.
echo 📋 Pour vérifier les logs :
echo    ssh %VPS_USER%@%VPS_HOST% "cd %VPS_PATH% && pm2 logs"
echo.

pause
goto :eof

:show_help
echo.
echo ============================================
echo    📖 AIDE - Script de Déploiement
echo ============================================
echo.
echo Usage: deploy.cmd [OPTIONS]
echo.
echo Options disponibles :
echo   --host HOST       Adresse du serveur VPS (défaut: scpearth.fr)
echo   --user USER       Utilisateur SSH (défaut: root)
echo   --path PATH       Chemin sur le serveur (défaut: /var/www/spotify-connect.mooo.com)
echo   --client-only     Déployer uniquement le client React
echo   --server-only     Déployer uniquement le serveur Node.js
echo   --no-build        Ne pas rebuilder le client
echo   --no-restart      Ne pas redémarrer le serveur PM2
echo   --help            Afficher cette aide
echo.
echo Exemples :
echo   deploy.cmd                              # Déploiement complet
echo   deploy.cmd --client-only                # Client seulement
echo   deploy.cmd --server-only                # Serveur seulement
echo   deploy.cmd --no-build --no-restart      # Déploiement rapide sans build
echo   deploy.cmd --host monserveur.com        # Serveur différent
echo.
pause
goto :eof
