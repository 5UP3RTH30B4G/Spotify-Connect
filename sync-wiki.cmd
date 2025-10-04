@echo off
setlocal

REM ===============================================
REM    Script de synchronisation Wiki GitHub
REM ===============================================

echo.
echo ============================================
echo    📚 SYNCHRONISATION WIKI GITHUB
echo ============================================
echo.

set "WIKI_REPO=https://github.com/5UP3RTH30B4G/spotify-connect.wiki.git"
set "WIKI_DIR=spotify-connect.wiki"

REM Vérifier si Git est installé
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERREUR : Git n'est pas installé ou pas dans le PATH
    echo    Installez Git depuis : https://git-scm.com/
    pause
    exit /b 1
)

REM Vérifier si le dossier wiki existe
if exist "%WIKI_DIR%" (
    echo 🔄 Mise à jour du wiki existant...
    cd "%WIKI_DIR%"
    git pull origin master
    if errorlevel 1 (
        echo ⚠️  Erreur lors de la mise à jour, on continue...
    )
    cd ..
) else (
    echo 📥 Clonage du wiki GitHub...
    git clone "%WIKI_REPO%"
    if errorlevel 1 (
        echo ❌ ERREUR : Impossible de cloner le wiki
        echo    Vérifiez que le wiki est activé sur GitHub
        echo    Settings → Features → Wikis ✓
        pause
        exit /b 1
    )
)

REM Vérifier que le dossier wiki local existe
if not exist "wiki" (
    echo ❌ ERREUR : Dossier wiki/ introuvable
    echo    Ce script doit être exécuté depuis la racine du projet
    pause
    exit /b 1
)

echo 📁 Copie des fichiers wiki...

REM Copier tous les fichiers .md sauf README-WIKI.md
for %%f in (wiki\*.md) do (
    if not "%%~nf"=="README-WIKI" (
        echo    - %%~nxf
        copy "%%f" "%WIKI_DIR%\" >nul
    )
)

echo ✅ Fichiers copiés avec succès

REM Publier les changements
echo.
echo 📤 Publication des changements...
cd "%WIKI_DIR%"

REM Ajouter tous les fichiers
git add .

REM Vérifier s'il y a des changements
git diff --staged --quiet
if not errorlevel 1 (
    echo ℹ️  Aucun changement détecté dans le wiki
    cd ..
    echo.
    echo ============================================
    echo    ✅ WIKI DÉJÀ À JOUR !
    echo ============================================
    echo.
    pause
    exit /b 0
)

REM Commiter les changements
set "COMMIT_MSG=📚 Mise à jour automatique de la documentation - %date% %time%"
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo ❌ ERREUR : Échec du commit
    cd ..
    pause
    exit /b 1
)

REM Pousser vers GitHub
git push origin master
if errorlevel 1 (
    echo ❌ ERREUR : Échec de la publication
    echo    Vérifiez vos droits d'accès au repository wiki
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo ============================================
echo    🎉 WIKI SYNCHRONISÉ AVEC SUCCÈS !
echo ============================================
echo.
echo 🌐 Votre wiki est accessible sur :
echo    https://github.com/5UP3RTH30B4G/spotify-connect/wiki
echo.
echo 📋 Pages publiées :
echo    - Page d'accueil (Home)
echo    - Installation
echo    - Architecture  
echo    - Scripts de déploiement
echo    - FAQ
echo.
echo 💡 Pour modifier le wiki :
echo    1. Modifiez les fichiers dans le dossier wiki/
echo    2. Relancez ce script pour synchroniser
echo.

pause
goto :eof