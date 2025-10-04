import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Slider,
  Card,
  CardMedia,
  Alert,
  Button,
  Chip
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  Refresh
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const PlayerControls = () => {
  const { API_BASE_URL, refreshToken } = useAuth();
  const { 
    playbackState, 
    emitPlaybackControl, 
    emitPlaybackStateChange,
    connectionStatus 
  } = useSocket();

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [error, setError] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);

  const fetchPlaybackState = useCallback(async () => {
    if (rateLimited) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/spotify/playback-state`);
      
      if (response.data.active !== false) {
        const track = response.data.item;
        const playing = response.data.is_playing;
        const pos = response.data.progress_ms || 0;
        const dur = track?.duration_ms || 0;
        const vol = response.data.device?.volume_percent || 50;

        setCurrentTrack(track);
        setIsPlaying(playing);
        setPosition(pos);
        setDuration(dur);
        setVolume(vol);

        emitPlaybackStateChange({
          currentTrack: track,
          isPlaying: playing,
          position: pos,
          device: response.data.device
        });

        setError(null);
        setRateLimited(false);
      } else {
        setError('Aucun appareil Spotify actif détecté. Ouvrez Spotify sur un appareil.');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'état:', error);
      
      if (error.response?.status === 429) {
        setRateLimited(true);
        setError('Trop de requêtes - pause de 30 secondes');
        setTimeout(() => {
          setRateLimited(false);
          setError(null);
        }, 30000);
      } else if (error.response?.status === 401) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          setError('Session expirée. Veuillez vous reconnecter.');
        }
      } else {
        setError('Erreur lors de la récupération de l\'état de lecture');
      }
    }
  }, [API_BASE_URL, refreshToken, emitPlaybackStateChange, rateLimited]);

  useEffect(() => {
    fetchPlaybackState();
    
    // Réduire la fréquence pour éviter le rate limiting Spotify
    const playbackInterval = setInterval(() => {
      if (!rateLimited) {
        fetchPlaybackState();
      }
    }, 15000); // Augmenté de 10s à 15s
    
    return () => {
      clearInterval(playbackInterval);
    };
  }, [fetchPlaybackState, rateLimited]);

  useEffect(() => {
    if (playbackState.currentTrack) {
      setCurrentTrack(playbackState.currentTrack);
      setIsPlaying(playbackState.isPlaying);
      setPosition(playbackState.position);
    }
  }, [playbackState]);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await axios.put(`${API_BASE_URL}/api/spotify/pause`);
        emitPlaybackControl('pause');
      } else {
        await axios.put(`${API_BASE_URL}/api/spotify/play`);
        emitPlaybackControl('play');
      }
      setIsPlaying(!isPlaying);
      setError(null);
    } catch (error) {
      console.error('Erreur play/pause:', error);
      setError(error.response?.data?.error || 'Erreur lors du contrôle de lecture');
    }
  };

  const handleNext = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/spotify/next`);
      emitPlaybackControl('next');
      setTimeout(fetchPlaybackState, 1000);
      setError(null);
    } catch (error) {
      console.error('Erreur next:', error);
      setError(error.response?.data?.error || 'Erreur lors du passage à la chanson suivante');
    }
  };

  const handlePrevious = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/spotify/previous`);
      emitPlaybackControl('previous');
      setTimeout(fetchPlaybackState, 1000);
      setError(null);
    } catch (error) {
      console.error('Erreur previous:', error);
      setError(error.response?.data?.error || 'Erreur lors du retour à la chanson précédente');
    }
  };

  const handlePositionChange = (event, newValue) => {
    setPosition(newValue);
  };

  const handlePositionChangeCommitted = async (event, newValue) => {
    try {
      await axios.put(`${API_BASE_URL}/api/spotify/seek`, {
        position_ms: newValue
      });
      setPosition(newValue);
      setError(null);
    } catch (error) {
      console.error('Erreur seek:', error);
      setError('Erreur lors du déplacement dans la chanson');
    }
  };

  const handleVolumeChange = (event, newValue) => {
    setVolume(newValue);
  };

  const handleVolumeChangeCommitted = async (event, newValue) => {
    try {
      await axios.put(`${API_BASE_URL}/api/spotify/volume`, {
        volume_percent: newValue
      });
      setVolume(newValue);
      setError(null);
    } catch (error) {
      console.error('Erreur volume:', error);
      setError('Erreur lors du changement de volume');
      // Restaurer la valeur précédente en cas d'erreur
      setTimeout(() => {
        fetchPlaybackState();
      }, 1000);
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card sx={{ 
      backgroundColor: 'rgba(30, 30, 30, 0.95)', 
      borderRadius: 2,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      p: { xs: 2, sm: 3 },
      width: '100%'
    }}>
      {error && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchPlaybackState}>
              <Refresh sx={{ mr: 1 }} />
              Réessayer
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Layout fixe en 3 colonnes sur desktop, empilé sur mobile */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'center', md: 'stretch' },
        justifyContent: { md: 'space-between' },
        gap: { xs: 2, md: 1 },
        width: '100%',
        minHeight: { md: '120px' } // Hauteur minimale fixe sur desktop
      }}>
        
        {/* Section gauche: Informations sur la chanson - largeur fixe */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          minWidth: { md: '300px' }, // Largeur fixe sur desktop
          width: { xs: '100%', md: '300px' },
          justifyContent: { xs: 'center', md: 'flex-start' },
          order: { xs: 1, md: 1 }
        }}>
          {currentTrack ? (
            <>
              <CardMedia
                component="img"
                sx={{ 
                  width: { xs: 72, sm: 80, md: 64 }, 
                  height: { xs: 72, sm: 80, md: 64 }, 
                  borderRadius: 1,
                  flexShrink: 0 
                }}
                image={currentTrack.album?.images?.[0]?.url || '/placeholder-album.jpg'}
                alt={currentTrack.name}
              />
              <Box sx={{ 
                ml: { xs: 2, md: 2 }, 
                minWidth: 0, 
                flex: 1,
                textAlign: { xs: 'left', md: 'left' },
                maxWidth: { md: '200px' } // Largeur maximale fixe pour éviter le débordement
              }}>
                <Box sx={{ 
                  overflow: 'hidden',
                  position: 'relative',
                  width: '100%',
                  '& .scrolling-text': {
                    animation: currentTrack.name.length > 25 ? 'scrollText 8s linear infinite' : 'none',
                    whiteSpace: 'nowrap',
                    display: 'inline-block'
                  },
                  '@keyframes scrollText': {
                    '0%': { transform: 'translateX(0)' },
                    '25%': { transform: 'translateX(0)' },
                    '50%': { transform: 'translateX(-50%)' },
                    '75%': { transform: 'translateX(-50%)' },
                    '100%': { transform: 'translateX(0)' }
                  }
                }}>
                  <Typography 
                    variant="subtitle1" 
                    className="scrolling-text"
                    sx={{ 
                      fontWeight: 'bold',
                      color: 'white',
                      fontSize: { xs: '1rem', sm: '1.1rem' },
                      whiteSpace: 'nowrap',
                      overflow: 'visible',
                      textOverflow: 'unset',
                      width: currentTrack.name.length > 25 ? 'max-content' : 'auto'
                    }}
                  >
                    {currentTrack.name}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" noWrap sx={{
                  fontSize: { xs: '0.875rem', sm: '0.875rem' }
                }}>
                  {currentTrack.artists?.map(artist => artist.name).join(', ')}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{
                  fontSize: { xs: '0.75rem', sm: '0.75rem' }
                }}>
                  {currentTrack.album?.name}
                </Typography>
                {playbackState.controller && (
                  <Chip 
                    label={`Contrôlé par ${playbackState.controller}`}
                    size="small"
                    color="primary"
                    sx={{ 
                      mt: 0.5, 
                      height: { xs: 18, sm: 20 },
                      fontSize: { xs: '0.65rem', sm: '0.75rem' }
                    }}
                  />
                )}
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
              <Box sx={{ 
                width: { xs: 72, sm: 80, md: 64 }, 
                height: { xs: 72, sm: 80, md: 64 }, 
                backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: { xs: '28px', sm: '32px', md: '24px' }
              }}>
                🎵
              </Box>
              <Box sx={{ ml: 2 }}>
                <Typography variant="subtitle1" color="text.secondary" sx={{
                  fontSize: { xs: '1rem', sm: '1.1rem' }
                }}>
                  Aucune chanson en cours
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{
                  fontSize: { xs: '0.875rem', sm: '0.875rem' }
                }}>
                  Lancez Spotify pour commencer
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Section centrale: Contrôles de lecture avec barre de progression - largeur flexible */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          width: { xs: '100%', md: 'auto' },
          flex: { md: 1 },
          maxWidth: { md: '500px' },
          minWidth: { md: '400px' },
          order: { xs: 2, md: 2 }
        }}>
          {/* Boutons de contrôle - plus grands sur mobile */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: { xs: 2, md: 2 },
            gap: { xs: 1, sm: 2 }
          }}>
            <IconButton 
              onClick={handlePrevious}
              disabled={!currentTrack || connectionStatus !== 'connected'}
              sx={{ 
                color: 'white',
                width: { xs: 48, sm: 52, md: 44 },
                height: { xs: 48, sm: 52, md: 44 },
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <SkipPrevious sx={{ fontSize: { xs: 32, sm: 36, md: 28 } }} />
            </IconButton>
            
            <IconButton 
              onClick={handlePlayPause}
              disabled={!currentTrack || connectionStatus !== 'connected'}
              sx={{ 
                backgroundColor: '#1DB954',
                color: 'white',
                mx: { xs: 1, sm: 2 },
                width: { xs: 64, sm: 72, md: 56 },
                height: { xs: 64, sm: 72, md: 56 },
                '&:hover': { 
                  backgroundColor: '#1ed760',
                  transform: 'scale(1.05)'
                },
                '&:disabled': { backgroundColor: 'grey.700' },
                transition: 'all 0.2s ease'
              }}
            >
              {isPlaying ? 
                <Pause sx={{ fontSize: { xs: 36, sm: 40, md: 32 } }} /> : 
                <PlayArrow sx={{ fontSize: { xs: 36, sm: 40, md: 32 } }} />
              }
            </IconButton>
            
            <IconButton 
              onClick={handleNext}
              disabled={!currentTrack || connectionStatus !== 'connected'}
              sx={{ 
                color: 'white',
                width: { xs: 48, sm: 52, md: 44 },
                height: { xs: 48, sm: 52, md: 44 },
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              }}
            >
              <SkipNext sx={{ fontSize: { xs: 32, sm: 36, md: 28 } }} />
            </IconButton>
          </Box>

          {/* Barre de progression - adaptative */}
          {currentTrack && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              width: '100%',
              maxWidth: { xs: '100%', sm: '100%', md: '500px' },
              minWidth: { xs: '280px', sm: '320px', md: '400px' } // Largeur minimum pour stabilité
            }}>
              <Typography variant="caption" sx={{ 
                minWidth: { xs: 40, sm: 45, md: 50 }, 
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                color: 'text.secondary',
                textAlign: 'right',
                mr: { xs: 1, sm: 1 }
              }}>
                {formatTime(position)}
              </Typography>
              
              <Slider
                value={position}
                max={duration}
                onChange={handlePositionChange}
                onChangeCommitted={handlePositionChangeCommitted}
                disabled={!currentTrack}
                sx={{
                  flex: 1,
                  mx: { xs: 1, sm: 1 },
                  height: { xs: 6, sm: 8, md: 6 },
                  color: '#1DB954',
                  '& .MuiSlider-thumb': {
                    width: { xs: 14, sm: 16, md: 12 },
                    height: { xs: 14, sm: 16, md: 12 },
                    '&:before': {
                      boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                    },
                    '&:hover, &.Mui-focusVisible, &.Mui-active': {
                      boxShadow: 'none',
                    },
                  },
                  '& .MuiSlider-track': {
                    height: { xs: 4, sm: 6, md: 4 },
                  },
                  '& .MuiSlider-rail': {
                    height: { xs: 4, sm: 6, md: 4 },
                    color: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
              />
              
              <Typography variant="caption" sx={{ 
                minWidth: { xs: 40, sm: 45, md: 50 }, 
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                color: 'text.secondary',
                ml: { xs: 1, sm: 1 }
              }}>
                {formatTime(duration)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Section droite: Volume et appareils - largeur fixe sur desktop */}
        <Box sx={{ 
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          minWidth: '200px', // Largeur fixe
          width: '200px',
          justifyContent: 'flex-end',
          order: { xs: 3, md: 3 }
        }}>
          {/* Contrôle de volume */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <VolumeUp sx={{ color: 'text.secondary', mr: 1 }} />
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              onChangeCommitted={handleVolumeChangeCommitted}
              sx={{
                width: 80,
                color: '#1DB954',
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                },
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Menu flottant pour mobile - Volume seulement */}
      <Box sx={{ 
        display: { xs: 'flex', md: 'none' },
        justifyContent: 'center',
        alignItems: 'center',
        mt: 2,
        pt: 2,
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Contrôle de volume mobile */}
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <VolumeUp sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
          <Slider
            value={volume}
            onChange={handleVolumeChange}
            onChangeCommitted={handleVolumeChangeCommitted}
            sx={{
              flex: 1,
              color: '#1DB954',
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
              },
              '& .MuiSlider-track': {
                height: 4,
              },
              '& .MuiSlider-rail': {
                height: 4,
                color: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          />
        </Box>
      </Box>
    </Card>
  );
};

export default PlayerControls;