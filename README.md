# 🎵 Spotify Connect

Une application web collaborative qui permet à plusieurs utilisateurs de contrôler Spotify ensemble en temps réel.

## ✨ Fonctionnalités

- 🔐 **Authentification Spotify OAuth** - Connexion sécurisée avec votre compte Spotify
- 👥 **Multi-utilisateurs** - Plusieurs personnes peuvent se connecter simultanément
- 🎮 **Contrôles synchronisés** - Play, pause, chanson suivante/précédente en temps réel
- 📋 **File d'attente collaborative** - Ajoutez des chansons que tout le monde peut voir
- 🔍 **Recherche partagée** - Recherchez et partagez des résultats avec les autres
- 💬 **Chat en temps réel** - Communiquez avec les autres utilisateurs
- 📱 **Interface responsive** - Fonctionne sur ordinateur, tablette et mobile
- 🎨 **Thème Spotify** - Interface sombre avec les couleurs de Spotify

## 🛠️ Technologies utilisées

### Backend
- **Node.js** + **Express** - Serveur API
- **Socket.IO** - Communication temps réel
- **Axios** - Requêtes HTTP vers l'API Spotify
- **Cookie-parser** - Gestion des sessions

### Frontend
- **React** - Interface utilisateur
- **Material-UI (MUI)** - Composants et thème
- **Socket.IO Client** - Communication temps réel
- **React Router** - Navigation

### API
- **Spotify Web API** - Contrôle de la lecture et recherche

## 📋 Prérequis

