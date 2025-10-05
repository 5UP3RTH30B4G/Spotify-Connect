import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const PlayerControls = () => {
  const { API_BASE_URL, refreshToken } = useAuth();
  const { playbackState, emitPlaybackControl, emitPlaybackStateChange } = useSocket();

  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(50);
  const [devices, setDevices] = useState([]);
  const [showDevices, setShowDevices] = useState(false);

  // Récupérer l'état de lecture
  const fetchPlaybackState = useCallback(async () => {
    if (!API_BASE_URL || !refreshToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/spotify/current-playback`, {
        headers: { 'Authorization': `Bearer ${refreshToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.item) {
          setCurrentTrack(data.item);
          setIsPlaying(data.is_playing);
          setPosition(data.progress_ms || 0);
          setDuration(data.item?.duration_ms || 0);
          setVolume(data.device?.volume_percent || 50);
        } else {
          // Aucune musique en cours
          setCurrentTrack(null);
          setIsPlaying(false);
          setPosition(0);
          setDuration(0);
        }
      } else {
        console.log('Aucune lecture en cours');
        setCurrentTrack(null);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'état de lecture:', error);
    }
  }, [API_BASE_URL, refreshToken]);

  // Récupérer les appareils disponibles
  const fetchDevices = useCallback(async () => {
    if (!API_BASE_URL || !refreshToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/spotify/devices`, {
        headers: { 'Authorization': `Bearer ${refreshToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des appareils:', error);
    }
  }, [API_BASE_URL, refreshToken]);

  useEffect(() => {
    fetchPlaybackState();
    fetchDevices();
    const interval = setInterval(fetchPlaybackState, 1000);
    return () => clearInterval(interval);
  }, [fetchPlaybackState, fetchDevices]);

  useEffect(() => {
    if (playbackState.currentTrack) {
      setCurrentTrack(playbackState.currentTrack);
      setIsPlaying(playbackState.isPlaying);
      setPosition(playbackState.position || 0);
    }
  }, [playbackState]);

  // Mettre à jour la position en temps réel quand la musique joue
  useEffect(() => {
    if (isPlaying && currentTrack) {
      const interval = setInterval(() => {
        setPosition(prev => Math.min(prev + 1000, duration));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentTrack, duration]);

  const handlePlayPause = async () => {
    try {
      const action = isPlaying ? 'pause' : 'play';
      await fetch(`${API_BASE_URL}/spotify/${action}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${refreshToken}` }
      });
      emitPlaybackControl(action);
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Erreur lors du contrôle de lecture:', error);
    }
  };

  const handleNext = async () => {
    try {
      await fetch(`${API_BASE_URL}/spotify/next`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${refreshToken}` }
      });
      emitPlaybackControl('next');
      setTimeout(fetchPlaybackState, 500);
    } catch (error) {
      console.error('Erreur lors du passage au titre suivant:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await fetch(`${API_BASE_URL}/spotify/previous`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${refreshToken}` }
      });
      emitPlaybackControl('previous');
      setTimeout(fetchPlaybackState, 500);
    } catch (error) {
      console.error('Erreur lors du retour au titre précédent:', error);
    }
  };

  const handleSeek = async (newPosition) => {
    try {
      await fetch(`${API_BASE_URL}/spotify/seek?position_ms=${newPosition}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${refreshToken}` }
      });
      setPosition(newPosition);
      emitPlaybackStateChange({ position: newPosition });
    } catch (error) {
      console.error('Erreur lors du changement de position:', error);
    }
  };

  const handleVolumeChange = async (newVolume) => {
    try {
      await fetch(`${API_BASE_URL}/spotify/volume?volume_percent=${newVolume}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${refreshToken}` }
      });
      setVolume(newVolume);
    } catch (error) {
      console.error('Erreur lors du changement de volume:', error);
    }
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="player-controls">
      {currentTrack ? (
        <>
          {/* Track Info */}
          <div className="track-info">
            <div className="track-artwork">
              {currentTrack.album?.images?.[0] && (
                <img 
                  src={currentTrack.album.images[0].url} 
                  alt={currentTrack.name}
                  className="artwork-image"
                />
              )}
            </div>
            <div className="track-details">
              <h3 className="track-title">{currentTrack.name}</h3>
              <p className="track-artist">
                {currentTrack.artists?.map(artist => artist.name).join(', ')}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="playback-controls">
            <button 
              className="control-btn previous-btn"
              onClick={handlePrevious}
              title="Titre précédent"
            >
              ⏮️
            </button>
            
            <button 
              className="control-btn play-pause-btn"
              onClick={handlePlayPause}
              title={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            
            <button 
              className="control-btn next-btn"
              onClick={handleNext}
              title="Titre suivant"
            >
              ⏭️
            </button>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <span className="time-display">{formatTime(position)}</span>
            <div className="progress-bar-container">
              <div 
                className="progress-bar"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const newPosition = (clickX / rect.width) * duration;
                  handleSeek(newPosition);
                }}
              >
                <div 
                  className="progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
            <span className="time-display">{formatTime(duration)}</span>
          </div>

          {/* Volume & Devices */}
          <div className="secondary-controls">
            <div className="volume-control">
              <span className="volume-icon">🔊</span>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="volume-slider"
              />
            </div>

            <div className="devices-control">
              <button 
                className="devices-btn"
                onClick={() => setShowDevices(!showDevices)}
                title="Appareils"
              >
                📱
              </button>
              {showDevices && (
                <div className="devices-menu">
                  {devices.map(device => (
                    <div 
                      key={device.id}
                      className={`device-item ${device.is_active ? 'active' : ''}`}
                    >
                      <span className="device-name">{device.name}</span>
                      <span className="device-type">{device.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="no-track">
          <div className="no-track-icon">🎵</div>
          <h3>Aucune musique en cours</h3>
          <p>Lancez la lecture depuis Spotify ou ajoutez une chanson à la file d'attente</p>
        </div>
      )}
    </div>
  );
};

export default PlayerControls;