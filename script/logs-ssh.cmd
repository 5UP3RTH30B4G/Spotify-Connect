@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo    📊 LOGS SPOTIFY CONNECT
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
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "
echo '🔍 Statut PM2:'
pm2 status

echo ''
echo '📝 Logs récents (50 dernières lignes):'
pm2 logs spotify-connect --lines 50 --nostream 2>/dev/null || echo 'Aucun log disponible'

echo ''
echo '💾 Utilisation mémoire:'
pm2 monit --no-colors 2>/dev/null | head -10 || echo 'Info mémoire non disponible'

echo ''
echo '🌐 Test de connectivité locale:'
curl -s http://localhost:3001 >/dev/null && echo '✅ Application répond sur port 3001' || echo '❌ Application ne répond pas'
"
goto END

:REALTIME
echo.
echo 📡 Logs en temps réel (Ctrl+C pour arrêter)...
echo.
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "pm2 logs spotify-connect"
goto END

:ERRORS
echo.
echo ❌ Logs d'erreur uniquement...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "
echo 'Erreurs PM2:'
pm2 logs spotify-connect --err --lines 50 --nostream 2>/dev/null || echo 'Aucune erreur PM2'

echo ''
echo 'Erreurs système:'
journalctl -u nginx --no-pager -n 20 2>/dev/null || echo 'Logs nginx non disponibles'
"
goto END

:RESTART
echo.
echo 🔄 Redémarrage de l'application...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "
cd %DEPLOY_PATH%
pm2 restart spotify-connect
echo 'Application redémarrée!'
pm2 status
"
goto END

:STOP
echo.
echo ⏹️  Arrêt de l'application...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "
pm2 stop spotify-connect
echo 'Application arrêtée!'
pm2 status
"
goto END

:START
echo.
echo ▶️  Démarrage de l'application...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "
cd %DEPLOY_PATH%
pm2 start ecosystem.config.js
echo 'Application démarrée!'
pm2 status
"
goto END

:END
echo.
pause