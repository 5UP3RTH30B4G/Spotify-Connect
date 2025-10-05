// Stockage en mémoire des utilisateurs connectés et de l'état de lecture
let connectedUsers = new Map();
let currentPlaybackState = {
  isPlaying: false,
  currentTrack: null,
  position: 0,
  queue: [],
  controller: null // Utilisateur qui contrôle actuellement
};

// Instance IO pour les méthodes utilitaires
let ioInstance = null;

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
  ioInstance = io; // Stocker l'instance pour les méthodes utilitaires
  
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
      connectedUsers.set(socket.id, userData);
      console.log(`✅ ${userData.name} connecté depuis ${socket.id}`);
      
      // Puis supprimer les anciens sockets pour le même utilisateur
      existingUserSockets.forEach(oldSocketId => {
        connectedUsers.delete(oldSocketId);
        console.log(`🔄 Suppression de l'ancienne connexion ${oldSocketId} pour ${userData.name}`);
      });

      // Émettre la liste mise à jour des utilisateurs connectés
      const usersList = Array.from(connectedUsers.values());
      io.emit('user_list_updated', usersList);

      // Événement d'information de connexion pour les autres utilisateurs
      socket.broadcast.emit('user_joined', {
        user: userData.name,
        timestamp: new Date()
      });

      // Envoyer l'état actuel au nouvel utilisateur
      socket.emit('full_sync', {
        playbackState: currentPlaybackState,
        connectedUsers: usersList
      });
    });

    // Événement de déconnexion
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log(`👋 ${user.name} s'est déconnecté`);
        connectedUsers.delete(socket.id);

        // Émettre la liste mise à jour
        const usersList = Array.from(connectedUsers.values());
        io.emit('user_list_updated', usersList);

        // Événement d'information de déconnexion
        socket.broadcast.emit('user_left', {
          user: user.name,
          timestamp: new Date()
        });
      }
    });

    // Événement pour jouer automatiquement la prochaine chanson de la queue
    socket.on('play_next_from_queue', () => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      if (currentPlaybackState.queue.length > 0) {
        const nextTrack = currentPlaybackState.queue[0];
        console.log(`🎵 Lecture automatique de la prochaine chanson: ${nextTrack.name}`);
        
        // Informer tous les clients de jouer cette chanson
        io.emit('play_track_from_queue', {
          track: nextTrack,
          requestedBy: user.name
        });
      }
    });

    // Événement de contrôle de lecture (play/pause/next/previous)
    socket.on('playback_control', (action) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      console.log(`🎮 Action ${action.type} par ${user.name}`);

      // Logique spéciale pour les actions next/skip
      if (action.type === 'next' && currentPlaybackState.queue.length > 0) {
        // Supprimer la première chanson de la queue (celle qui vient d'être jouée/skippée)
        const removedTrack = currentPlaybackState.queue.shift();
        console.log(`📋 Suppression automatique de la queue: ${removedTrack?.name}`);
        
        // Émettre la mise à jour de la queue vers tous les clients
        io.emit('queue_updated', {
          queue: currentPlaybackState.queue,
          autoRemoved: true,
          removedTrack: removedTrack
        });
      }

      // Informer tous les autres clients de l'action de contrôle
      socket.broadcast.emit('playback_control_received', {
        user: user.name,
        action: action.type,
        timestamp: new Date()
      });

      // Mettre à jour le contrôleur pour certaines actions
      if (['play', 'pause', 'next', 'previous'].includes(action.type)) {
        currentPlaybackState.controller = user.name;
      }
    });

    // Événement d'auto-play quand file vide
    socket.on('auto_play_track', async (trackData) => {
      console.log(`🎵 Auto-play demandé de ${socket.id}:`, trackData);
      console.log(`📊 État serveur actuel - Queue: ${currentPlaybackState.queue.length}, Current: ${currentPlaybackState.currentTrack?.name || 'none'}`);
      const user = connectedUsers.get(socket.id);
      
      if (!user) {
        console.error(`❌ Utilisateur non trouvé pour auto-play`);
        return;
      }

      // Auto-play même si il y a 1 élément dans la queue (celui qu'on vient d'ajouter)
      // mais pas de musique en cours de lecture
      if (!currentPlaybackState.currentTrack || !currentPlaybackState.isPlaying) {
        console.log(`🚀 Lecture automatique de "${trackData.name}"`);
        
        // Mettre à jour l'état de lecture
        currentPlaybackState.currentTrack = trackData;
        currentPlaybackState.isPlaying = true;
        currentPlaybackState.position = 0;
        currentPlaybackState.controller = user.name;

        // Émettre l'état mis à jour
        io.emit('playback_state_updated', currentPlaybackState);

        // Jouer via Spotify API en utilisant la route locale
        try {
          const response = await fetch(`http://localhost:5000/api/spotify/play-track`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': `session_id=${user.sessionId}`
            },
            body: JSON.stringify({
              uri: trackData.uri
            })
          });

          if (response.ok) {
            console.log(`✅ Track joué avec succès: ${trackData.uri}`);
            
            // Supprimer le track de la queue après lecture réussie
            const trackIndex = currentPlaybackState.queue.findIndex(q => q.uri === trackData.uri);
            if (trackIndex !== -1) {
              const removedTrack = currentPlaybackState.queue.splice(trackIndex, 1)[0];
              console.log(`📋 Suppression automatique de la queue: ${removedTrack.name}`);
              
              // Informer tous les clients de la mise à jour de la queue
              io.emit('queue_updated', {
                queue: currentPlaybackState.queue,
                autoRemoved: true,
                removedTrack: removedTrack
              });
            }
          } else {
            const errorText = await response.text();
            console.error(`❌ Erreur lors de la lecture:`, errorText);
          }
        } catch (error) {
          console.error(`❌ Erreur de connexion Spotify:`, error);
        }
      } else {
        console.log(`⚠️ Auto-play ignoré - musique déjà en cours: "${currentPlaybackState.currentTrack?.name}"`);
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

      // Informer tous les clients de la mise à jour de la queue
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
      if (trackIndex !== -1) {
        const removedTrack = currentPlaybackState.queue.splice(trackIndex, 1)[0];
        console.log(`🗑️ ${user.name} a supprimé "${removedTrack.name}" de la file d'attente`);

        // Informer tous les clients de la mise à jour de la queue
        io.emit('queue_updated', {
          queue: currentPlaybackState.queue,
          removedTrack: removedTrack,
          removedBy: user.name
        });

        // Message dans le chat
        io.emit('queue_message', {
          user: user.name,
          message: `a supprimé "${removedTrack.name}" de la file d'attente`,
          timestamp: new Date()
        });
      }
    });

    // Événement de changement d'état de lecture
    socket.on('playback_state_changed', (newState) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Mettre à jour l'état global
      if (newState.currentTrack) {
        currentPlaybackState.currentTrack = newState.currentTrack;
      }
      if (newState.isPlaying !== undefined) {
        currentPlaybackState.isPlaying = newState.isPlaying;
      }
      if (newState.position !== undefined) {
        currentPlaybackState.position = newState.position;
      }
      if (newState.controller) {
        currentPlaybackState.controller = newState.controller;
      }

      // Informer tous les autres clients
      socket.broadcast.emit('playback_state_updated', currentPlaybackState);
    });

    // Événement de message de chat
    socket.on('chat_message', (data) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const message = {
        id: Date.now(),
        user: user.name,
        message: data.message,
        timestamp: new Date(),
        avatar: user.avatar
      };

      // Diffuser le message à tous les clients connectés
      io.emit('chat_message_received', message);
    });

    // Événement de partage de recherche
    socket.on('search_shared', (searchData) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // Diffuser les résultats de recherche à tous les autres clients
      socket.broadcast.emit('search_results_shared', {
        sharedBy: user.name,
        query: searchData.query,
        results: searchData.results,
        timestamp: new Date()
      });
    });

    // Événement de demande de synchronisation
    socket.on('request_sync', () => {
      const usersList = Array.from(connectedUsers.values());
      socket.emit('full_sync', {
        playbackState: currentPlaybackState,
        connectedUsers: usersList
      });
    });
  });

  // Nettoyage périodique (optionnel)
  setInterval(() => {
    // Nettoyer les anciennes entrées de la file d'attente si nécessaire
    // currentPlaybackState.queue = currentPlaybackState.queue.slice(-50); // Garder seulement les 50 dernières
  }, 5 * 60 * 1000); // Toutes les 5 minutes
};

// Méthodes utilitaires pour exposer la queue locale
socketHandler.setIO = (io) => {
  ioInstance = io;
};

socketHandler.getCurrentQueue = () => {
  return currentPlaybackState.queue;
};

socketHandler.removeFirstFromQueue = () => {
  if (currentPlaybackState.queue.length > 0) {
    const removedTrack = currentPlaybackState.queue.shift();
    console.log(`📋 Track supprimé de la queue locale: ${removedTrack.name}`);
    // Émettre la mise à jour de la queue après suppression
    if (ioInstance) {
      ioInstance.emit('queue_updated', {
        queue: currentPlaybackState.queue,
        autoRemoved: true,
        removedTrack: removedTrack
      });
    }
    return removedTrack;
  }
  return null;
};

socketHandler.getPlaybackState = () => {
  return currentPlaybackState;
};

module.exports = socketHandler;
