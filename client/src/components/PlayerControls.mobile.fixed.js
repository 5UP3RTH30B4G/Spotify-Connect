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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  Devices,
  Refresh,
  VolumeDown
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [isSliding, setIsSliding] = useState(false);

  const fetchPlaybackState = useCallback(async () => {
    if (rateLimited) return;

    try {
      const response = await axios.get(`${API_BASE_URL}/api/spotify/player`, {
        withCredentials: true
      });

      if (response.data.error === 'NO_ACTIVE_DEVICE') {
        setError('Aucun appareil Spotify actif détecté');
        setCurrentTrack(null);
        setIsPlaying(false);
        return;
      }

      if (response.data.item) {
        setCurrentTrack(response.data.item);
        setIsPlaying(response.data.is_playing);
        setPosition(response.data.progress_ms);
        setDuration(response.data.item.duration_ms);
        setError(null);
      }

      if (response.data.device?.volume_percent !== undefined) {
        setVolume(response.data.device.volume_percent);
      }

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'état de lecture:', error);
      
      if (error.response?.status === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 30000);
        setError('Limite de taux atteinte. Attendez 30 secondes.');
      } else if (error.response?.status === 401) {
        refreshToken();
      } else {
        setError('Erreur de connexion à Spotify');
      }
    }
  }, [API_BASE_URL, refreshToken, rateLimited]);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/spotify/devices`, {
        withCredentials: true
      });
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des appareils:', error);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchPlaybackState();
    fetchDevices();
    
    const interval = setInterval(() => {
      if (!isSliding) {
        fetchPlaybackState();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchPlaybackState, fetchDevices, isSliding]);

  useEffect(() => {
    if (playbackState) {
      setCurrentTrack(playbackState.track);
      setIsPlaying(playbackState.isPlaying);
      if (!isSliding) {
        setPosition(playbackState.position);
      }
      setDuration(playbackState.duration);
    }
  }, [playbackState, isSliding]);

  const handlePlayPause = useCallback(async () => {
    try {
      const action = isPlaying ? 'pause' : 'play';
      await axios.put(`${API_BASE_URL}/api/spotify/player/${action}`, {}, {
        withCredentials: true
      });
      
      emitPlaybackControl(action);
      setIsPlaying(!isPlaying);
      setError(null);
    } catch (error) {
      console.error(`Erreur lors de ${isPlaying ? 'pause' : 'lecture'}:`, error);
      setError(`Impossible de ${isPlaying ? 'mettre en pause' : 'lire'}`);
    }
  }, [API_BASE_URL, isPlaying, emitPlaybackControl]);

  const handleNext = useCallback(async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/spotify/player/next`, {}, {
        withCredentials: true
      });
      emitPlaybackControl('next');
      setTimeout(fetchPlaybackState, 500);
    } catch (error) {
      console.error('Erreur lors du passage à la piste suivante:', error);
      setError('Impossible de passer à la piste suivante');
    }
  }, [API_BASE_URL, emitPlaybackControl, fetchPlaybackState]);

  const handlePrevious = useCallback(async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/spotify/player/previous`, {}, {
        withCredentials: true
      });
      emitPlaybackControl('previous');
      setTimeout(fetchPlaybackState, 500);
    } catch (error) {
      console.error('Erreur lors du retour à la piste précédente:', error);
      setError('Impossible de revenir à la piste précédente');
    }
  }, [API_BASE_URL, emitPlaybackControl, fetchPlaybackState]);

  const handleSeek = useCallback(async (newPosition) => {
    try {
      await axios.put(`${API_BASE_URL}/api/spotify/player/seek`, {
        position_ms: newPosition
      }, {
        withCredentials: true
      });
      
      emitPlaybackStateChange({
        position: newPosition,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Erreur lors du seek:', error);
      setError('Impossible de changer la position');
    }
  }, [API_BASE_URL, emitPlaybackStateChange]);

  const handleVolumeChange = useCallback(async (newVolume) => {
    try {
      await axios.put(`${API_BASE_URL}/api/spotify/player/volume`, {
        volume_percent: newVolume
      }, {
        withCredentials: true
      });
      setVolume(newVolume);
    } catch (error) {
      console.error('Erreur lors du changement de volume:', error);
      setError('Impossible de changer le volume');
    }
  }, [API_BASE_URL]);

  const handleDeviceTransfer = useCallback(async (deviceId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/spotify/player`, {
        device_ids: [deviceId]
      }, {
        withCredentials: true
      });
      
      setDeviceMenuAnchor(null);
      setTimeout(fetchPlaybackState, 1000);
    } catch (error) {
      console.error('Erreur lors du transfert d\'appareil:', error);
      setError('Impossible de transférer la lecture');
    }
  }, [API_BASE_URL, fetchPlaybackState]);

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMobile) {
    return (
      <Box className="mobile-player-controls">
        <Card className="mobile-player-card">
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 1, borderRadius: 2 }}
              action={
                <Button 
                  color="inherit" 
                  size="small" 
                  onClick={fetchPlaybackState}
                  startIcon={<Refresh />}
                >
                  Réessayer
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {currentTrack && (
            <>
              {/* Informations de la piste */}
              <Box className="mobile-track-info">
                <CardMedia
                  component="img"
                  className="mobile-track-image"
                  image={currentTrack.album?.images?.[0]?.url}
                  alt={currentTrack.name}
                  onError={(e) => {
                    e.target.src = '/logo192.png';
                  }}
                />
                <Box className="mobile-track-details">
                  <Typography className="mobile-track-title">
                    {currentTrack.name}
                  </Typography>
                  <Typography className="mobile-track-artist">
                    {(currentTrack.artists && currentTrack.artists.map(artist => artist.name).join(', ')) || ''}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => setDeviceMenuAnchor(e.currentTarget)}
                  sx={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  <Devices />
                </IconButton>
              </Box>

              {/* Barre de progression */}
              <Box className="mobile-progress-slider">
                <Slider
                  value={position}
                  max={duration}
                  onChange={(_, value) => {
                    setPosition(value);
                    setIsSliding(true);
                  }}
                  onChangeCommitted={(_, value) => {
                    handleSeek(value);
                    setIsSliding(false);
                  }}
                  sx={{
                    color: '#1DB954',
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#1DB954',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#1DB954',
                    }
                  }}
                />
                <Box display="flex" justifyContent="space-between" mt={-0.5}>
                  <Typography variant="caption" color="rgba(255,255,255,0.6)">
                    {formatTime(position)}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.6)">
                    {formatTime(duration)}
                  </Typography>
                </Box>
              </Box>

              {/* Contrôles de lecture */}
              <Box className="mobile-playback-controls">
                <IconButton 
                  className="mobile-control-button"
                  onClick={handlePrevious}
                  disabled={rateLimited}
                >
                  <SkipPrevious />
                </IconButton>

                <IconButton
                  className="mobile-play-button"
                  onClick={handlePlayPause}
                  disabled={rateLimited}
                >
                  {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>

                <IconButton 
                  className="mobile-control-button"
                  onClick={handleNext}
                  disabled={rateLimited}
                >
                  <SkipNext />
                </IconButton>
              </Box>

              {/* Contrôle de volume */}
              <Box className="mobile-volume-control">
                <VolumeDown sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }} />
                <Slider
                  className="mobile-volume-slider"
                  value={volume}
                  onChange={(_, value) => setVolume(value)}
                  onChangeCommitted={(_, value) => handleVolumeChange(value)}
                  sx={{
                    color: '#1DB954',
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#1DB954',
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#1DB954',
                    }
                  }}
                />
                <VolumeUp sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }} />
              </Box>
            </>
          )}

          {!currentTrack && !error && (
            <Box textAlign="center" py={3}>
              <Typography color="rgba(255,255,255,0.6)">
                Aucune piste en cours de lecture
              </Typography>
              <Button 
                startIcon={<Refresh />}
                onClick={fetchPlaybackState}
                sx={{ mt: 1, color: '#1DB954' }}
              >
                Actualiser
              </Button>
            </Box>
          )}
        </Card>

        {/* Menu des appareils */}
        <Menu
          anchorEl={deviceMenuAnchor}
          open={Boolean(deviceMenuAnchor)}
          onClose={() => setDeviceMenuAnchor(null)}
          PaperProps={{
            sx: {
              bgcolor: 'rgba(18,18,18,0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxWidth: 'calc(100% - 32px)'
            }
          }}
        >
          {devices.map((device) => (
            <MenuItem
              key={device.id}
              onClick={() => handleDeviceTransfer(device.id)}
              sx={{
                color: device.is_active ? '#1DB954' : 'rgba(255,255,255,0.8)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              <ListItemIcon>
                <Devices sx={{ color: device.is_active ? '#1DB954' : 'rgba(255,255,255,0.6)' }} />
              </ListItemIcon>
              <ListItemText 
                primary={device.name}
                secondary={device.type}
                secondaryTypographyProps={{
                  sx: { color: 'rgba(255,255,255,0.5)' }
                }}
              />
              {device.is_active && (
                <Chip 
                  label="Actif" 
                  size="small" 
                  sx={{ 
                    bgcolor: '#1DB954', 
                    color: 'white',
                    fontSize: '10px'
                  }} 
                />
              )}
            </MenuItem>
          ))}
          {devices.length === 0 && (
            <MenuItem disabled>
              <ListItemText primary="Aucun appareil disponible" />
            </MenuItem>
          )}
        </Menu>

        {/* Indicateur de statut de connexion */}
        <Chip
          className="mobile-connection-status"
          label={connectionStatus === 'connected' ? 'Connecté' : 'Déconnecté'}
          size="small"
          color={connectionStatus === 'connected' ? 'success' : 'error'}
          sx={{
            fontSize: '10px',
            height: '20px'
          }}
        />
      </Box>
    );
  }

  // Version desktop (code existant)
  return (
    <Card sx={{ 
      m: 2, 
      p: 3, 
      background: 'linear-gradient(135deg, #1e1e1e 0%, #121212 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 2
    }}>
      {/* Reste du code desktop existant... */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={fetchPlaybackState}
              startIcon={<Refresh />}
            >
              Réessayer
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {currentTrack ? (
        <Box>
          <Box display="flex" alignItems="center" mb={3}>
            <CardMedia
              component="img"
              sx={{ width: 80, height: 80, borderRadius: 2, mr: 2 }}
              image={currentTrack.album?.images?.[0]?.url}
              alt={currentTrack.name}
              onError={(e) => {
                e.target.src = '/logo192.png';
              }}
            />
            <Box flex={1}>
              <Typography variant="h6" color="white" noWrap>
                {currentTrack.name}
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.7)" noWrap>
                {(currentTrack.artists && currentTrack.artists.map(artist => artist.name).join(', ')) || ''}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.5)">
                {currentTrack.album?.name}
              </Typography>
            </Box>
            
            <Box display="flex" gap={1}>
              <IconButton
                onClick={(e) => setDeviceMenuAnchor(e.currentTarget)}
                sx={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <Devices />
              </IconButton>
              <IconButton
                onClick={fetchPlaybackState}
                sx={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <Refresh />
              </IconButton>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" mb={2}>
            <IconButton 
              onClick={handlePrevious}
              disabled={rateLimited}
              sx={{ color: 'white' }}
            >
              <SkipPrevious />
            </IconButton>
            
            <IconButton
              onClick={handlePlayPause}
              disabled={rateLimited}
              sx={{ 
                color: 'white',
                backgroundColor: '#1DB954',
                mx: 1,
                '&:hover': {
                  backgroundColor: '#1ed760'
                }
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            
            <IconButton 
              onClick={handleNext}
              disabled={rateLimited}
              sx={{ color: 'white' }}
            >
              <SkipNext />
            </IconButton>
          </Box>

          <Box mb={2}>
            <Slider
              value={position}
              max={duration}
              onChange={(_, value) => {
                setPosition(value);
                setIsSliding(true);
              }}
              onChangeCommitted={(_, value) => {
                handleSeek(value);
                setIsSliding(false);
              }}
              sx={{
                color: '#1DB954',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#1DB954',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#1DB954',
                }
              }}
            />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="rgba(255,255,255,0.6)">
                {formatTime(position)}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.6)">
                {formatTime(duration)}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center">
            <VolumeUp sx={{ color: 'rgba(255,255,255,0.6)', mr: 1 }} />
            <Slider
              value={volume}
              onChange={(_, value) => setVolume(value)}
              onChangeCommitted={(_, value) => handleVolumeChange(value)}
              sx={{
                maxWidth: 150,
                color: '#1DB954',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#1DB954',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#1DB954',
                }
              }}
            />
          </Box>
        </Box>
      ) : (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="rgba(255,255,255,0.6)" mb={2}>
            Aucune piste en cours de lecture
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<Refresh />}
            onClick={fetchPlaybackState}
            sx={{ 
              borderColor: '#1DB954',
              color: '#1DB954',
              '&:hover': {
                borderColor: '#1ed760',
                color: '#1ed760'
              }
            }}
          >
            Actualiser
          </Button>
        </Box>
      )}

      <Menu
        anchorEl={deviceMenuAnchor}
        open={Boolean(deviceMenuAnchor)}
        onClose={() => setDeviceMenuAnchor(null)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(18,18,18,0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      >
        {devices.map((device) => (
          <MenuItem
            key={device.id}
            onClick={() => handleDeviceTransfer(device.id)}
            sx={{
              color: device.is_active ? '#1DB954' : 'rgba(255,255,255,0.8)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <ListItemIcon>
              <Devices sx={{ color: device.is_active ? '#1DB954' : 'rgba(255,255,255,0.6)' }} />
            </ListItemIcon>
            <ListItemText 
              primary={device.name}
              secondary={device.type}
              secondaryTypographyProps={{
                sx: { color: 'rgba(255,255,255,0.5)' }
              }}
            />
            {device.is_active && (
              <Chip 
                label="Actif" 
                size="small" 
                sx={{ 
                  bgcolor: '#1DB954', 
                  color: 'white' 
                }} 
              />
            )}
          </MenuItem>
        ))}
        {devices.length === 0 && (
          <MenuItem disabled>
            <ListItemText primary="Aucun appareil disponible" />
          </MenuItem>
        )}
      </Menu>

      <Chip
        label={connectionStatus === 'connected' ? 'Connecté' : 'Déconnecté'}
        size="small"
        color={connectionStatus === 'connected' ? 'success' : 'error'}
        sx={{ position: 'absolute', top: 16, right: 16 }}
      />
    </Card>
  );
};

export default PlayerControls;