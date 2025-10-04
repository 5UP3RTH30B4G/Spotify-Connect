@echo off
setlocal

REM ===============================================
REM    Configuration des variables de déploiement
REM ===============================================

echo.
echo ============================================
echo    🔧 CONFIGURATION DEPLOIEMENT
echo ============================================
echo.

set "CONFIG_FILE=deploy-config.env"
set "EXAMPLE_FILE=deploy-config.example.env"

REM Vérifier si le fichier de configuration existe
if not exist "%CONFIG_FILE%" (
    if exist "%EXAMPLE_FILE%" (
        echo 📋 Création du fichier de configuration...
        copy "%EXAMPLE_FILE%" "%CONFIG_FILE%" >nul
        echo ✅ Fichier %CONFIG_FILE% créé depuis l'exemple
        echo.
        echo ⚠️  IMPORTANT : Modifiez %CONFIG_FILE% avec vos vraies valeurs !
        echo.
        echo 📝 Ouvrez %CONFIG_FILE% et remplacez :
        echo    - DEPLOY_HOST=your-server.com par votre vraie adresse
        echo    - DEPLOY_USER=root par votre utilisateur
        echo    - DEPLOY_PATH=/var/www/spotify-connect par votre chemin
        echo.
        echo Puis relancez ce script.
        pause
        exit /b 0
    ) else (
        echo ❌ ERREUR : Fichier d'exemple %EXAMPLE_FILE% introuvable
        pause
        exit /b 1
    )
)

echo 📖 Lecture de la configuration depuis %CONFIG_FILE%...
echo.

REM Lire et traiter le fichier de configuration
for /f "usebackq tokens=1,2 delims==" %%a in ("%CONFIG_FILE%") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        if not "%%a"=="" (
            if not "%%b"=="" (
                set "%%a=%%b"
                echo    %%a = %%b
            )
        )
    )
)

echo.

REM Vérifier que les variables essentielles sont définies
if "%DEPLOY_HOST%"=="" (
    echo ❌ ERREUR : DEPLOY_HOST non défini dans %CONFIG_FILE%
    pause
    exit /b 1
)
if "%DEPLOY_USER%"=="" (
    echo ❌ ERREUR : DEPLOY_USER non défini dans %CONFIG_FILE%
    pause
    exit /b 1
)
if "%DEPLOY_PATH%"=="" (
    echo ❌ ERREUR : DEPLOY_PATH non défini dans %CONFIG_FILE%
    pause
    exit /b 1
)

REM Vérifier que ce ne sont pas les valeurs d'exemple
if "%DEPLOY_HOST%"=="your-server.com" (
    echo ❌ ERREUR : Vous devez modifier DEPLOY_HOST dans %CONFIG_FILE%
    echo    Remplacez 'your-server.com' par votre vraie adresse de serveur
    pause
    exit /b 1
)

echo 🔍 Test de connexion SSH...
ssh -o ConnectTimeout=10 -o BatchMode=yes %DEPLOY_USER%@%DEPLOY_HOST% "echo 'Test OK'" >nul 2>&1

if errorlevel 1 (
    echo ⚠️  Connexion SSH échouée vers %DEPLOY_USER%@%DEPLOY_HOST%
    echo    Vérifiez vos clés SSH avec setup-ssh.cmd
) else (
    echo ✅ Connexion SSH réussie !
)

echo.
echo 💾 Définition des variables d'environnement pour cette session...

REM Définir les variables pour la session actuelle
setx DEPLOY_HOST "%DEPLOY_HOST%" >nul
setx DEPLOY_USER "%DEPLOY_USER%" >nul
setx DEPLOY_PATH "%DEPLOY_PATH%" >nul

echo ✅ Variables d'environnement définies :
echo    DEPLOY_HOST = %DEPLOY_HOST%
echo    DEPLOY_USER = %DEPLOY_USER%
echo    DEPLOY_PATH = %DEPLOY_PATH%

echo.
echo ============================================
echo    🎉 CONFIGURATION TERMINÉE !
echo ============================================
echo.
echo 🚀 Vous pouvez maintenant utiliser :
echo    - deploy.cmd
echo    - setup-ssh.cmd  
echo    - quick-deploy.cmd
echo.
echo 💡 Les scripts utiliseront automatiquement vos variables d'environnement
echo.

pause
goto :eof