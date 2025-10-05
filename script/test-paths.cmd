@echo off
echo.
echo 🧪 Test des chemins des scripts...
echo.

echo Répertoire du script: %~dp0
echo.

echo Vérification des fichiers:
if exist "%~dp0deploy-auto.cmd" (
    echo ✅ deploy-auto.cmd trouvé
) else (
    echo ❌ deploy-auto.cmd non trouvé
)

if exist "%~dp0deploy-config.env" (
    echo ✅ deploy-config.env trouvé
) else (
    echo ❌ deploy-config.env non trouvé
)

if exist "%~dp0ssh-credentials.dat" (
    echo ✅ ssh-credentials.dat trouvé
) else (
    echo ⚠️ ssh-credentials.dat non trouvé (normal si pas encore configuré)
)

echo.
echo Test terminé.
pause