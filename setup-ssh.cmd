@echo off
setlocal

REM ===============================================
REM    Configuration SSH pour Spotify Connect
REM ===============================================

echo.
echo ============================================
echo    🔑 CONFIGURATION SSH
echo ============================================
echo.

set "VPS_HOST=%DEPLOY_HOST%"
set "VPS_USER=%DEPLOY_USER%"
set "SSH_KEY_PATH=%USERPROFILE%\.ssh\id_rsa"

REM Valeurs par défaut si les variables d'environnement ne sont pas définies
if "%VPS_HOST%"=="" set "VPS_HOST=your-server.com"
if "%VPS_USER%"=="" set "VPS_USER=root"

echo 🔍 Vérification de la configuration SSH actuelle...

REM Vérifier si le dossier .ssh existe
if not exist "%USERPROFILE%\.ssh" (
    echo 📁 Création du dossier .ssh...
    mkdir "%USERPROFILE%\.ssh"
)

REM Vérifier si une clé SSH existe
if not exist "%SSH_KEY_PATH%" (
    echo.
    echo ❌ Aucune clé SSH trouvée à : %SSH_KEY_PATH%
    echo.
    echo 🔧 Génération d'une nouvelle clé SSH...
    echo    Appuyez sur Entrée pour toutes les questions (pas de passphrase)
    echo.
    ssh-keygen -t rsa -b 4096 -f "%SSH_KEY_PATH%" -N ""
    
    if errorlevel 1 (
        echo ❌ ERREUR : Échec de la génération de clé SSH
        pause
        exit /b 1
    )
    echo ✅ Clé SSH générée avec succès
) else (
    echo ✅ Clé SSH existante trouvée
)

echo.
echo 🔄 Test de connexion SSH...
ssh -o ConnectTimeout=10 -o BatchMode=yes %VPS_USER%@%VPS_HOST% "echo 'Test connexion OK'" >nul 2>&1

if errorlevel 1 (
    echo ❌ Connexion SSH échouée - Configuration de la clé publique nécessaire
    echo.
    echo 📋 Étapes à suivre :
    echo.
    echo 1. Copiez votre clé publique :
    echo.
    type "%SSH_KEY_PATH%.pub"
    echo.
    echo 2. Connectez-vous à votre VPS avec mot de passe :
    echo    ssh %VPS_USER%@%VPS_HOST%
    echo.
    echo 3. Ajoutez la clé publique au fichier authorized_keys :
    echo    mkdir -p ~/.ssh
    echo    echo "VOTRE_CLE_PUBLIQUE_ICI" ^>^> ~/.ssh/authorized_keys
    echo    chmod 600 ~/.ssh/authorized_keys
    echo    chmod 700 ~/.ssh
    echo.
    echo 4. Relancez ce script pour vérifier
    echo.
    
    REM Copier la clé publique dans le presse-papiers (Windows 10+)
    clip < "%SSH_KEY_PATH%.pub" 2>nul
    if not errorlevel 1 (
        echo ✅ Clé publique copiée dans le presse-papiers !
    )
    
) else (
    echo ✅ Connexion SSH réussie - Configuration OK !
    echo.
    echo 🎉 Vous pouvez maintenant utiliser deploy.cmd
)

echo.
echo 📝 Configuration actuelle :
echo    Serveur : %VPS_USER%@%VPS_HOST%
echo    Clé SSH : %SSH_KEY_PATH%
echo.

pause
goto :eof