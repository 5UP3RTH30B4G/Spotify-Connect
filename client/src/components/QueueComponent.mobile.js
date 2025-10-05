import React from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Typography,
  Box,
  Chip
} from '@mui/material';
import { Remove, MusicNote, PlayArrow } from '@mui/icons-material';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL;

const QueueComponent = () => {
  const { playbackState, emitTrackRemovedFromQueue } = useSocket();
  const { queue } = playbackState;

  const handleRemoveFromQueue = (trackId) => {
    console.log('🗑️ Suppression de la queue:', trackId);
    emitTrackRemovedFromQueue(trackId);
  };

  const handlePlayTrack = async (track) => {
    console.log('▶️ Tentative de lecture du track:', track.name);
    
    try {
      await axios.post(`${API_BASE_URL}/api/spotify/play-track`, {
        uri: track.uri
      });
      console.log('✅ Track joué avec succès:', track.name);
    } catch (error) {
      console.error('❌ Erreur lors de la lecture du track:', error);
      alert('Erreur: ' + (error.response?.data?.error || 'Impossible de jouer cette chanson'));
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatAddedTime = (timestamp) => {
    const now = new Date();
    const added = new Date(timestamp);
    const diffMinutes = Math.floor((now - added) / 60000);
    
    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return added.toLocaleDateString();
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {queue && queue.length > 0 ? (
        <>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              fontSize: { xs: '0.875rem', sm: '0.875rem' },
              fontWeight: 'medium'
            }}
          >
            {queue.length} chanson{queue.length > 1 ? 's' : ''} en attente
          </Typography>
          
          <List sx={{ 
            flex: 1, 
            overflow: 'auto',
            py: 0,
            // Scrollbar mobile optimisée
            '&::-webkit-scrollbar': {
              width: { xs: 4, sm: 6 },
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(29, 185, 84, 0.3)',
              borderRadius: 3,
              '&:hover': {
                backgroundColor: 'rgba(29, 185, 84, 0.5)',
              },
            },
          }}>
            {queue.map((track, index) => (
              <ListItem
                key={track.id}
                className="queue-item"
                sx={{
                  borderRadius: 1,
                  mb: { xs: 1, sm: 1 },
                  px: { xs: 1, sm: 2 },
                  py: { xs: 1.5, sm: 1.5 },
                  backgroundColor: 'rgba(29, 185, 84, 0.1)',
                  border: '1px solid rgba(29, 185, 84, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(29, 185, 84, 0.2)',
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s ease'
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                    backgroundColor: 'rgba(29, 185, 84, 0.25)',
                  },
                  cursor: 'pointer'
                }}
                secondaryAction={
                  <Box sx={{ 
                    display: 'flex', 
                    gap: { xs: 0.5, sm: 0.5 },
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center'
                  }}>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayTrack(track);
                      }}
                      title="Jouer maintenant"
                      sx={{ 
                        color: 'success.main',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        width: { xs: 40, sm: 44 },
                        height: { xs: 40, sm: 44 },
                        '&:hover': {
                          backgroundColor: 'rgba(76, 175, 80, 0.2)',
                          transform: 'scale(1.1)',
                        },
                        '&:active': {
                          transform: 'scale(0.95)',
                        },
                        transition: 'all 0.2s ease'
                      }}
                      size="small"
                    >
                      <PlayArrow sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromQueue(track.id);
                      }}
                      title="Supprimer de la file d'attente"
                      sx={{ 
                        color: 'error.main',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        width: { xs: 40, sm: 44 },
                        height: { xs: 40, sm: 44 },
                        '&:hover': {
                          backgroundColor: 'rgba(244, 67, 54, 0.2)',
                          transform: 'scale(1.1)',
                        },
                        '&:active': {
                          transform: 'scale(0.95)',
                        },
                        transition: 'all 0.2s ease'
                      }}
                      size="small"
                    >
                      <Remove sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemAvatar>
                  <Avatar
                    src={track.image}
                    variant="rounded"
                    sx={{ 
                      width: { xs: 48, sm: 56 }, 
                      height: { xs: 48, sm: 56 },
                      borderRadius: 1,
                      border: '1px solid rgba(29, 185, 84, 0.3)'
                    }}
                  >
                    <MusicNote sx={{ fontSize: { xs: 20, sm: 24 } }} />
                  </Avatar>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Box className="scrolling-text-container" sx={{ 
                      maxWidth: { xs: 'calc(100% - 180px)', sm: 'calc(100% - 200px)' }
                    }}>
                      <Typography 
                        variant="body2" 
                        className={`scrolling-text ${track.name.length > 12 ? 'scrolling-text-active' : 'scrolling-text-inactive'}`}
                        sx={{ 
                          color: 'white',
                          fontWeight: 'medium',
                          fontSize: { xs: '0.8rem', sm: '0.85rem' },
                          animationName: track.name.length > 12 ? 'scrollTextQueueComplete' : 'none'
                        }}
                      >
                        {track.name}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box sx={{ 
                      maxWidth: { xs: 'calc(100% - 180px)', sm: 'calc(100% - 200px)' },
                      overflow: 'hidden'
                    }}>
                      <Typography 
                        variant="caption" 
                        color="text.secondary" 
                        noWrap
                        sx={{ 
                          display: 'block',
                          fontSize: { xs: '0.75rem', sm: '0.8rem' },
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {track.artist}
                      </Typography>
                      
                      {/* Badges et infos sur mobile */}
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: { xs: 0.5, sm: 1 }, 
                        mt: 0.5,
                        flexWrap: 'wrap'
                      }}>
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          color="primary"
                          sx={{ 
                            height: { xs: 16, sm: 18 }, 
                            fontSize: { xs: '0.6rem', sm: '0.7rem' }, 
                            minWidth: { xs: 20, sm: 24 },
                            backgroundColor: 'rgba(29, 185, 84, 0.2)',
                            color: 'rgba(29, 185, 84, 1)',
                            border: '1px solid rgba(29, 185, 84, 0.4)'
                          }}
                        />
                        {track.duration_ms && (
                          <Chip
                            label={formatDuration(track.duration_ms)}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              height: { xs: 16, sm: 18 }, 
                              fontSize: { xs: '0.6rem', sm: '0.7rem' },
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              borderColor: 'rgba(255, 255, 255, 0.2)'
                            }}
                          />
                        )}
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: { xs: '0.65rem', sm: '0.75rem' },
                            display: { xs: 'none', sm: 'inline' } // Masquer sur mobile pour économiser l'espace
                          }}
                        >
                          par {track.addedBy}
                        </Typography>
                      </Box>
                      
                      {/* Timestamp en bas */}
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          display: 'block',
                          mt: 0.5,
                          fontSize: { xs: '0.65rem', sm: '0.7rem' }
                        }}
                      >
                        {formatAddedTime(track.addedAt)}
                        {/* Afficher "par" sur mobile seulement ici */}
                        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                          {' • par '}{track.addedBy}
                        </Box>
                      </Typography>
                    </Box>
                  }
                  sx={{ 
                    ml: { xs: 1, sm: 2 },
                    mr: { xs: 0.5, sm: 1 },
                    minWidth: 0,
                    flex: 1,
                    overflow: 'hidden'
                  }}
                />
              </ListItem>
            ))}
          </List>
        </>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          px: { xs: 2, sm: 3 }
        }}>
          <MusicNote sx={{ 
            fontSize: { xs: 40, sm: 48 }, 
            color: 'text.secondary', 
            mb: 2 
          }} />
          <Typography 
            variant="h6" 
            color="text.secondary" 
            sx={{ 
              mb: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' }
            }}
          >
            File d'attente vide
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '0.875rem' }
            }}
          >
            Recherchez et ajoutez des chansons pour commencer !
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default QueueComponent;