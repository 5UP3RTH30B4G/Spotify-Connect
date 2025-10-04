# 🚀 Scripts de Déploiement

Ce dossier contient plusieurs scripts pour automatiser le déploiement de Spotify Connect sur votre VPS.

## � Configuration sécurisée

**Important :** Les scripts utilisent des variables d'environnement pour éviter d'exposer vos identifiants dans le code public.

### Configuration initiale :

1. **Configurez vos identifiants :**
```cmd
set-deploy-config.cmd
```
Ce script va :
- Créer un fichier `deploy-config.env` depuis l'exemple
- Vous demander de le modifier avec vos vraies valeurs
- Définir les variables d'environnement

2. **Modifiez le fichier `deploy-config.env` :**
```env
DEPLOY_HOST=votre-serveur.com
DEPLOY_USER=votre-utilisateur
DEPLOY_PATH=/chemin/vers/votre/app
```

3. **Le fichier `deploy-config.env` est automatiquement ignoré par Git** pour protéger vos identifiants.

## �📋 Scripts disponibles

### 1. `set-deploy-config.cmd` - Configuration des identifiants
```cmd
set-deploy-config.cmd
```
**À exécuter en premier !** Configure vos identifiants de serveur en toute sécurité.

### 2. `setup-ssh.cmd` - Configuration SSH
```cmd
setup-ssh.cmd
```
**À exécuter en premier !** Configure automatiquement les clés SSH pour la connexion sans mot de passe.

**Ce que fait ce script :**
- Vérifie la présence d'une clé SSH
- Génère une nouvelle clé si nécessaire
- Teste la connexion SSH
- Affiche les instructions pour configurer la clé sur le serveur

### 2. `deploy.cmd` - Déploiement complet
```cmd
deploy.cmd [OPTIONS]
```
Script principal de déploiement avec de nombreuses options.

**Options disponibles :**
- `--host HOST` : Serveur cible (défaut: scpearth.fr)
- `--user USER` : Utilisateur SSH (défaut: root)
- `--path PATH` : Chemin sur le serveur
- `--client-only` : Déployer uniquement le client React
- `--server-only` : Déployer uniquement le serveur Node.js
- `--no-build` : Ne pas rebuilder le client
- `--no-restart` : Ne pas redémarrer PM2
- `--help` : Afficher l'aide

**Exemples d'utilisation :**
```cmd
# Déploiement complet (recommandé)
deploy.cmd

# Client seulement (après modification du front)
deploy.cmd --client-only

# Serveur seulement (après modification du back)
deploy.cmd --server-only

# Déploiement rapide sans rebuild
deploy.cmd --no-build --no-restart

# Vers un autre serveur
deploy.cmd --host monserveur.com --user ubuntu
```

### 3. `quick-deploy.cmd` - Déploiement rapide
```cmd
quick-deploy.cmd
```
Déploiement ultra-rapide du client seulement (pour les modifications fréquentes de l'interface).

## 🔧 Configuration initiale

### 1. Première utilisation (SÉCURISÉE)
```cmd
# 1. Configurer vos identifiants serveur
set-deploy-config.cmd

# 2. Configurer SSH
setup-ssh.cmd

# 3. Premier déploiement complet
deploy.cmd
```

### 2. Workflow de développement
```cmd
# Après modification du client
quick-deploy.cmd

# Après modification du serveur
deploy.cmd --server-only

# Déploiement complet
deploy.cmd
```

## 🛠️ Configuration du serveur

### Structure attendue sur le VPS :
```
/var/www/spotify-connect.mooo.com/
├── server/                 # Code serveur Node.js
├── client/build/          # Build React statique
├── ecosystem.config.js    # Configuration PM2
└── package.json          # Métadonnées du projet
```

### Variables d'environnement requises :
Le fichier `/var/www/spotify-connect.mooo.com/server/.env` doit contenir :
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://spotify-connect.mooo.com

SPOTIFY_CLIENT_ID=votre_client_id
SPOTIFY_CLIENT_SECRET=votre_client_secret
SPOTIFY_REDIRECT_URI=https://spotify-connect.mooo.com/auth/callback

API_BASE_URL=https://spotify-connect.mooo.com
```

## 🔍 Diagnostic des problèmes

### Problème SSH
```cmd
setup-ssh.cmd
```

### Problème de build
```cmd
cd client
npm install
npm run build
```

### Problème PM2
Sur le serveur :
```bash
pm2 kill
cd /var/www/spotify-connect.mooo.com
pm2 start ecosystem.config.js
pm2 logs
```

### Vérifications sur le serveur
```bash
# Statut des services
pm2 status
pm2 logs

# Tester le serveur
curl http://localhost:5000

# Vérifier les fichiers
ls -la /var/www/spotify-connect.mooo.com/
```

## ⚡ Conseils d'utilisation

### Pour le développement quotidien :
1. `quick-deploy.cmd` pour les modifications du front-end
2. `deploy.cmd --server-only` pour les modifications du back-end
3. `deploy.cmd` pour les gros changements

### Pour la production :
1. Toujours tester localement avant
2. Utiliser `deploy.cmd` complet
3. Vérifier les logs après déploiement

### Sécurité :
- Les clés SSH sont générées localement
- Aucun mot de passe stocké dans les scripts
- Connexion chiffrée pour tous les transferts

## 📞 Support

En cas de problème :
1. Vérifiez la connexion SSH avec `setup-ssh.cmd`
2. Consultez les logs PM2 sur le serveur
3. Vérifiez la configuration des variables d'environnement
4. Testez localement avant de déployer