1. **Node.js** (version 16 ou supérieure)
2. **Compte Spotify Premium** (requis pour contrôler la lecture)
3. **Application Spotify** créée sur le [Spotify Developer Dashboard](https://developer.spotify.com/)

## 🚀 Installation

### 1. Cloner le projet
```bash
git clone https://github.com/5UP3RTH30B4G/spotify-connect
cd spotify-connect
```

### 2. Configuration Spotify Developer

1. Allez sur [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Connectez-vous avec votre compte Spotify
3. Cliquez sur **"Create App"**
4. Remplissez les informations :
   - **App name** : `Spotify Connect` (ou le nom de votre choix)
   - **App description** : `Application collaborative Spotify`
   - **Website** : `http://localhost:3000`
   - **Redirect URI** : `http://localhost:5000/auth/callback`
5. Acceptez les conditions et créez l'app
6. Notez votre **Client ID** et **Client Secret** (cliquez sur "Show client secret")

### 3. Configuration du serveur

#### Installer les dépendances du serveur
```bash
cd server
npm install
```

#### Configuration des variables d'environnement
Créez un fichier `.env` dans le dossier `server` :
```bash
# Dans le dossier server/
touch .env  # ou créez le fichier manuellement
```

Ajoutez le contenu suivant dans `server/.env` :
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Configuration Spotify (remplacez par vos vraies valeurs)
SPOTIFY_CLIENT_ID=votre_client_id_spotify
SPOTIFY_CLIENT_SECRET=votre_client_secret_spotify
SPOTIFY_REDIRECT_URI=http://localhost:5000/auth/callback

# URL de base pour l'API
API_BASE_URL=http://localhost:5000
```

### 4. Configuration du client

#### Installer les dépendances du client
```bash
cd ../client  # Retourner à la racine puis aller dans client
npm install
```

#### Configuration optionnelle
Créez un fichier `.env` dans le dossier `client` (optionnel) :
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SERVER_URL=http://localhost:5000
```

### 5. Installation rapide (alternative)

Si vous préférez tout installer en une fois depuis la racine :
```bash
# Depuis la racine du projet
npm install          # Installe les dépendances racine
cd server && npm install && cd ..
cd client && npm install && cd ..
```

## 🎯 Démarrage

### Démarrage en développement

#### Option 1 : Démarrage simultané (recommandé)
```bash
# Depuis la racine du projet
npm run dev
```
Cette commande démarre automatiquement :
- Le serveur sur http://localhost:5000
- Le client React sur http://localhost:3000

#### Option 2 : Démarrage séparé
**Terminal 1 - Serveur :**
```bash
cd server
npm run dev
```

**Terminal 2 - Client :**
```bash
cd client
npm start
```

### Démarrage en production

1. **Builder le client :**
```bash
cd client
npm run build
```

2. **Démarrer le serveur en production :**
```bash
cd ../server
npm start
```

Le serveur servira automatiquement les fichiers statiques du client buildé.

### Vérification du bon fonctionnement

1. ✅ **Serveur** : http://localhost:5000 doit afficher "Spotify Connect Server is running"
2. ✅ **Client** : http://localhost:3000 doit afficher la page de connexion Spotify
3. ✅ **Socket.IO** : Les connexions temps réel doivent fonctionner (visible dans les logs)

## 🎮 Utilisation

1. **Ouvrez Spotify** sur un appareil (ordinateur, téléphone, etc.)
2. **Accédez à l'application** : http://localhost:3000
3. **Connectez-vous** avec votre compte Spotify
4. **Invitez des amis** en partageant l'URL
5. **Contrôlez la musique** ensemble !

## ⚠️ Notes importantes

- **Spotify Premium requis** : Seuls les comptes Premium peuvent contrôler la lecture
- **Appareil actif** : Spotify doit être ouvert sur au moins un appareil
- **Permissions** : L'application demande les permissions suivantes :
  - `user-read-private` - Informations de profil
  - `user-read-email` - Adresse email
  - `user-read-playback-state` - État de lecture
  - `user-modify-playback-state` - Contrôle de lecture
  - `user-read-currently-playing` - Chanson actuelle
  - `streaming` - Lecture dans le navigateur

## 🎨 Interface

L'application est organisée en plusieurs sections :

- **🎵 Lecteur principal** - Affiche la chanson actuelle et les contrôles
- **🔍 Recherche** - Recherchez et ajoutez des chansons
- **📋 File d'attente** - Voyez les chansons ajoutées par tous les utilisateurs
- **👥 Utilisateurs connectés** - Liste des personnes connectées
- **💬 Chat** - Communiquez en temps réel

## 🔧 Développement

### Structure du projet
```
spotify-connect-remastered/
├── server/              # Backend Node.js
│   ├── routes/         # Routes API
│   ├── socket/         # Gestion Socket.IO
│   └── index.js        # Point d'entrée serveur
├── client/             # Frontend React
│   ├── src/
│   │   ├── components/ # Composants React
│   │   ├── contexts/   # Contextes (Auth, Socket)
│   │   └── App.js      # Application principale
│   └── public/
└── package.json        # Scripts et dépendances racine
```

### Scripts disponibles

**Depuis la racine :**
```bash
npm run dev              # Développement (serveur + client) - si configuré
```

**Depuis le dossier server/ :**
```bash
npm run dev              # Serveur en mode développement avec nodemon
npm start                # Serveur en mode production
```

**Depuis le dossier client/ :**
```bash
npm start                # Client en mode développement
npm run build            # Build de production du client
npm test                 # Tests du client
```

## 🐛 Résolution de problèmes

### Erreur "No active device"
- Ouvrez Spotify sur un appareil
- Lancez une chanson
- Rafraîchissez l'application

### Erreur d'authentification
- Vérifiez vos `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET`
- Vérifiez l'URI de redirection dans votre app Spotify

### Problèmes de connexion temps réel
- Vérifiez que le serveur Socket.IO fonctionne (port 5000)
- Vérifiez les paramètres CORS

## 🚀 Déploiement en production

### Scripts automatisés
Ce projet inclut des scripts de déploiement automatisés pour simplifier la mise en production :

```cmd
# 1. Configuration initiale (une seule fois)
set-deploy-config.cmd    # Configure vos identifiants serveur (sécurisé)
setup-ssh.cmd           # Configure l'authentification SSH

# 2. Déploiement
deploy.cmd              # Déploiement complet
quick-deploy.cmd        # Déploiement rapide du client uniquement

# 3. Documentation
sync-wiki.cmd           # Synchronise la documentation avec le wiki GitHub
```

### Configuration du serveur de production

1. **Configurez vos identifiants** (fichier local non publié) :
   ```cmd
   set-deploy-config.cmd
   ```

2. **Configurez SSH** pour l'authentification automatique :
   ```cmd
   setup-ssh.cmd
   ```

3. **Déployez l'application** :
   ```cmd
   deploy.cmd
   ```

**📋 Documentation complète :** Consultez [DEPLOY.md](DEPLOY.md) pour tous les détails des scripts de déploiement.

### Options de déploiement avancées
```cmd
deploy.cmd --client-only     # Client React seulement
deploy.cmd --server-only     # Serveur Node.js seulement  
deploy.cmd --no-build        # Sans rebuild du client
deploy.cmd --no-restart      # Sans redémarrage du serveur
deploy.cmd --help            # Afficher toutes les options
```

### Variables d'environnement de production
Sur votre serveur, configurez ces variables dans `server/.env` :
```env
NODE_ENV=production
PORT=5000
CLIENT_URL=https://votre-domaine.com

SPOTIFY_CLIENT_ID=votre_client_id
SPOTIFY_CLIENT_SECRET=votre_client_secret
SPOTIFY_REDIRECT_URI=https://votre-domaine.com/auth/callback

API_BASE_URL=https://votre-domaine.com
```

## 🤝 Contribution

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🎉 Crédits

- **Spotify Web API** pour l'intégration musicale
- **Material-UI** pour les composants d'interface
- **Socket.IO** pour la communication temps réel

---

Créé avec ❤️ pour la musique collaborative !
