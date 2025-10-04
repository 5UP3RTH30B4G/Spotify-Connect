@echo off
setlocal enabledelayedexpansion

echo.
echo =============================================
echo     🔑 CONFIGURATION DES CLES SSH
echo =============================================
echo.

if not exist "deploy-config.env" (
    echo ❌ Configuration de déploiement non trouvée
    echo    Configurez d'abord le serveur avec deploy-menu.cmd option 1
    pause
    exit /b 1
)

for /f "usebackq tokens=1,2 delims==" %%A in ("deploy-config.env") do (
    if "%%A"=="DEPLOY_HOST" set "DEPLOY_HOST=%%B"
    if "%%A"=="DEPLOY_USER" set "DEPLOY_USER=%%B"
    if "%%A"=="DEPLOY_PATH" set "DEPLOY_PATH=%%B"
)

echo 🎯 Serveur cible: %DEPLOY_USER%@%DEPLOY_HOST%
echo.

:MENU
echo ┌─────────────────────────────────────────────┐
echo │                   OPTIONS                   │
echo ├─────────────────────────────────────────────┤
echo │ 1. 🔍 Vérifier les clés SSH existantes      │
echo │ 2. 🔑 Générer une nouvelle clé SSH          │
echo │ 3. 📤 Copier la clé publique vers serveur   │
echo │ 4. ✅ Tester la connexion sans mot de passe │
echo │ 5. 🗑️  Supprimer les clés SSH               │
echo │ 0. 🚪 Retour au menu principal              │
echo └─────────────────────────────────────────────┘
echo.

set /p "choice=Votre choix (0-5): "

if "%choice%"=="1" goto CHECK_KEYS
if "%choice%"=="2" goto GENERATE_KEYS
if "%choice%"=="3" goto COPY_KEYS
if "%choice%"=="4" goto TEST_CONNECTION
if "%choice%"=="5" goto DELETE_KEYS
if "%choice%"=="0" goto END
echo ❌ Choix invalide
goto MENU

:CHECK_KEYS
echo.
echo 🔍 Vérification des clés SSH...
echo.

if exist "%USERPROFILE%\.ssh\id_rsa" (
    echo ✅ Clé privée trouvée: %USERPROFILE%\.ssh\id_rsa
) else (
    echo ❌ Aucune clé privée trouvée
)

if exist "%USERPROFILE%\.ssh\id_rsa.pub" (
    echo ✅ Clé publique trouvée: %USERPROFILE%\.ssh\id_rsa.pub
    echo.
    echo 📋 Contenu de la clé publique:
    type "%USERPROFILE%\.ssh\id_rsa.pub"
) else (
    echo ❌ Aucune clé publique trouvée
)

echo.
pause
goto MENU

:GENERATE_KEYS
echo.
echo 🔑 Génération d'une nouvelle clé SSH...
echo.

if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh"

echo ⚠️  Si des clés existent déjà, elles seront écrasées!
set /p "confirm=Continuer? (o/N): "
if /i not "%confirm%"=="o" goto MENU

echo.
echo 📧 Entrez votre email pour identifier la clé:
set /p "email=Email: "

if "%email%"=="" (
    echo ❌ Email requis
    pause
    goto MENU
)

echo.
echo 🔨 Génération de la clé RSA 4096 bits...
ssh-keygen -t rsa -b 4096 -C "%email%" -f "%USERPROFILE%\.ssh\id_rsa" -N ""

if %errorlevel% equ 0 (
    echo ✅ Clé SSH générée avec succès!
    echo.
    echo 📋 Votre clé publique:
    type "%USERPROFILE%\.ssh\id_rsa.pub"
    echo.
    echo 💡 Prochaine étape: Copiez cette clé sur le serveur (option 3)
) else (
    echo ❌ Erreur lors de la génération de la clé
)

echo.
pause
goto MENU

:COPY_KEYS
echo.
echo 📤 Copie de la clé publique vers le serveur...
echo.

