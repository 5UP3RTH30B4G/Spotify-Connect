@echo off
echo.
echo =============================================
echo    ⚙️  CONFIGURATION DEPLOIEMENT SSH
echo =============================================

echo.
echo Ce script va créer/modifier votre fichier de configuration de déploiement.
echo.

REM Lire la configuration existante si elle existe
set "CURRENT_HOST="
set "CURRENT_USER="
set "CURRENT_PATH="

if exist "deploy-config.env" (
    echo 📖 Configuration actuelle détectée:
    for /f "usebackq tokens=1,2 delims==" %%A in ("deploy-config.env") do (
        if "%%A"=="DEPLOY_HOST" (
            set "CURRENT_HOST=%%B"
            echo    Serveur: %%B
        )
        if "%%A"=="DEPLOY_USER" (
            set "CURRENT_USER=%%B"
            echo    Utilisateur: %%B
        )
        if "%%A"=="DEPLOY_PATH" (
            set "CURRENT_PATH=%%B"
            echo    Chemin: %%B
        )
    )
    echo.
)

REM Demander les nouvelles valeurs
echo 🔧 Configuration du serveur de déploiement:
echo.

REM Serveur
set /p "NEW_HOST=Adresse du serveur [%CURRENT_HOST%]: "
if "%NEW_HOST%"=="" set "NEW_HOST=%CURRENT_HOST%"
if "%NEW_HOST%"=="" set "NEW_HOST=scpearth.fr"

REM Utilisateur
set /p "NEW_USER=Nom d'utilisateur SSH [%CURRENT_USER%]: "
if "%NEW_USER%"=="" set "NEW_USER=%CURRENT_USER%"
if "%NEW_USER%"=="" set "NEW_USER=root"

REM Chemin de déploiement
set /p "NEW_PATH=Chemin de déploiement [%CURRENT_PATH%]: "
if "%NEW_PATH%"=="" set "NEW_PATH=%CURRENT_PATH%"
if "%NEW_PATH%"=="" set "NEW_PATH=/var/www/spotify-connect"

echo.
echo 📝 Nouvelle configuration:
echo    Serveur: %NEW_HOST%
echo    Utilisateur: %NEW_USER%
echo    Chemin: %NEW_PATH%
echo.

set /p "CONFIRM=Confirmer cette configuration? (o/N): "
if /i not "%CONFIRM%"=="o" if /i not "%CONFIRM%"=="oui" (
    echo ❌ Configuration annulée
    pause
    exit /b 1
)

REM Créer le fichier de configuration
echo 💾 Sauvegarde de la configuration...
(
echo # Configuration de déploiement Spotify Connect
echo # Généré automatiquement le %date% à %time%
echo.
echo # Serveur de déploiement
echo DEPLOY_HOST=%NEW_HOST%
echo DEPLOY_USER=%NEW_USER%
echo DEPLOY_PATH=%NEW_PATH%
echo.
echo # Notes:
echo # - Utilisez deploy-ssh.cmd pour déployer avec mot de passe SSH
echo # - Assurez-vous que le serveur a Node.js installé
echo # - Le déploiement créera automatiquement le fichier .env
) > deploy-config.env

echo ✅ Configuration sauvegardée dans deploy-config.env
echo.
echo 🚀 Vous pouvez maintenant utiliser:
echo    deploy-ssh.cmd    - Déploiement complet avec SSH
echo    test-ssh.cmd      - Test de connexion SSH
echo    logs-ssh.cmd      - Voir les logs de l'application
echo.

REM Test de connexion
echo 🔍 Test de connexion SSH...
ssh -o PreferredAuthentications=password -o ConnectTimeout=5 %NEW_USER%@%NEW_HOST% "echo 'Connexion SSH réussie!'"
if %errorlevel% equ 0 (
    echo ✅ Connexion SSH fonctionnelle
) else (
    echo ⚠️  Impossible de se connecter en SSH
    echo    Vérifiez l'adresse du serveur et vos identifiants
)

echo.
pause