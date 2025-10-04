import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://scpearth.fr:5000';

  // Configuration axios avec credentials
  axios.defaults.withCredentials = true;

  useEffect(() => {
    console.log('🔄 Initialisation AuthProvider');
    
    // Vérifier les paramètres URL pour détecter un retour de callback
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const userParam = urlParams.get('user');
    
    if (authStatus === 'success') {
      console.log('✅ Retour de callback Spotify détecté pour:', userParam);
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Forcer une vérification immédiate
      setTimeout(() => {
        console.log('🔄 Vérification forcée après callback');
        checkAuthStatus();
      }, 500);
    } else if (authStatus === 'error') {
      console.error('❌ Erreur de callback Spotify détectée');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Vérification normale
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    console.log('🔍 Vérification du statut d\'authentification...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/status`);
      console.log('📡 Réponse du serveur:', response.data);
      
      if (response.data.authenticated) {
        console.log('✅ Utilisateur authentifié:', response.data.user?.display_name);
        setUser(response.data.user);
        setAuthenticated(true);
      } else {
        console.log('❌ Utilisateur non authentifié');
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut d\'authentification:', error);
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
      console.log('🔍 Vérification terminée');
    }
  };

  const login = () => {
    console.log('🔐 Début processus de connexion Spotify');
    const authUrl = `${API_BASE_URL}/auth/login`;
    console.log('🌐 Redirection vers:', authUrl);
    window.location.href = authUrl;
  };

  const logout = async () => {
    console.log('🚪 Début processus de déconnexion');
    
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`);
      console.log('✅ Déconnexion réussie côté serveur');
      setUser(null);
      setAuthenticated(false);
      console.log('🧹 État local nettoyé');
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
    }
  };

  const refreshToken = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/refresh`);
      return true;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token:', error);
      setUser(null);
      setAuthenticated(false);
      return false;
    }
  };

  const value = {
    user,
    authenticated,
    loading,
    login,
    logout,
    refreshToken,
    checkAuthStatus,
    API_BASE_URL
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};