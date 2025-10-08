// Stockage en mémoire des utilisateurs connectés et de l'état de lecture
let connectedUsers = new Map();
let currentPlaybackState = {
  isPlaying: false,
  currentTrack: null,
  position: 0,
  queue: [],
  fetcher: null, // Utilisateur/pair qui fetch les infos et contrôle
  ownerSpotifyId: null // Which spotifyId currently owns the 'currentTrack' (who initiated it)
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
  
  // Helper: broadcast masked playback to everyone and full playback only to the exact fetcher socketId
  const broadcastPlaybackState = () => {
    try {
      const masked = { ...currentPlaybackState, currentTrack: null, isPlaying: false, position: 0 };
      // masked to everyone
      io.emit('playback_state_updated', masked);

      // full only to the exact fetcher socket id (if present)
      if (currentPlaybackState.fetcher && currentPlaybackState.fetcher.socketId) {
        // If the current playback is owned by someone else, don't reveal it to the fetcher
        const owner = currentPlaybackState.ownerSpotifyId;
        const fetcherId = currentPlaybackState.fetcher.spotifyId;
        const fullForFetcher = { ...currentPlaybackState };
        if (owner && owner !== fetcherId) {
          // mask sensitive playback fields even for fetcher when they don't own it
          fullForFetcher.currentTrack = null;
          fullForFetcher.isPlaying = false;
          fullForFetcher.position = 0;
        }
        io.to(currentPlaybackState.fetcher.socketId).emit('playback_state_updated', fullForFetcher);
      }
    } catch (err) {
      console.warn('⚠️ Erreur lors du broadcast de l\'état de lecture:', err);
    }
  };
  
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

      // If no fetcher is set yet and this user is premium, make them the fetcher immediately
      if (!currentPlaybackState.fetcher && userData.premium) {
        currentPlaybackState.fetcher = {
          spotifyId: userData.spotifyId,
          name: userData.name,
          socketId: socket.id,
          sessionId: userData.sessionId || null
        };

        // Try to resolve sessionId from sessionManager if not provided
        if (!currentPlaybackState.fetcher.sessionId) {
          try {
            const sessionManager = require('../utils/sessionManager');
            const sessions = sessionManager.getActiveSessions();
            const match = sessions.find(s => s.user && (s.user.id === userData.id || s.user.id === userData.spotifyId || s.user.display_name === userData.name));
            if (match) {
              currentPlaybackState.fetcher.sessionId = match.sessionId;
              if (shouldLog('fetcher_auto_session')) console.log(`🔎 Auto-resolved fetcher session ${match.sessionId} for ${userData.name}`);
            }
          } catch (err) {
            console.warn('⚠️ Impossible de résoudre session pour fetcher auto:', err);
          }
        }

        console.log(`🔧 Auto-assign fetcher to ${userData.name} on connect`);
        io.emit('fetcher_changed', currentPlaybackState.fetcher);
      }

      // Envoyer l'état actuel au nouvel utilisateur, mais ne pas exposer la lecture en cours
      // si l'utilisateur connecté n'est pas le fetcher (il ne doit pas voir la musique des autres)
      let playbackForNewUser = { ...currentPlaybackState };
      const newUserIsFetcher = currentPlaybackState.fetcher && (currentPlaybackState.fetcher.spotifyId === userData.spotifyId || currentPlaybackState.fetcher.socketId === socket.id || currentPlaybackState.fetcher.name === userData.name);
      if (!newUserIsFetcher) {
        // hide current playback details for non-fetchers
        playbackForNewUser = { ...playbackForNewUser, currentTrack: null, isPlaying: false, position: 0 };
      }

      socket.emit('full_sync', {
        playbackState: playbackForNewUser,
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

        // If the disconnected user was the fetcher, try to promote another premium
        const fetcher = currentPlaybackState.fetcher;
        const disconnectedWasFetcher = fetcher && (fetcher.socketId === socket.id || fetcher.spotifyId === user.spotifyId || fetcher.name === user.name);
        if (disconnectedWasFetcher) {
          console.log(`⚠️ Le fetcher ${user.name} s'est déconnecté, tentative de promotion d'un autre premium`);
          // Find a candidate premium to promote
          const sessions = Array.from(connectedUsers.entries()); // [socketId, user]
          const candidateEntry = sessions.find(([sId, u]) => u.premium);
          if (candidateEntry) {
            const [candSocketId, candUser] = candidateEntry;
            // Assign new fetcher
            currentPlaybackState.fetcher = {
              spotifyId: candUser.spotifyId,
              name: candUser.name,
              socketId: candSocketId,
              sessionId: candUser.sessionId || null
            };
            // Try to resolve sessionId if missing
            if (!currentPlaybackState.fetcher.sessionId) {
              try {
                const sessionManager = require('../utils/sessionManager');
                const act = sessionManager.getActiveSessions();
                const match = act.find(s => s.user && (s.user.id === candUser.id || s.user.id === candUser.spotifyId || s.user.display_name === candUser.name));
                if (match) currentPlaybackState.fetcher.sessionId = match.sessionId;
              } catch (err) {
                console.warn('⚠️ Erreur résolution session pour fetcher promu:', err);
              }
            }
            console.log(`🔧 Nouveau fetcher promu: ${candUser.name}`);
            io.emit('fetcher_changed', currentPlaybackState.fetcher);
          } else {
            // No premium candidate: clear fetcher
            currentPlaybackState.fetcher = null;
            console.log('ℹ️ Aucun premium disponible pour être fetcher, fetcher cleared');
            io.emit('fetcher_changed', null);
          }

          // Broadcast playback state changes using helper (full only to exact fetcher socket)
          broadcastPlaybackState();
        }
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

    // Permet à un utilisateur premium de se déclarer comme "fetcher"
    socket.on('set_fetcher', () => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;
      if (!user.premium) {
        socket.emit('fetcher_denied', { reason: 'Premium required to be fetcher' });
        return;
      }

      // Store minimal fetcher info on the server state (sessionId will be looked up when used)
      currentPlaybackState.fetcher = {
        spotifyId: user.spotifyId,
        name: user.name,
        socketId: socket.id,
        sessionId: user.sessionId || null
      };

      // If the client didn't provide a sessionId, try to resolve it from the session manager
      if (!currentPlaybackState.fetcher.sessionId) {
        try {
          const sessionManager = require('../utils/sessionManager');
          const sessions = sessionManager.getActiveSessions();
          const match = sessions.find(s => s.user && (s.user.id === user.id || s.user.id === user.spotifyId || s.user.display_name === user.name));
          if (match) {
            currentPlaybackState.fetcher.sessionId = match.sessionId;
            if (shouldLog('fetcher_session_resolved')) console.log(`� Résolution session fetcher: ${match.sessionId} pour ${user.name}`);
          }
        } catch (err) {
          console.warn('⚠️ Impossible de résoudre session fetcher:', err);
        }
      }

      console.log(`�🔧 ${user.name} est maintenant le fetcher actif`);
      io.emit('fetcher_changed', currentPlaybackState.fetcher);
    });

    // Événement de contrôle de lecture (play/pause/next/previous) - relay possible via fetcher
    socket.on('playback_control', async (action) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      console.log(`🎮 Action ${action.type} par ${user.name}`);

      // Determine permission: user can control directly if premium, or if they are the current fetcher
      const isFetcher = currentPlaybackState.fetcher && currentPlaybackState.fetcher.spotifyId === user.spotifyId;
      const isPremium = !!user.premium;
      const canControlDirectly = isPremium || isFetcher;

  // If the user cannot control directly but there is a fetcher, we will forward the control to the fetcher socket
  const relayToFetcher = !canControlDirectly && currentPlaybackState.fetcher;

      if (!canControlDirectly && !relayToFetcher) {
        socket.emit('control_denied', { reason: 'Premium required or active fetcher needed' });
        return;
      }

      // If we are relaying to the fetcher, forward the action to the fetcher socket and let the fetcher client perform the API call
      if (relayToFetcher) {
        try {
          const fetcherSocketId = currentPlaybackState.fetcher.socketId;
          if (fetcherSocketId && io) {
            io.to(fetcherSocketId).emit('perform_playback_control', {
              action,
              requestedBy: user.name
            });
            // Inform the requester that the action was forwarded
            socket.emit('control_forwarded', { to: currentPlaybackState.fetcher.name });
          } else {
            socket.emit('control_error', { reason: 'No fetcher socket available' });
          }
        } catch (err) {
          console.error('❌ Erreur en forward control vers fetcher:', err);
          socket.emit('control_error', { reason: 'Forward failed' });
        }
        return;
      }

      // Decide which sessionId to use for the relay call (server routes expect session_id cookie)
      let sessionToUse = null;
      if (canControlDirectly) {
        sessionToUse = user.sessionId;
        // If the socket's user object doesn't have a sessionId, try to find it from sessionManager
        if (!sessionToUse) {
          try {
            const sessionManager = require('../utils/sessionManager');
            const sessions = sessionManager.getActiveSessions();
            const match = sessions.find(s => s.user && (s.user.id === user.id || s.user.id === user.spotifyId || s.user.display_name === user.name));
            if (match) sessionToUse = match.sessionId;
          } catch (err) {
            console.warn('⚠️ Erreur lors de la recherche de session pour utilisateur:', err);
          }
        }
      } else if (relayToFetcher) {
        // try to use fetcher.sessionId if present; otherwise lookup via sessionManager by spotifyId
        sessionToUse = currentPlaybackState.fetcher.sessionId;
        if (!sessionToUse) {
          const sessionManager = require('../utils/sessionManager');
          const sessions = sessionManager.getActiveSessions();
          const match = sessions.find(s => s.user && s.user.id === currentPlaybackState.fetcher.spotifyId);
          if (match) sessionToUse = match.sessionId;
        }
      }

      const endpointMap = {
        next: { method: 'POST', path: '/api/spotify/next' },
        previous: { method: 'POST', path: '/api/spotify/previous' },
        play: { method: 'PUT', path: '/api/spotify/play' },
        pause: { method: 'PUT', path: '/api/spotify/pause' }
      };

      const mapEntry = endpointMap[action.type];
      if (!mapEntry) {
        // Broadcast for unsupported actions, but don't call Spotify
        socket.broadcast.emit('playback_control_received', {
          user: user.name,
          action: action.type,
          timestamp: new Date()
        });
        return;
      }

      try {
        // If we couldn't resolve a session to use for the Spotify API call, fail fast
        if (!sessionToUse) {
          console.error('❌ Aucun session_id résolu pour exécuter la commande Spotify pour', user.name);
          socket.emit('control_error', { reason: 'Not authenticated: no session available' });
          return;
        }

        const API_BASE = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
        const res = await fetch(`${API_BASE.replace(/\/$/, '')}${mapEntry.path}`, {
          method: mapEntry.method,
          headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionToUse ? `session_id=${sessionToUse}` : ''
          },
          body: action.payload ? JSON.stringify(action.payload) : undefined
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error('❌ Erreur relay control:', txt);
          socket.emit('control_error', { reason: txt });
          return;
        }

        // If next was called and queue exists, remove first
        if (action.type === 'next' && currentPlaybackState.queue.length > 0) {
          const removedTrack = currentPlaybackState.queue.shift();
          io.emit('queue_updated', {
            queue: currentPlaybackState.queue,
            autoRemoved: true,
            removedTrack: removedTrack
          });
        }

        // Update server-side playbackState
        if (canControlDirectly) {
          currentPlaybackState.fetcher = { spotifyId: user.spotifyId, name: user.name, socketId: socket.id, sessionId: user.sessionId };
          // direct control gives ownership of playback to this user
          currentPlaybackState.ownerSpotifyId = user.spotifyId;
        }
        if (action.type === 'play') currentPlaybackState.isPlaying = true;
        if (action.type === 'pause') currentPlaybackState.isPlaying = false;

        // Broadcast playback state changes using helper (full only to exact fetcher socket)
        broadcastPlaybackState();
        socket.broadcast.emit('playback_control_received', {
          user: user.name,
          action: action.type,
          timestamp: new Date()
        });
      } catch (err) {
        console.error('❌ Erreur lors du relay vers Spotify:', err);
        socket.emit('control_error', { reason: 'Relay failed' });
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
    currentPlaybackState.fetcher = { spotifyId: user.spotifyId, name: user.name, socketId: socket.id, sessionId: user.sessionId };
    // owner is the user who requested the auto_play
    currentPlaybackState.ownerSpotifyId = user.spotifyId;

        // Émettre l'état mis à jour (broadcast masked/full appropriately)
        broadcastPlaybackState();

        // Jouer via Spotify API en utilisant la route locale
        try {
          // Resolve sessionId for this user if not present on the socket user object
          let sessionIdToUse = user.sessionId;
          if (!sessionIdToUse) {
            try {
              const sessionManager = require('../utils/sessionManager');
              const sessions = sessionManager.getActiveSessions();
              const match = sessions.find(s => s.user && (s.user.id === user.id || s.user.id === user.spotifyId || s.user.display_name === user.name));
              if (match) sessionIdToUse = match.sessionId;
            } catch (err) {
              console.warn('⚠️ Erreur lors de la résolution de session pour auto_play_track:', err);
            }
          }

          if (!sessionIdToUse) {
            console.error('❌ Aucun session_id résolu pour auto_play_track pour', user.name);
            socket.emit('control_error', { reason: 'Not authenticated: no session available for auto_play' });
            return;
          }

          const API_BASE = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;
          const response = await fetch(`${API_BASE.replace(/\/$/, '')}/api/spotify/play-track`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': `session_id=${sessionIdToUse}`
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
    // Only the exact fetcher socket may send full playback state updates. Others will be ignored or will only trigger a masked broadcast.
    socket.on('playback_state_changed', (newState) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const isExactFetcherSocket = currentPlaybackState.fetcher && currentPlaybackState.fetcher.socketId === socket.id;

      if (!isExactFetcherSocket) {
        // Non-fetchers are not allowed to push full playback state. If they attempt, emit a masked broadcast so clients stay consistent.
        if (shouldLog(`unauthorized_playback_state_${socket.id}`)) console.log(`⚠️ Ignored full playback_state_changed from non-fetcher ${user.name} (${socket.id})`);
        broadcastPlaybackState();
        return;
      }

      // Mettre à jour l'état global (fetcher is the authoritative source)
      if (newState.currentTrack !== undefined) {
        currentPlaybackState.currentTrack = newState.currentTrack;
      }
      if (newState.isPlaying !== undefined) {
        currentPlaybackState.isPlaying = newState.isPlaying;
      }
      if (newState.position !== undefined) {
        currentPlaybackState.position = newState.position;
      }
      if (newState.fetcher) {
        currentPlaybackState.fetcher = newState.fetcher;
      }

      // Broadcast updated playback (masked to others, full to fetcher)
      broadcastPlaybackState();
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
      // Determine whether the requester is the exact fetcher socket
      const requesterIsFetcher = currentPlaybackState.fetcher && currentPlaybackState.fetcher.socketId === socket.id;
      let playbackForRequester = { ...currentPlaybackState };
      if (!requesterIsFetcher) {
        // mask for non-fetchers
        playbackForRequester = { ...playbackForRequester, currentTrack: null, isPlaying: false, position: 0 };
      } else {
        // If requester is fetcher but does not own the current playback, mask as well
        const owner = currentPlaybackState.ownerSpotifyId;
        const fetcherId = currentPlaybackState.fetcher ? currentPlaybackState.fetcher.spotifyId : null;
        if (owner && fetcherId && owner !== fetcherId) {
          playbackForRequester = { ...playbackForRequester, currentTrack: null, isPlaying: false, position: 0 };
        }
      }
      socket.emit('full_sync', {
        playbackState: playbackForRequester,
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
