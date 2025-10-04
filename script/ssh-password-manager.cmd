@echo off
setlocal enabledelayedexpansion

:: Vérifier si c'est un appel d'exécution automatique
if "%1"=="auto-exec" (
    if "%2"=="" (
        echo ❌ Erreur: Fichier de commande requis pour auto-exec
        exit /b 1
    )
    goto AUTO_EXEC
)

echo.
echo =============================================
echo    🔐 GESTION SECURISEE DU MOT DE PASSE SSH
echo =============================================

set "CONFIG_FILE=ssh-credentials.dat"
set "TEMP_SCRIPT=temp_ssh_command.cmd"

REM Fonction pour encoder/décoder basiquement le mot de passe (sécurité légère)
REM Note: Pour une vraie sécurité, utilisez des clés SSH

if "%~1"=="save" goto SAVE_PASSWORD
if "%~1"=="load" goto LOAD_PASSWORD
if "%~1"=="delete" goto DELETE_PASSWORD
if "%~1"=="execute" goto EXECUTE_WITH_PASSWORD

echo.
echo 🔧 Options disponibles:
echo.
echo 1. 💾 Sauvegarder le mot de passe SSH
echo 2. 🔍 Tester le mot de passe sauvegardé
echo 3. 🗑️  Supprimer le mot de passe sauvegardé
echo 4. 📋 Retour au menu principal
echo.

set /p "CHOICE=Votre choix (1-4): "

if "%CHOICE%"=="1" goto SAVE_PASSWORD
if "%CHOICE%"=="2" goto TEST_PASSWORD
if "%CHOICE%"=="3" goto DELETE_PASSWORD
if "%CHOICE%"=="4" goto END

echo ❌ Choix invalide
goto END

:SAVE_PASSWORD
echo.
echo 💾 Sauvegarde sécurisée du mot de passe SSH...

REM Lire la configuration de déploiement
if not exist "deploy-config.env" (
    echo ❌ Configuration de déploiement introuvable
    echo    Configurez d'abord le serveur avec configure-ssh.cmd
    pause
    goto END
)

for /f "usebackq tokens=1,2 delims==" %%A in ("deploy-config.env") do (
    if "%%A"=="DEPLOY_HOST" set "DEPLOY_HOST=%%B"
    if "%%A"=="DEPLOY_USER" set "DEPLOY_USER=%%B"
)

echo.
echo 🎯 Serveur: %DEPLOY_USER%@%DEPLOY_HOST%
echo.
echo ⚠️  ATTENTION: Le mot de passe sera stocké de manière encodée
echo    mais ce n'est pas 100%% sécurisé. Utilisez des clés SSH pour
echo    une sécurité maximale.
echo.

REM Demander le mot de passe de manière sécurisée
set /p "SSH_PASSWORD=Mot de passe SSH: "

if "%SSH_PASSWORD%"=="" (
    echo ❌ Mot de passe vide
    pause
    goto END
)

REM Encoder le mot de passe (simple obfuscation)
set "ENCODED_PASSWORD="
for /f "delims=" %%i in ('powershell -command "[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('%SSH_PASSWORD%'))"') do set "ENCODED_PASSWORD=%%i"

REM Sauvegarder dans le fichier de configuration
(
echo # Configuration SSH automatisée - Généré le %date% %time%
echo SSH_HOST=%DEPLOY_HOST%
echo SSH_USER=%DEPLOY_USER%
echo SSH_PASSWORD_ENCODED=%ENCODED_PASSWORD%
echo # ATTENTION: Ce fichier contient des informations sensibles
echo # Supprimez-le après utilisation pour plus de sécurité
) > "%CONFIG_FILE%"

echo ✅ Mot de passe sauvegardé de manière sécurisée
echo.
echo 🔒 Le fichier %CONFIG_FILE% a été créé
echo    Il sera utilisé automatiquement lors des déploiements
echo.
echo 💡 Conseil de sécurité: Supprimez ce fichier après usage
echo    ou utilisez des clés SSH pour plus de sécurité
pause
goto END

