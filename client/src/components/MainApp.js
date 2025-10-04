import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  AppBar, 
  Toolbar, 
  IconButton,
  Avatar,
  Chip,
  Box,
  CircularProgress
} from '@mui/material';
import { Logout, Refresh, WifiOff, Wifi } from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import PlayerControls from './PlayerControls';
import SearchComponent from './SearchComponent';
import QueueComponent from './QueueComponent';
import ConnectedUsers from './ConnectedUsers';
import ChatComponent from './ChatComponent';

const MainApp = () => {
  const navigate = useNavigate();
  const { user, authenticated, loading, logout, checkAuthStatus } = useAuth();
  const { connectionStatus, connectedUsers, requestSync, playbackState } = useSocket();

  useEffect(() => {
    console.log('🎵 MainApp - État auth:', { authenticated, loading, user: user?.display_name });
    
    if (!loading && !authenticated) {
      console.log('❌ Utilisateur non authentifié, redirection vers login');
      navigate('/login');
    } else if (authenticated && user) {
      console.log('✅ Utilisateur authentifié:', user.display_name);
      // Forcer une re-vérification pour s'assurer que tout est à jour
      setTimeout(() => {
        console.log('🔄 Re-vérification de l\'authentification');
        checkAuthStatus();
      }, 1000);
    }
  }, [authenticated, loading, navigate, user, checkAuthStatus]);

  const handleLogout = async () => {
    console.log('🚪 Déconnexion initiée');
    await logout();
    navigate('/login');
  };

  const handleRefresh = () => {
    console.log('🔄 Actualisation manuelle initiée');
    // Forcer la synchronisation avec le serveur
    requestSync();
    // Re-vérifier l'authentification
    checkAuthStatus();
  };

  if (loading) {
    console.log('⏳ Chargement en cours...');
    return (
      <Container maxWidth="lg" sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Chargement...
        </Typography>
      </Container>
    );
  }

  if (!authenticated) {
    console.log('❌ Non authentifié, affichage vide');
    return null;
  }

  console.log('✅ Rendu de l\'interface principale');

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#121212'
    }}>
      {/* Barre de navigation optimisée mobile */}
      <AppBar position="static" sx={{ backgroundColor: '#1e1e1e' }}>
        <Toolbar 
          sx={{ 
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 1, sm: 2 }
          }}
        >
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 'bold',
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            🎵 Spotify Connect
          </Typography>
          
          {/* Indicateur de connexion mobile */}
          <Chip
            icon={connectionStatus === 'connected' ? <Wifi /> : <WifiOff />}
            label={connectionStatus === 'connected' ? 'Connecté' : 'Déconnecté'}
            color={connectionStatus === 'connected' ? 'success' : 'error'}
            size="small"
            sx={{ 
              mr: { xs: 1, sm: 2 },
              height: { xs: 24, sm: 28 },
              fontSize: { xs: '0.7rem', sm: '0.75rem' },
              '& .MuiChip-icon': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
          />

          {/* Informations utilisateur responsive */}
          {user && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mr: { xs: 0.5, sm: 2 }
            }}>
              <Avatar 
                src={user.images?.[0]?.url} 
                alt={user.display_name}
                sx={{ 
                  width: { xs: 28, sm: 32 }, 
                  height: { xs: 28, sm: 32 }, 
                  mr: { xs: 0.5, sm: 1 }
                }}
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  mr: { xs: 0.5, sm: 1 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  display: { xs: 'none', sm: 'block' } // Masquer le nom sur très petit écran
                }}
              >
                {user.display_name}
              </Typography>
            </Box>
          )}

          {/* Boutons d'action plus grands sur mobile */}
          <IconButton
            color="inherit"
            onClick={handleRefresh}
            title="Actualiser l'état de lecture et synchroniser"
            disabled={connectionStatus !== 'connected'}
            sx={{
              width: { xs: 40, sm: 44 },
              height: { xs: 40, sm: 44 },
              mr: { xs: 0.5, sm: 1 },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'scale(1.1)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              transition: 'all 0.2s ease'
            }}
          >
            <Refresh sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
          
          <IconButton
            color="inherit"
            onClick={handleLogout}
            title="Se déconnecter"
            sx={{
              width: { xs: 40, sm: 44 },
              height: { xs: 40, sm: 44 },
              '&:hover': {
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                transform: 'scale(1.1)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              transition: 'all 0.2s ease'
            }}
          >
            <Logout sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Contenu principal avec CSS Grid */}
      <Box sx={{ 
        flex: 1,
        p: { xs: 1.5, sm: 2, md: 3 },
        display: 'grid',
        gap: { xs: 2, sm: 2.5, md: 3 },
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr',
          md: '1fr 1fr',
          lg: '1fr 1fr',
          xl: '2fr 3fr'
        },
        gridTemplateRows: {
          xs: 'auto auto auto auto auto',
          sm: 'auto auto auto auto auto',
          md: 'auto minmax(350px, 1fr) minmax(300px, 1fr)',
          lg: 'auto minmax(400px, 1fr) minmax(350px, 1fr)'
        },
        gridTemplateAreas: {
          xs: `
            "player"
            "search"
            "queue"
            "users"
            "chat"
          `,
          sm: `
            "player"
            "search"
            "queue"
            "users"
            "chat"
          `,
          md: `
            "player player"
            "search queue"
            "users chat"
          `,
          xl: `
            "player player"
            "search queue"
            "users chat"
          `
        },
        maxWidth: { xs: '100%', sm: '100%', md: '1200px', lg: '1400px' },
        mx: 'auto',
        width: '100%',
        minHeight: { xs: 'auto', md: 'calc(100vh - 80px)' }
      }}>
        
        {/* Lecteur principal */}
        <Paper 
          elevation={4} 
          sx={{ 
            gridArea: 'player',
            p: 3, 
            backgroundColor: '#1e1e1e', 
            borderRadius: 3,
            border: '1px solid #333',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <PlayerControls />
        </Paper>

        {/* Recherche */}
        <Paper 
          elevation={4} 
          sx={{ 
            gridArea: 'search',
            p: 3, 
            backgroundColor: '#1e1e1e', 
            borderRadius: 3,
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Typography variant="h6" sx={{ 
            mb: 2, 
            color: '#1DB954', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 'bold'
          }}>
            🔍 Recherche
          </Typography>
          <Box sx={{ 
            flex: 1, 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <SearchComponent />
          </Box>
        </Paper>

        {/* File d'attente */}
        <Paper 
          elevation={4} 
          sx={{ 
            gridArea: 'queue',
            p: 3, 
            backgroundColor: '#1e1e1e', 
            borderRadius: 3,
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Typography variant="h6" sx={{ 
            mb: 2, 
            color: '#1DB954', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 'bold'
          }}>
            📋 File d'attente ({playbackState.queue?.length || 0})
          </Typography>
          <Box sx={{ 
            flex: 1, 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <QueueComponent />
          </Box>
        </Paper>

        {/* Utilisateurs connectés */}
        <Paper 
          elevation={4} 
          sx={{ 
            gridArea: 'users',
            p: 3, 
            backgroundColor: '#1e1e1e', 
            borderRadius: 3,
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Typography variant="h6" sx={{ 
            mb: 2, 
            color: '#1DB954', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 'bold'
          }}>
            👥 Utilisateurs ({connectedUsers.length})
          </Typography>
          <Box sx={{ 
            flex: 1, 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <ConnectedUsers />
          </Box>
        </Paper>

        {/* Chat */}
        <Paper 
          elevation={4} 
          sx={{ 
            gridArea: 'chat',
            p: 3, 
            backgroundColor: '#1e1e1e', 
            borderRadius: 3,
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Typography variant="h6" sx={{ 
            mb: 2, 
            color: '#1DB954', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 'bold'
          }}>
            💬 Chat
          </Typography>
          <Box sx={{ 
            flex: 1, 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <ChatComponent />
          </Box>
        </Paper>
        
      </Box>
    </Box>
  );
};

export default MainApp;