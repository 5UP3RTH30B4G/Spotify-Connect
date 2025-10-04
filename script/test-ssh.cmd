@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo    🔍 TEST CONNEXION SSH
echo ============================================

REM Lecture de la configuration
if not exist "deploy-config.env" (
    echo ❌ Fichier deploy-config.env introuvable
    echo    Exécutez d'abord: configure-ssh.cmd
    pause
    exit /b 1
)

echo 📖 Lecture de la configuration...
for /f "usebackq tokens=1,2 delims==" %%A in ("deploy-config.env") do (
    if not "%%A"=="" if not "%%A"=="REM" if not "%%A"=="#" (
        set "%%A=%%B"
        echo    %%A = %%B
    )
)

echo.
echo 🎯 Test de connexion vers: %DEPLOY_USER%@%DEPLOY_HOST%

echo.
echo 🔐 Test 1: Connexion SSH basique...
ssh -o PreferredAuthentications=password -o ConnectTimeout=10 %DEPLOY_USER%@%DEPLOY_HOST% "echo 'Connexion SSH réussie!'"
if %errorlevel% equ 0 (
    echo ✅ Connexion SSH fonctionnelle
) else (
    echo ❌ Échec de la connexion SSH
    echo    Vérifiez vos identifiants et l'accès au serveur
    pause
    exit /b 1
)

echo.
echo 🖥️  Test 2: Informations système...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "
echo 'Système: '$(lsb_release -d 2>/dev/null | cut -f2 || cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"')
echo 'Kernel: '$(uname -r)
echo 'Architecture: '$(uname -m)
echo 'Espace disque disponible:'
df -h / | tail -1
"

echo.
echo 🔧 Test 3: Outils requis...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "
echo 'Vérification des outils requis:'

if command -v node &> /dev/null; then
    echo '✅ Node.js: '$(node --version)
else
    echo '❌ Node.js non installé'
fi

if command -v npm &> /dev/null; then
    echo '✅ npm: '$(npm --version)
else
    echo '❌ npm non installé'
fi

if command -v pm2 &> /dev/null; then
    echo '✅ PM2: '$(pm2 --version)
else
    echo '⚠️  PM2 non installé (sera installé automatiquement)'
fi

if command -v nginx &> /dev/null; then
    echo '✅ Nginx: '$(nginx -v 2>&1 | cut -d'/' -f2)
    if systemctl is-active --quiet nginx; then
        echo '✅ Nginx en cours d\'exécution'
    else
        echo '⚠️  Nginx arrêté'
    fi
else
    echo '⚠️  Nginx non installé'
fi
"

echo.
echo 📁 Test 4: Permissions sur le répertoire de déploiement...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "
echo 'Test des permissions pour: %DEPLOY_PATH%'
mkdir -p %DEPLOY_PATH% && echo '✅ Création/accès au répertoire réussi' || echo '❌ Impossible de créer le répertoire'
touch %DEPLOY_PATH%/test-write && rm %DEPLOY_PATH%/test-write && echo '✅ Permissions d\'écriture OK' || echo '❌ Pas de permissions d\'écriture'
"

echo.
echo 🌐 Test 5: Connectivité réseau...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "
echo 'Test de connectivité réseau:'
if curl -s --connect-timeout 5 https://registry.npmjs.org/ > /dev/null; then
    echo '✅ Accès à npm registry'
else
    echo '❌ Pas d\'accès à npm registry'
fi

if curl -s --connect-timeout 5 https://nodejs.org/ > /dev/null; then
    echo '✅ Accès à nodejs.org'
else
    echo '❌ Pas d\'accès à nodejs.org'
fi
"

echo.
echo 📊 Test 6: État actuel de l'application...
ssh -o PreferredAuthentications=password %DEPLOY_USER%@%DEPLOY_HOST% "
if [ -d '%DEPLOY_PATH%' ]; then
    echo 'Application trouvée dans %DEPLOY_PATH%:'
    ls -la %DEPLOY_PATH%/ 2>/dev/null || echo 'Répertoire vide ou inaccessible'
    
    if command -v pm2 &> /dev/null; then
        echo 'Statut PM2:'
        pm2 status 2>/dev/null || echo 'Aucun processus PM2'
    fi
else
    echo 'Aucune installation existante trouvée'
fi
"

echo.
echo ✅ TESTS TERMINÉS!
echo.
echo 📋 Résumé:
echo    - Si tous les tests sont verts, vous pouvez déployer avec: deploy-ssh.cmd
echo    - Si Node.js manque, installez-le d'abord sur le serveur
echo    - Si Nginx manque, il sera configuré lors du déploiement
echo.
pause