:LOAD_PASSWORD
if not exist "%CONFIG_FILE%" (
    echo ❌ Aucun mot de passe sauvegardé
    goto END
)

for /f "usebackq tokens=1,2 delims==" %%A in ("%CONFIG_FILE%") do (
    if "%%A"=="SSH_PASSWORD_ENCODED" (
        for /f "delims=" %%i in ('powershell -command "[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('%%B'))"') do set "SSH_PASSWORD=%%i"
    )
)
goto END

:TEST_PASSWORD
echo.
echo 🔍 Test du mot de passe sauvegardé...

call :LOAD_PASSWORD

if "%SSH_PASSWORD%"=="" (
    echo ❌ Aucun mot de passe sauvegardé ou erreur de décodage
    pause
    goto END
)

for /f "usebackq tokens=1,2 delims==" %%A in ("%CONFIG_FILE%") do (
    if "%%A"=="SSH_HOST" set "TEST_HOST=%%B"
    if "%%A"=="SSH_USER" set "TEST_USER=%%B"
)

echo 🎯 Test de connexion vers: %TEST_USER%@%TEST_HOST%

REM Créer un script temporaire pour le test
(
echo @echo off
echo echo Test de connexion SSH...
echo sshpass -p "%SSH_PASSWORD%" ssh -o PreferredAuthentications=password -o ConnectTimeout=5 %TEST_USER%@%TEST_HOST% "echo 'Connexion SSH réussie avec mot de passe sauvegardé!'"
) > "%TEMP_SCRIPT%"

call "%TEMP_SCRIPT%"
del "%TEMP_SCRIPT%" 2>nul

if %errorlevel% equ 0 (
    echo ✅ Mot de passe valide!
) else (
    echo ❌ Échec de la connexion
    echo    Le mot de passe sauvegardé est peut-être incorrect
)

pause
goto END

:DELETE_PASSWORD
echo.
echo 🗑️  Suppression du mot de passe sauvegardé...

if exist "%CONFIG_FILE%" (
    del "%CONFIG_FILE%"
    echo ✅ Mot de passe supprimé
) else (
    echo ⚠️  Aucun mot de passe sauvegardé
)

pause
goto END

:AUTO_EXEC
:: Fonction pour exécuter automatiquement un fichier de commande avec le mot de passe SSH
call :LOAD_PASSWORD

if "%SSH_PASSWORD%"=="" (
    echo ❌ Aucun mot de passe sauvegardé - utilisation de l'authentification manuelle
    call "%2"
    exit /b 0
)

echo ✅ Exécution automatique avec mot de passe sauvegardé...
:: Modifier temporairement le fichier de commande pour utiliser le mot de passe
powershell -command "
    $content = Get-Content '%2';
    $password = '%SSH_PASSWORD%';
    $newContent = $content -replace 'ssh ', ('echo ' + $password + ' | plink -ssh -batch -pw ');
    $newContent | Set-Content '%2.auto'
"
call "%2.auto"
del "%2.auto"
exit /b 0

:EXECUTE_WITH_PASSWORD
REM Cette fonction est appelée par d'autres scripts pour exécuter des commandes SSH
REM Usage: ssh-password-manager.cmd execute "commande_ssh"

call :LOAD_PASSWORD

if "%SSH_PASSWORD%"=="" (
    echo ❌ Aucun mot de passe sauvegardé
    echo    Utilisez d'abord l'option 1 pour sauvegarder votre mot de passe
    exit /b 1
)

REM Exécuter la commande avec le mot de passe
echo %~2 | powershell -command "& {$cmd = $input | Out-String; $cmd = $cmd.Replace('SSH_PASSWORD_PLACEHOLDER', '%SSH_PASSWORD%'); Invoke-Expression $cmd}"
goto END

:END
if exist "%TEMP_SCRIPT%" del "%TEMP_SCRIPT%" 2>nul
exit /b 0