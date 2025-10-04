# 🔧 Installation

Guide d'installation complète de Spotify Connect, de la configuration initiale au premier démarrage.

## 📋 Prérequis

### Système
- **Node.js** 16.0+ ([Télécharger](https://nodejs.org/))
- **npm** 8.0+ (inclus avec Node.js)
- **Git** ([Télécharger](https://git-scm.com/))

### Spotify
- **Compte Spotify Premium** (requis pour contrôler la lecture)
- **Application Spotify Developer** ([Créer ici](https://developer.spotify.com/dashboard))

### Serveur (pour la production)
- **Serveur Linux** (Ubuntu, Debian, CentOS...)
- **Accès SSH** avec clés d'authentification
- **Nom de domaine** ou IP publique
- **Certificat SSL** (Let's Encrypt recommandé)

## 🚀 Installation locale (développement)

### 1. Clonage du projet
```bash
# Cloner le repository
git clone https://github.com/5UP3RTH30B4G/spotify-connect
cd spotify-connect
```

### 2. Configuration Spotify Developer

#### Créer une application Spotify
1. Allez sur [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Connectez-vous avec votre compte Spotify
3. Cliquez sur **"Create App"**
4. Remplissez les informations :
   ```
   App name: Spotify Connect
   App description: Application collaborative de contrôle Spotify
   Website: http://localhost:3000
   Redirect URI: http://localhost:5000/auth/callback
   ```
5. Cochez **"Web API"** et **"Web Playback SDK"**
6. Acceptez les termes et créez l'application

#### Récupérer les identifiants
1. Dans votre application, cliquez sur **"Settings"**
2. Notez votre **Client ID**
3. Cliquez sur **"View client secret"** et notez le **Client Secret**

### 3. Configuration du serveur

#### Installation des dépendances
```bash
cd server
npm install
```

#### Configuration des variables d'environnement
Créez le fichier `server/.env` :
```bash
# Dans le dossier server/
touch .env  # Linux/Mac
# ou créez le fichier manuellement sous Windows
```

Contenu du fichier `server/.env` :
```env
# Environnement
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Configuration Spotify (remplacez par vos vraies valeurs)
SPOTIFY_CLIENT_ID=votre_client_id_ici
SPOTIFY_CLIENT_SECRET=votre_client_secret_ici
SPOTIFY_REDIRECT_URI=http://localhost:5000/auth/callback

# URL de base pour l'API
API_BASE_URL=http://localhost:5000
```

**⚠️ Important :** Remplacez `votre_client_id_ici` et `votre_client_secret_ici` par vos vraies valeurs Spotify.

### 4. Configuration du client

#### Installation des dépendances
```bash
cd ../client  # Depuis la racine : cd client
npm install
```

#### Configuration optionnelle
Créez le fichier `client/.env` (optionnel) :
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SERVER_URL=http://localhost:5000
```

## 🎯 Premier démarrage

### Démarrage du serveur
```bash
# Terminal 1 - Serveur
cd server
npm run dev
```

Vous devriez voir :
```
🚀 Serveur démarré sur le port 5000
🔌 Socket.IO initialisé
📡 Serveur prêt à recevoir des connexions
```

### Démarrage du client
```bash
# Terminal 2 - Client
cd client
npm start
```

Le navigateur s'ouvrira automatiquement sur `http://localhost:3000`.

### Vérifications
1. **Serveur** : `http://localhost:5000` → "Spotify Connect Server is running"
2. **Client** : `http://localhost:3000` → Page de connexion Spotify
3. **Socket.IO** : Pas d'erreurs dans les logs du serveur

## 🌐 Installation en production

### 1. Préparation du serveur

#### Mise à jour du système
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

#### Installation de Node.js
```bash
# Via NodeSource (recommandé)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérification
node --version  # v18.x.x
npm --version   # 9.x.x
```

#### Installation de PM2
```bash
sudo npm install -g pm2
```

#### Installation de Nginx (optionnel)
```bash
sudo apt install nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. Déploiement avec les scripts automatisés

#### Configuration des identifiants
```cmd
# Sur votre machine locale
set-deploy-config.cmd
```

Modifiez le fichier `deploy-config.env` créé :
```env
DEPLOY_HOST=votre-serveur.com
DEPLOY_USER=root  # ou ubuntu
DEPLOY_PATH=/var/www/spotify-connect
```

#### Configuration SSH
```cmd
setup-ssh.cmd
```

#### Déploiement
```cmd
deploy.cmd
```

### 3. Configuration manuelle (alternative)

#### Transfert des fichiers
```bash
# Depuis votre machine locale
scp -r . user@votre-serveur.com:/var/www/spotify-connect/
```

#### Installation des dépendances
```bash
# Sur le serveur
cd /var/www/spotify-connect/server
npm install --production

cd ../client
npm install
npm run build
```

#### Configuration des variables d'environnement
```bash
# Sur le serveur
nano /var/www/spotify-connect/server/.env
```

Contenu pour la production :
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://votre-domaine.com

SPOTIFY_CLIENT_ID=votre_client_id
SPOTIFY_CLIENT_SECRET=votre_client_secret
SPOTIFY_REDIRECT_URI=https://votre-domaine.com/auth/callback

API_BASE_URL=https://votre-domaine.com
```

#### Démarrage avec PM2
```bash
cd /var/www/spotify-connect
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🔧 Configuration avancée

### Configuration Nginx

Créez `/etc/nginx/sites-available/spotify-connect` :
```nginx
server {
    listen 80;
    server_name votre-domaine.com;
    
    # Redirection HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com;
    
    # Certificats SSL
    ssl_certificate /etc/ssl/certs/votre-cert.pem;
    ssl_certificate_key /etc/ssl/private/votre-key.pem;
    
    # Servir les fichiers statiques
    location / {
        root /var/www/spotify-connect/client/build;
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy vers l'API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Proxy pour Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activation :
```bash
sudo ln -s /etc/nginx/sites-available/spotify-connect /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Certificat SSL avec Let's Encrypt
```bash
# Installation Certbot
sudo apt install certbot python3-certbot-nginx

# Génération du certificat
sudo certbot --nginx -d votre-domaine.com

# Auto-renouvellement
sudo crontab -e
# Ajouter : 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall
```bash
# UFW (Ubuntu)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## ✅ Vérifications post-installation

### Tests locaux
1. **Serveur** : `curl http://localhost:5000`
2. **Client** : Ouvrir `http://localhost:3000`
3. **Authentification** : Se connecter avec Spotify
4. **Fonctionnalités** : Tester play/pause, recherche, chat

### Tests production
1. **Site web** : `https://votre-domaine.com`
2. **SSL** : Vérifier le cadenas vert
3. **API** : `curl https://votre-domaine.com/api/health`
4. **WebSocket** : Tester le chat temps réel

### Logs et monitoring
```bash
# Logs PM2
pm2 logs

# Statut PM2
pm2 status

# Logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🐛 Troubleshooting installation

### Erreurs communes

#### "Cannot find module"
```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

#### "Port already in use"
```bash
# Trouver le processus
sudo netstat -tulpn | grep :5000
sudo kill -9 PID

# Ou changer le port dans .env
PORT=5001
```

#### "Invalid client_id"
- Vérifiez vos identifiants Spotify dans `.env`
- Vérifiez l'URI de redirection dans Spotify Developer Dashboard

#### "SSH connection failed"
```bash
# Tester la connexion
ssh -v user@serveur.com

# Régénérer les clés SSH
ssh-keygen -t rsa -b 4096
```

### Support
- **Wiki** : [Pages d'aide complètes](Home)
- **Issues** : [GitHub Issues](https://github.com/5UP3RTH30B4G/spotify-connect/issues)
- **Documentation** : [README principal](../README.md)

---

[← Retour au wiki](Home) | [Suivant : Configuration →](Configuration)