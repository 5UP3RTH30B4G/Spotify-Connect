// Stockage en mémoire des utilisateurs connectés et de l'état de lecture
let connectedUsers = new Map();
let currentPlaybackState = {
  isPlaying: false,
  currentTrack: null,
  position: 0,
  queue: [],
  controller: null // Utilisateur qui contrôle actuellement
};

// Système de limitation des logs pour éviter le spam
let lastLogTimes = new Map(); // Stocke les derniers logs par clé unique

const shouldLog = (logKey, intervalMs = 10000) => {
  const now = Date.now();
  const lastTime = lastLogTimes.get(logKey);
  
  if (!lastTime || (now - lastTime) >= intervalMs) {
    lastLogTimes.set(logKey, now);
    return true;
  }
  return false;
};

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`👤 Utilisateur connecté: ${socket.id}`);

    // Événement de connexion d'un utilisateur authentifié
    socket.on('user_connected', (userData) => {
      // Vérifier si ce socket a déjà un utilisateur enregistré
      const existingUser = connectedUsers.get(socket.id);
      if (existingUser && existingUser.spotifyId === userData.spotifyId) {
        // Limiter les logs de double connexion (1 log par 10 secondes par utilisateur)
        const logKey = `double_connection_${userData.spotifyId}_${socket.id}`;
        if (shouldLog(logKey, 10000)) {
          console.log(`⚠️ Tentative de double connexion ignorée pour ${userData.name} sur ${socket.id}`);
        }
        return; // Ignorer les connexions multiples du même utilisateur sur le même socket
      }
      
      // Vérifier s'il y a déjà un utilisateur connecté avec le même Spotify ID sur d'autres sockets
      const existingUserSockets = [];
      for (const [socketId, user] of connectedUsers.entries()) {
        if (user.spotifyId === userData.spotifyId && socketId !== socket.id) {
          existingUserSockets.push(socketId);
        }
      }
      
      // D'abord enregistrer le nouvel utilisateur
      connectedUsers.set(socket.id, {
        id: socket.id,
        name: userData.name,
        spotifyId: userData.spotifyId,
        avatar: userData.avatar,
        connectedAt: new Date()
      });

      console.log(`✅ ${userData.name} connecté depuis ${socket.id}`);
      
      // Ensuite déconnecter les anciennes sessions du même utilisateur (mais pas le socket actuel)
      if (existingUserSockets.length > 0) {
        existingUserSockets.forEach(oldSocketId => {
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket && oldSocket.id !== socket.id) {
            console.log(`🔄 Déconnexion de l'ancienne session de ${userData.name}: ${oldSocketId}`);
            oldSocket.emit('force_disconnect', {
              reason: 'new_session',
              message: 'Une nouvelle session a été ouverte depuis un autre appareil'
            });
            // Délai avant déconnexion pour permettre l'affichage du message
            setTimeout(() => {
              oldSocket.disconnect(true);
            }, 1000);
          }
          connectedUsers.delete(oldSocketId);
        });
      }

      // Informer tous les clients de la nouvelle connexion
      io.emit('user_list_updated', Array.from(connectedUsers.values()));
      
      // Envoyer l'état actuel de la lecture au nouvel utilisateur
      socket.emit('playback_state_updated', currentPlaybackState);
      
      // Message de bienvenue uniquement s'il n'y avait pas d'anciennes sessions
      if (existingUserSockets.length === 0) {
        socket.broadcast.emit('user_joined', {
          user: userData.name,
          message: `${userData.name} a rejoint la session !`
        });
      }
    });

    // Événement de mise à jour de l'état de lecture
    socket.on('playback_state_changed', (newState) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Mettre à jour l'état global
      currentPlaybackState = {
        ...currentPlaybackState,
        ...newState,
        lastUpdatedBy: user.name,
        lastUpdatedAt: new Date()
      };

      // Diffuser la mise à jour à tous les clients
      socket.broadcast.emit('playback_state_updated', currentPlaybackState);
    });

    // Événement de contrôle de lecture (play/pause/next/previous)
    socket.on('playback_control', (action) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      console.log(`🎮 Action ${action.type} par ${user.name}`);

      // Diffuser l'action à tous les clients
      io.emit('playback_control_received', {
        action: action.type,
        user: user.name,
        timestamp: new Date()
      });

      // Mettre à jour le contrôleur actuel
      if (['play', 'pause', 'next', 'previous'].includes(action.type)) {
        currentPlaybackState.controller = user.name;
      }
    });

    // Événement d'ajout à la file d'attente
    socket.on('track_queued', (trackData) => {
      console.log(`🎵 Événement track_queued reçu de ${socket.id}:`, trackData);
      const user = connectedUsers.get(socket.id);
      console.log(`👤 Utilisateur trouvé pour ${socket.id}:`, user ? user.name : 'NON TROUVÉ');
      
      if (!user) {
        console.error(`❌ Utilisateur non trouvé pour socket ${socket.id}. Utilisateurs connectés:`, Array.from(connectedUsers.keys()));
        return;
      }

      console.log(`➕ ${user.name} a ajouté "${trackData.name}" à la file d'attente`);

      const queueItem = {
        ...trackData,
        addedBy: user.name,
        addedAt: new Date(),
        id: Date.now() + Math.random() // ID unique simple
      };

      // Ajouter à la file d'attente globale
      currentPlaybackState.queue.push(queueItem);

      // Informer tous les clients
      io.emit('queue_updated', {
        queue: currentPlaybackState.queue,
        addedTrack: queueItem,
        addedBy: user.name
      });

      // Message dans le chat
      io.emit('queue_message', {
        user: user.name,
        message: `a ajouté "${trackData.name}" à la file d'attente`,
        timestamp: new Date()
      });
    });

    // Événement de suppression de la file d'attente
    socket.on('track_removed_from_queue', (trackId) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const trackIndex = currentPlaybackState.queue.findIndex(track => track.id === trackId);
      if (trackIndex === -1) return;

      const removedTrack = currentPlaybackState.queue[trackIndex];
      currentPlaybackState.queue.splice(trackIndex, 1);

      console.log(`➖ ${user.name} a supprimé "${removedTrack.name}" de la file d'attente`);

      // Informer tous les clients
      io.emit('queue_updated', {
        queue: currentPlaybackState.queue,
        removedTrack: removedTrack,
        removedBy: user.name
      });
    });

    // Événement de recherche collaborative
    socket.on('search_shared', (searchData) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Partager les résultats de recherche avec tous les utilisateurs
      socket.broadcast.emit('search_results_shared', {
        results: searchData.results,
        query: searchData.query,
        sharedBy: user.name
      });
    });

    // Chat collaboratif
    socket.on('chat_message', (messageData) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const message = {
        id: Date.now(),
        user: user.name,
        avatar: user.avatar,
        message: messageData.message,
        timestamp: new Date()
      };

      console.log(`💬 ${user.name}: ${messageData.message}`);

      // Diffuser le message à tous les clients
      io.emit('chat_message_received', message);
    });

    // Événement de demande de synchronisation
    socket.on('request_sync', () => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Envoyer l'état complet à l'utilisateur qui le demande
      socket.emit('full_sync', {
        playbackState: currentPlaybackState,
        connectedUsers: Array.from(connectedUsers.values())
      });
    });

    // Déconnexion
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      
      if (user) {
        console.log(`👋 ${user.name} s'est déconnecté`);
        
        // Supprimer l'utilisateur de la liste
        connectedUsers.delete(socket.id);
        
        // Si c'était le contrôleur, le retirer
        if (currentPlaybackState.controller === user.name) {
          currentPlaybackState.controller = null;
        }
        
        // Informer les autres utilisateurs
        socket.broadcast.emit('user_left', {
          user: user.name,
          message: `${user.name} a quitté la session`
        });
        
        // Mettre à jour la liste des utilisateurs
        io.emit('user_list_updated', Array.from(connectedUsers.values()));
      } else {
        console.log(`👤 Utilisateur non identifié déconnecté: ${socket.id}`);
      }
    });

    // Gestion d'erreurs
    socket.on('error', (error) => {
      console.error(`❌ Erreur socket ${socket.id}:`, error);
    });
  });

  // Nettoyage périodique (optionnel)
  setInterval(() => {
    // Nettoyer les anciennes entrées de la file d'attente si nécessaire
    // currentPlaybackState.queue = currentPlaybackState.queue.slice(-50); // Garder seulement les 50 dernières
  }, 5 * 60 * 1000); // Toutes les 5 minutes
};

module.exports = socketHandler;