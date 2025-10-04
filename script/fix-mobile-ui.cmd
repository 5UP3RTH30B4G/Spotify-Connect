@echo off
echo.
echo =============================================
echo    🔧 CORRECTION INTERFACE MOBILE
echo =============================================

echo.
echo 📱 Application des corrections pour l'interface mobile...

REM Vérifier si les fichiers existent
if not exist "..\client\src\components\PlayerControls.mobile.js" (
    echo ❌ Fichier PlayerControls.mobile.js introuvable
    pause
    exit /b 1
)

if not exist "PlayerControls.mobile.fixed.js" (
    echo ❌ Fichier de correction introuvable
    pause
    exit /b 1
)

echo.
echo 💾 Sauvegarde de l'ancien fichier...
copy "..\client\src\components\PlayerControls.mobile.js" "..\client\src\components\PlayerControls.mobile.js.backup" >nul

echo.
echo 🔄 Remplacement par la version corrigée...
copy "PlayerControls.mobile.fixed.js" "..\client\src\components\PlayerControls.mobile.js" >nul

echo.
echo 🏗️  Reconstruction de l'application...
cd ..\client
call npm run build

if %errorlevel% equ 0 (
    echo.
    echo ✅ CORRECTIONS APPLIQUÉES AVEC SUCCÈS !
    echo.
    echo 📱 Améliorations apportées :
    echo    • Interface mobile responsive corrigée
    echo    • Player fixe en bas de l'écran
    echo    • Contrôles tactiles optimisés
    echo    • Scroll amélioré
    echo    • Menus adaptés mobile
    echo    • Performance optimisée
    echo.
    echo 🚀 Vous pouvez maintenant redéployer l'application
    echo    avec un interface mobile corrigée !
) else (
    echo.
    echo ❌ Erreur lors de la construction
    echo.
    echo 🔄 Restauration de l'ancien fichier...
    copy "..\client\src\components\PlayerControls.mobile.js.backup" "..\client\src\components\PlayerControls.mobile.js" >nul
    echo    Ancien fichier restauré
)

cd ..\script
echo.
pause