if not exist "%USERPROFILE%\.ssh\id_rsa.pub" (
    echo ❌ Aucune clé publique trouvée
    echo    Générez d'abord une clé avec l'option 2
    pause
    goto MENU
)

echo 🔐 Vous devrez saisir le mot de passe SSH une dernière fois
echo    pour configurer l'authentification par clé.
echo.

:: Méthode 1: Essayer ssh-copy-id (si disponible)
where ssh-copy-id >nul 2>&1
if %errorlevel% equ 0 (
    echo 📋 Utilisation de ssh-copy-id...
    ssh-copy-id -i "%USERPROFILE%\.ssh\id_rsa.pub" %DEPLOY_USER%@%DEPLOY_HOST%
) else (
    :: Méthode 2: Copie manuelle
    echo 📋 Copie manuelle de la clé...
    echo.
    echo ⚠️  Commande à exécuter sur le serveur:
    echo.
    echo mkdir -p ~/.ssh
    echo chmod 700 ~/.ssh
    echo echo "
    type "%USERPROFILE%\.ssh\id_rsa.pub"
    echo " >> ~/.ssh/authorized_keys
    echo chmod 600 ~/.ssh/authorized_keys
    echo.
    
    set /p "manual=Voulez-vous exécuter automatiquement? (o/N): "
    if /i "%manual%"=="o" (
        for /f "delims=" %%i in ('type "%USERPROFILE%\.ssh\id_rsa.pub"') do set "pubkey=%%i"
        ssh %DEPLOY_USER%@%DEPLOY_HOST% "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '!pubkey!' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo '✅ Clé ajoutée avec succès!'"
    ) else (
        echo 💡 Copiez manuellement les commandes ci-dessus sur votre serveur
    )
)

echo.
pause
goto MENU

:TEST_CONNECTION
echo.
echo ✅ Test de connexion sans mot de passe...
echo.

ssh -o BatchMode=yes -o ConnectTimeout=10 %DEPLOY_USER%@%DEPLOY_HOST% "echo '✅ Connexion SSH par clé réussie!' && whoami && pwd"

if %errorlevel% equ 0 (
    echo.
    echo 🎉 EXCELLENT! La connexion SSH par clé fonctionne!
    echo    Vous pouvez maintenant déployer sans saisir de mot de passe.
    echo.
    echo 💡 Vous pouvez supprimer le mot de passe sauvegardé si vous le souhaitez:
    echo    ssh-password-manager.cmd ^> Option 3
) else (
    echo.
    echo ❌ La connexion par clé ne fonctionne pas encore
    echo    Vérifiez que la clé a été correctement copiée (option 3)
    echo.
    echo 🔍 Diagnostics possibles:
    echo    1. Vérifiez les permissions sur le serveur:
    echo       chmod 700 ~/.ssh
    echo       chmod 600 ~/.ssh/authorized_keys
    echo    2. Vérifiez le contenu de ~/.ssh/authorized_keys
    echo    3. Consultez les logs SSH du serveur: /var/log/auth.log
)

echo.
pause
goto MENU

:DELETE_KEYS
echo.
echo 🗑️ Suppression des clés SSH...
echo.

echo ⚠️  ATTENTION: Cette action supprimera définitivement vos clés SSH!
echo    Vous devrez les regénérer ou utiliser l'authentification par mot de passe.
echo.
set /p "confirm=Êtes-vous sûr? (oui/non): "
if /i not "%confirm%"=="oui" goto MENU

if exist "%USERPROFILE%\.ssh\id_rsa" (
    del "%USERPROFILE%\.ssh\id_rsa"
    echo ✅ Clé privée supprimée
)

if exist "%USERPROFILE%\.ssh\id_rsa.pub" (
    del "%USERPROFILE%\.ssh\id_rsa.pub"
    echo ✅ Clé publique supprimée
)

echo.
echo 💡 Pour supprimer la clé du serveur également:
echo    ssh %DEPLOY_USER%@%DEPLOY_HOST% "rm ~/.ssh/authorized_keys"

echo.
pause
goto MENU

:END
echo.
echo 👋 Configuration des clés SSH terminée
echo.
pause