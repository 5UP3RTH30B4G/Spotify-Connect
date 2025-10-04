# 📐 Architecture

Cette page décrit l'architecture complète de Spotify Connect, ses composants et leurs interactions.

## 🏗️ Vue d'ensemble de l'architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client React  │    │  Serveur Node   │    │   Spotify API   │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │Components │  │    │  │   Routes  │  │    │  │ Web API   │  │
│  │           │  │◄──►│  │           │  │◄──►│  │           │  │
│  │ - Player  │  │    │  │ - Auth    │  │    │  │ - Auth    │  │
│  │ - Search  │  │    │  │ - Spotify │  │    │  │ - Player  │  │
│  │ - Queue   │  │    │  │           │  │    │  │ - Search  │  │
│  │ - Chat    │  │    │  └───────────┘  │    │  └───────────┘  │
│  └───────────┘  │    │                 │    │                 │
│                 │    │  ┌───────────┐  │    └─────────────────┘
│  ┌───────────┐  │    │  │Socket.IO  │  │
│  │ Contexts  │  │◄──►│  │           │  │
│  │           │  │    │  │ - Events  │  │
│  │ - Auth    │  │    │  │ - Rooms   │  │
│  │ - Socket  │  │    │  │ - Sync    │  │
│  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘
```

## 🎯 Composants principaux

### Frontend (React)

#### 🧩 Composants React
| Composant | Responsabilité |
|-----------|----------------|
| `MainApp.js` | Layout principal et navigation |
| `PlayerControls.js` | Contrôles de lecture (play/pause/volume) |
| `SearchComponent.js` | Recherche de musique |
| `QueueComponent.js` | File d'attente collaborative |
| `ChatComponent.js` | Messagerie temps réel |
| `ConnectedUsers.js` | Liste des utilisateurs connectés |
| `LoginPage.js` | Authentification Spotify |

#### 🔄 Contextes (State Management)
| Contexte | Fonction |
|----------|----------|
| `AuthContext.js` | Gestion de l'authentification |
| `SocketContext.js` | Communication temps réel |

#### 📱 Responsive Design
- **Desktop** : Layout 3 colonnes (player, queue, chat)
- **Mobile** : Layout vertical avec onglets
- **Breakpoints** : Material-UI responsive

### Backend (Node.js)

#### 🛣️ Routes API
| Route | Méthode | Description |
|-------|---------|-------------|
| `/auth/login` | GET | Redirection OAuth Spotify |
| `/auth/callback` | GET | Callback OAuth Spotify |
| `/auth/refresh` | POST | Renouvellement token |
| `/auth/logout` | POST | Déconnexion |
| `/api/spotify/playback-state` | GET | État de lecture actuel |
| `/api/spotify/play` | PUT | Démarrer la lecture |
| `/api/spotify/pause` | PUT | Mettre en pause |
| `/api/spotify/next` | POST | Chanson suivante |
| `/api/spotify/previous` | POST | Chanson précédente |
| `/api/spotify/seek` | PUT | Changer position |
| `/api/spotify/volume` | PUT | Changer volume |
| `/api/spotify/search` | GET | Rechercher musique |

#### 🔌 Socket.IO Events
| Événement | Direction | Description |
|-----------|-----------|-------------|
| `connection` | Bidirectionnel | Connexion utilisateur |
| `join_session` | Client → Serveur | Rejoindre session |
| `playback_control` | Client → Serveur | Contrôle lecture |
| `track_queued` | Client → Serveur | Ajouter à la queue |
| `chat_message` | Client → Serveur | Message chat |
| `playback_state_changed` | Serveur → Client | Nouvel état |
| `queue_updated` | Serveur → Client | Queue modifiée |
| `user_connected` | Serveur → Client | Utilisateur connecté |
| `chat_message` | Serveur → Client | Nouveau message |

## 🔐 Authentification et Sessions

### Flow OAuth Spotify
```
1. Client → /auth/login
2. Serveur → Spotify OAuth
3. Utilisateur → Autorise l'application
4. Spotify → /auth/callback + code
5. Serveur → Échange code contre tokens
6. Serveur → Stocke session + tokens
7. Client ← Redirection avec session
```

### Gestion des Sessions
- **Stockage** : Map en mémoire (sessionManager.js)
- **Identifiant unique** : UUID généré pour chaque session
- **Expiration** : Nettoyage automatique des sessions expirées
- **Multi-utilisateurs** : Chaque utilisateur = session distincte

## 📊 Flux de données

### Lecture de musique
```
1. Utilisateur clique Play/Pause
2. PlayerControls → API Endpoint
3. Serveur → Spotify API
4. Serveur → Broadcast Socket.IO
5. Tous les clients → Mise à jour UI
```

### Recherche et Queue
```
1. Utilisateur recherche
2. SearchComponent → /api/spotify/search
3. Utilisateur ajoute à la queue
4. Socket 'track_queued' → Serveur
5. Serveur → Broadcast 'queue_updated'
6. Tous les clients → Mise à jour queue
```

### Chat temps réel
```
1. Utilisateur tape message
2. ChatComponent → Socket 'chat_message'
3. Serveur → Broadcast à tous
4. Clients → Affichage nouveau message
```

## 🗃️ Structure des données

### Session utilisateur
```javascript
{
  id: "uuid-unique",
  spotifyId: "spotify-user-id",
  displayName: "Nom utilisateur",
  accessToken: "spotify-access-token",
  refreshToken: "spotify-refresh-token",
  expiresAt: timestamp,
  connectedAt: timestamp
}
```

### État de lecture
```javascript
{
  currentTrack: {
    id: "spotify-track-id",
    name: "Titre",
    artists: [{name: "Artiste"}],
    album: {name: "Album", images: [...]},
    duration_ms: 180000
  },
  isPlaying: true,
  position: 45000,
  device: {name: "Device", volume_percent: 50},
  controller: "Nom utilisateur"
}
```

### Message chat
```javascript
{
  id: "message-id",
  user: "Nom utilisateur",
  message: "Contenu du message",
  timestamp: Date.now(),
  avatar: "url-avatar"
}
```

## 🔧 Technologies et dépendances

### Frontend
- **React** 18+ : Framework UI
- **Material-UI** 5+ : Composants et thème
- **Socket.IO Client** : Temps réel
- **Axios** : Requêtes HTTP
- **React Router** : Navigation

### Backend
- **Node.js** 16+ : Runtime
- **Express** : Framework web
- **Socket.IO** : WebSocket temps réel
- **Axios** : Requêtes vers Spotify
- **UUID** : Génération d'identifiants

### APIs externes
- **Spotify Web API** : Contrôle musique
- **Spotify Web Playback SDK** : Player web (optionnel)

## 🚀 Déploiement

### Structure de production
```
/var/www/spotify-connect/
├── server/              # Application Node.js
│   ├── routes/         # Routes API
│   ├── socket/         # Gestion Socket.IO
│   ├── index.js        # Point d'entrée
│   └── .env           # Variables environnement
├── client/build/       # Build React statique
├── ecosystem.config.js # Configuration PM2
└── package.json       # Métadonnées
```

### Processus PM2
- **Mode** : Fork (single process)
- **Auto-restart** : Activé
- **Logs** : Centralisés
- **Monitoring** : CPU/Memory

## 📈 Performance et optimisations

### Frontend
- **Code splitting** : Chargement lazy des composants
- **Memoization** : React.memo pour éviter re-renders
- **Debouncing** : Recherche et contrôles
- **Compression** : Build optimisé

### Backend
- **Rate limiting** : Protection API Spotify
- **Connection pooling** : Gestion Socket.IO
- **Caching** : Résultats de recherche (optionnel)
- **Session cleanup** : Nettoyage automatique

### Réseau
- **HTTP/2** : Serveur web
- **Compression gzip** : Réponses API
- **WebSocket** : Temps réel optimisé
- **CDN** : Assets statiques (optionnel)

---

## 🔗 Liens utiles

- **Spotify Web API** : [Documentation officielle](https://developer.spotify.com/documentation/web-api/)
- **Socket.IO** : [Documentation](https://socket.io/docs/)
- **Material-UI** : [Composants](https://mui.com/components/)
- **React** : [Documentation](https://reactjs.org/docs/)

[← Retour au wiki](Home)