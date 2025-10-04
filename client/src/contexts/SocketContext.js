import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, socket }) => {
  const { user, authenticated } = useAuth();
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    currentTrack: null,
    position: 0,
    queue: [],
    controller: null
  });
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    console.log('🔌 SocketContext - Gestion de la connexion socket');
    console.log('📊 État actuel:', { socketConnected: socket?.connected, authenticated, user: user?.display_name });
    
    if (!socket) {
      console.log('❌ Pas de socket disponible');
      return;
    }

    // Si l'utilisateur vient de s'authentifier
    if (authenticated && user && socket.connected) {
      console.log('👤 Enregistrement utilisateur auprès du serveur:', user.display_name);
      socket.emit('user_connected', {
        name: user.display_name,
        spotifyId: user.id,
        avatar: user.images?.[0]?.url || null
      });
    }

    // Événements de connexion
    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('✅ Connecté au serveur');
      
      // Si l'utilisateur est authentifié, l'enregistrer
      if (authenticated && user) {
        console.log('👤 Auto-enregistrement après connexion:', user.display_name);
        socket.emit('user_connected', {
          name: user.display_name,
          spotifyId: user.id,
          avatar: user.images?.[0]?.url || null
        });
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('❌ Déconnecté du serveur');
    });

    socket.on('reconnect', () => {
      setConnectionStatus('connected');
      console.log('🔄 Reconnecté au serveur');
    });

    // Événements utilisateurs
    socket.on('user_list_updated', (users) => {
      setConnectedUsers(users);
    });

    socket.on('user_joined', (data) => {
      addSystemMessage(`${data.user} a rejoint la session !`, 'success');
    });

    socket.on('user_left', (data) => {
      addSystemMessage(`${data.user} a quitté la session`, 'info');
    });

    // Événements de lecture
    socket.on('playback_state_updated', (state) => {
      setPlaybackState(state);
    });

    socket.on('playback_control_received', (data) => {
      addSystemMessage(`${data.user} a ${getActionText(data.action)}`, 'info');
    });

    // Événements de file d'attente
    socket.on('queue_updated', (data) => {
      console.log('🔄 Queue mise à jour:', data);
      setPlaybackState(prev => ({ ...prev, queue: data.queue }));
    });

    socket.on('queue_message', (data) => {
      console.log('📋 Message queue:', data);
      addSystemMessage(`${data.user} ${data.message}`, 'info');
    });

    // Événements de chat
    socket.on('chat_message_received', (message) => {
      console.log('💬 Message reçu du serveur:', message);
      console.log('💬 Ajout au state messages. Ancien count:', messages.length);
      setMessages(prev => {
        const newMessages = [...prev, { ...message, type: 'user' }];
        console.log('💬 Nouveau count messages:', newMessages.length);
        return newMessages;
      });
    });

    // Événements de recherche partagée
    socket.on('search_results_shared', (data) => {
      addSystemMessage(`${data.sharedBy} a partagé une recherche: "${data.query}"`, 'info');
    });

    // Déconnexion forcée par le serveur
    socket.on('force_disconnect', (data) => {
      console.log('🚫 Déconnexion forcée:', data);
      addSystemMessage(data.message || 'Déconnecté par le serveur', 'warning');
      
      // Empêcher les reconnexions automatiques pendant un moment
      setConnectionStatus('force_disconnected');
      
      // Optionnel : rediriger vers la page de login après un délai
      setTimeout(() => {
        // Ne recharger que si toujours en état de déconnexion forcée
        if (connectionStatus === 'force_disconnected') {
          window.location.reload();
        }
      }, 5000);
    });

    // Synchronisation complète
    socket.on('full_sync', (data) => {
      setPlaybackState(data.playbackState);
      setConnectedUsers(data.connectedUsers);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect');
      socket.off('user_list_updated');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('playback_state_updated');
      socket.off('playback_control_received');
      socket.off('queue_updated');
      socket.off('queue_message');
      socket.off('chat_message_received');
      socket.off('search_results_shared');
      socket.off('force_disconnect');
      socket.off('full_sync');
    };
  }, [socket, authenticated, user]);

  // Effet séparé pour gérer les changements d'authentification
  useEffect(() => {
    console.log('🔐 Changement d\'état d\'authentification:', { authenticated, user: user?.display_name });
    
    // Ne pas se reconnecter si on vient d'être déconnecté de force
    if (connectionStatus === 'force_disconnected') {
      console.log('🚫 Éviter la reconnexion après déconnexion forcée');
      return;
    }
    
    if (authenticated && user && socket && socket.connected) {
      console.log('🔄 Re-enregistrement utilisateur après changement d\'auth');
      
      // Vérifier si l'utilisateur n'est pas déjà connecté pour éviter les doublons
      let isAlreadyConnected = false;
      if (connectedUsers && connectedUsers.length > 0) {
        isAlreadyConnected = connectedUsers.some(u => u.spotifyId === user.id);
      }
      
      if (!isAlreadyConnected) {
        // Délai pour éviter les connexions multiples rapides
        setTimeout(() => {
          if (socket.connected && connectionStatus !== 'force_disconnected') {
            socket.emit('user_connected', {
              name: user.display_name,
              spotifyId: user.id,
              avatar: user.images?.[0]?.url || null
            });
          }
        }, 500);
      } else {
        console.log('⚠️ Utilisateur déjà connecté, éviter la double connexion');
      }
    }
  }, [authenticated, user, socket, connectionStatus, connectedUsers]);

  const addSystemMessage = (message, type = 'info') => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      message,
      type: 'system',
      systemType: type,
      timestamp: new Date()
    }]);
  };

  const getActionText = (action) => {
    switch (action) {
      case 'play': return 'lancé la lecture';
      case 'pause': return 'mis en pause';
      case 'next': return 'passé à la chanson suivante';
      case 'previous': return 'reculé à la chanson précédente';
      default: return `effectué l'action: ${action}`;
    }
  };

  // Fonctions utilitaires pour émettre des événements
  const emitPlaybackControl = (action) => {
    if (socket && authenticated) {
      socket.emit('playback_control', { type: action });
    }
  };

  const emitPlaybackStateChange = (newState) => {
    if (socket && authenticated) {
      socket.emit('playback_state_changed', newState);
    }
  };

  const emitTrackQueued = (trackData) => {
    if (socket && authenticated) {
      socket.emit('track_queued', trackData);
    }
  };

  const emitTrackRemovedFromQueue = (trackId) => {
    if (socket && authenticated) {
      socket.emit('track_removed_from_queue', trackId);
    }
  };

  const emitChatMessage = (message) => {
    console.log('📤 Début emitChatMessage:', message);
    console.log('📤 État:', { socket: !!socket, authenticated, connected: socket?.connected });
    
    if (socket && authenticated) {
      console.log('📤 Émission message chat vers le serveur:', message);
      socket.emit('chat_message', { message });
      console.log('✅ Message émis avec succès');
    } else {
      console.log('❌ Impossible d\'émettre le message:', { 
        socket: !!socket, 
        authenticated,
        connected: socket?.connected 
      });
    }
  };

  const emitSearchShared = (searchData) => {
    if (socket && authenticated) {
      socket.emit('search_shared', searchData);
    }
  };

  const requestSync = () => {
    if (socket && authenticated) {
      socket.emit('request_sync');
    }
  };

  const value = {
    socket,
    connectedUsers,
    playbackState,
    messages,
    connectionStatus,
    emitPlaybackControl,
    emitPlaybackStateChange,
    emitTrackQueued,
    emitTrackRemovedFromQueue,
    emitChatMessage,
    emitSearchShared,
    requestSync,
    addSystemMessage
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};