import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import PlayerControls from './PlayerControls';
import SearchComponent from './SearchComponent';
import QueueComponent from './QueueComponent';
import ConnectedUsers from './ConnectedUsers';
import ChatComponent from './ChatComponent';
import '../styles/theme.css';

const MainApp = () => {
  const navigate = useNavigate();
  const { user, authenticated, loading, logout, checkAuthStatus } = useAuth();
  const { connectionStatus, connectedUsers, playbackState } = useSocket();

  useEffect(() => {
    if (!loading && !authenticated) navigate('/login');
    if (authenticated && user) setTimeout(() => checkAuthStatus(), 1000);
  }, [authenticated, loading, navigate, user, checkAuthStatus]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Chargement de Spotify Connect...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <h1 className="app-title">🎵 Spotify Connect</h1>
          </div>
          
          <div className="header-info">
            <div className={`connection-status ${connectionStatus}`}>
              <span className="status-dot"></span>
              {connectionStatus === 'connected' ? 'Connecté' : 'Déconnecté'}
            </div>
            
            {user && (
              <div className="user-info">
                {user.images?.[0]?.url && (
                  <img src={user.images[0].url} alt="Avatar" className="user-avatar" />
                )}
                <span className="user-name">{user.display_name}</span>
              </div>
            )}
            
            <button className="logout-btn" onClick={handleLogout} title="Se déconnecter">
              🚪 Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="main-content">
          {/* Player Section */}
          <section className="player-section">
            <PlayerControls/>
          </section>

          {/* Content Grid */}
          <div className="content-grid">
            {/* Search */}
            <section className="search-section">
              <div className="section-header">
                <h2>🔍 Recherche Musicale</h2>
              </div>
              <div className="section-content">
                <SearchComponent />
              </div>
            </section>

            {/* Queue */}
            <section className="queue-section">
              <div className="section-header">
                <h2>📋 File d'attente</h2>
                <span className="queue-count">({playbackState?.queue?.length || 0})</span>
              </div>
              <div className="section-content">
                <QueueComponent />
              </div>
            </section>

            {/* Users */}
            <section className="users-section">
              <div className="section-header">
                <h2>👥 Utilisateurs connectés</h2>
                <span className="user-count">({connectedUsers.length})</span>
              </div>
              <div className="section-content">
                <ConnectedUsers />
              </div>
            </section>

            {/* Chat */}
            <section className="chat-section">
              <div className="section-header">
                <h2>💬 Chat en direct</h2>
              </div>
              <div className="section-content">
                <ChatComponent />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainApp;
