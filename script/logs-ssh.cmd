@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo    📊 LOGS Sound Party
echo ============================================

REM Lecture de la configuration
if not exist "deploy-config.env" (
    echo ❌ Fichier deploy-config.env introuvable
    echo    Exécutez d'abord: configure-ssh.cmd
    pause
    exit /b 1
)

for /f "usebackq tokens=1,2 delims==" %%A in ("deploy-config.env") do (
    if "%%A"=="DEPLOY_HOST" set "DEPLOY_HOST=%%B"
    if "%%A"=="DEPLOY_USER" set "DEPLOY_USER=%%B"
    if "%%A"=="DEPLOY_PATH" set "DEPLOY_PATH=%%B"
)

echo 🎯 Serveur: %DEPLOY_USER%@%DEPLOY_HOST%

echo.
echo Que voulez-vous consulter?
echo.
echo 1. Statut PM2 et logs récents
echo 2. Logs en temps réel (Ctrl+C pour arrêter)
echo 3. Logs d'erreur uniquement
echo 4. Redémarrer l'application
echo 5. Arrêter l'application
echo 6. Démarrer l'application
echo.
set /p "CHOICE=Votre choix (1-6): "

if "%CHOICE%"=="1" goto STATUS
if "%CHOICE%"=="2" goto REALTIME
if "%CHOICE%"=="3" goto ERRORS
if "%CHOICE%"=="4" goto RESTART
if "%CHOICE%"=="5" goto STOP
if "%CHOICE%"=="6" goto START

echo ❌ Choix invalide
pause
exit /b 1

:STATUS
echo.
echo 📊 Statut de l'application...

:: Créer un script temporaire pour les commandes SSH
echo @echo off > temp_status.cmd
echo ssh %DEPLOY_USER%@%DEPLOY_HOST% "echo '🔍 Statut PM2:' && pm2 status && echo '' && echo '📝 Logs récents (50 dernières lignes):' && pm2 logs Sound-Party --lines 50 --nostream 2>/dev/null || echo 'Aucun log disponible' && echo '' && echo '💾 Utilisation mémoire:' && pm2 monit --no-colors 2>/dev/null | head -10 || echo 'Info mémoire non disponible' && echo '' && echo '🌐 Test de connectivité locale:' && curl -s http://127.0.0.1:3001 >/dev/null && echo '✅ Application répond sur port 3001' || echo '❌ Application ne répond pas'" >> temp_status.cmd

:: Utiliser le gestionnaire de mots de passe si disponible
if exist "ssh-credentials.dat" (
    echo ✅ Utilisation du mot de passe SSH sauvegardé...
    call ssh-password-manager.cmd auto-exec temp_status.cmd
) else (
    echo ⚠️ Mot de passe SSH non sauvegardé - saisie manuelle requise
    call temp_status.cmd
)

if exist "temp_status.cmd" del temp_status.cmd
goto END

:REALTIME
echo.
echo 📡 Logs en temps réel (Ctrl+C pour arrêter)...
echo.

:: Créer un script temporaire pour les logs en temps réel
echo @echo off > temp_realtime.cmd
echo ssh %DEPLOY_USER%@%DEPLOY_HOST% "pm2 logs Sound-Party" >> temp_realtime.cmd

:: Utiliser le gestionnaire de mots de passe si disponible
if exist "ssh-credentials.dat" (
    echo ✅ Utilisation du mot de passe SSH sauvegardé...
    call ssh-password-manager.cmd auto-exec temp_realtime.cmd
) else (
    echo ⚠️ Mot de passe SSH non sauvegardé - saisie manuelle requise
    call temp_realtime.cmd
)

if exist "temp_realtime.cmd" del temp_realtime.cmd
goto END

:ERRORS
echo.
echo ❌ Logs d'erreur uniquement...

:: Créer un script temporaire pour les erreurs
echo @echo off > temp_errors.cmd
echo ssh %DEPLOY_USER%@%DEPLOY_HOST% "echo 'Erreurs PM2:' && pm2 logs Sound-Party --err --lines 50 --nostream 2>/dev/null || echo 'Aucune erreur PM2' && echo '' && echo 'Erreurs système:' && journalctl -u nginx --no-pager -n 20 2>/dev/null || echo 'Logs nginx non disponibles'" >> temp_errors.cmd

:: Utiliser le gestionnaire de mots de passe si disponible
if exist "ssh-credentials.dat" (
    echo ✅ Utilisation du mot de passe SSH sauvegardé...
    call ssh-password-manager.cmd auto-exec temp_errors.cmd
) else (
    echo ⚠️ Mot de passe SSH non sauvegardé - saisie manuelle requise
    call temp_errors.cmd
)

if exist "temp_errors.cmd" del temp_errors.cmd
goto END

:RESTART
echo.
echo 🔄 Redémarrage de l'application...

:: Créer un script temporaire pour le redémarrage
echo @echo off > temp_restart.cmd
echo ssh %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH% && pm2 restart Sound-Party && echo 'Application redémarrée!' && pm2 status" >> temp_restart.cmd

:: Utiliser le gestionnaire de mots de passe si disponible
if exist "ssh-credentials.dat" (
    echo ✅ Utilisation du mot de passe SSH sauvegardé...
    call ssh-password-manager.cmd auto-exec temp_restart.cmd
) else (
    echo ⚠️ Mot de passe SSH non sauvegardé - saisie manuelle requise
    call temp_restart.cmd
)

if exist "temp_restart.cmd" del temp_restart.cmd
goto END

:STOP
echo.
echo ⏹️  Arrêt de l'application...

:: Créer un script temporaire pour l'arrêt
echo @echo off > temp_stop.cmd
echo ssh %DEPLOY_USER%@%DEPLOY_HOST% "pm2 stop Sound-Party && echo 'Application arrêtée!' && pm2 status" >> temp_stop.cmd

:: Utiliser le gestionnaire de mots de passe si disponible
if exist "ssh-credentials.dat" (
    echo ✅ Utilisation du mot de passe SSH sauvegardé...
    call ssh-password-manager.cmd auto-exec temp_stop.cmd
) else (
    echo ⚠️ Mot de passe SSH non sauvegardé - saisie manuelle requise
    call temp_stop.cmd
)

if exist "temp_stop.cmd" del temp_stop.cmd
goto END

:START
echo.
echo ▶️  Démarrage de l'application...

:: Créer un script temporaire pour le démarrage
echo @echo off > temp_start.cmd
echo ssh %DEPLOY_USER%@%DEPLOY_HOST% "cd %DEPLOY_PATH% && pm2 start ecosystem.config.js && echo 'Application démarrée!' && pm2 status" >> temp_start.cmd

:: Utiliser le gestionnaire de mots de passe si disponible
if exist "ssh-credentials.dat" (
    echo ✅ Utilisation du mot de passe SSH sauvegardé...
    call ssh-password-manager.cmd auto-exec temp_start.cmd
) else (
    echo ⚠️ Mot de passe SSH non sauvegardé - saisie manuelle requise
    call temp_start.cmd
)

if exist "temp_start.cmd" del temp_start.cmd
goto END

:END
echo.
pause