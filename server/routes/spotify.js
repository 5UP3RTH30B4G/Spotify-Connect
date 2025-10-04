const express = require('express');
const axios = require('axios');
const sessionManager = require('../utils/sessionManager');
const router = express.Router();

// Middleware pour vérifier l'authentification
const requireAuth = (req, res, next) => {
  // D'abord essayer avec les cookies (ancienne méthode pour compatibilité)
  let access_token = req.cookies?.access_token;
  let sessionId = req.cookies?.session_id;
  
  // Si pas de token direct mais un sessionId, essayer de récupérer depuis les sessions
  if (!access_token && sessionId) {
    const session = sessionManager.getSession(sessionId);
    if (session && session.access_token) {
      access_token = session.access_token;
    }
  }
  
  if (!access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  req.access_token = access_token;
  req.session_id = sessionId;
  next();
};

// Obtenir l'état de lecture actuel
router.get('/playback-state', requireAuth, async (req, res) => {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player', {
      headers: { 'Authorization': 'Bearer ' + req.access_token }
    });
    
    if (response.status === 204) {
      return res.json({ active: false });
    }
    
    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 204) {
      return res.json({ active: false });
    }
    console.error('Erreur playback state:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'état de lecture' });
  }
});

// Lire/Pause
router.put('/play', requireAuth, async (req, res) => {
  try {
    await axios.put('https://api.spotify.com/v1/me/player/play', 
      req.body, 
      {
        headers: { 'Authorization': 'Bearer ' + req.access_token }
      }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur play:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Erreur lors de la lecture' });
  }
});

router.put('/pause', requireAuth, async (req, res) => {
  try {
    await axios.put('https://api.spotify.com/v1/me/player/pause', {}, {
      headers: { 'Authorization': 'Bearer ' + req.access_token }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur pause:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Erreur lors de la pause' });
  }
});

// Chanson suivante/précédente
router.post('/next', requireAuth, async (req, res) => {
  try {
    await axios.post('https://api.spotify.com/v1/me/player/next', {}, {
      headers: { 'Authorization': 'Bearer ' + req.access_token }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur next:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Erreur lors du passage à la chanson suivante' });
  }
});

router.post('/previous', requireAuth, async (req, res) => {
  try {
    await axios.post('https://api.spotify.com/v1/me/player/previous', {}, {
      headers: { 'Authorization': 'Bearer ' + req.access_token }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur previous:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Erreur lors du passage à la chanson précédente' });
  }
});

// Rechercher des chansons
router.get('/search', requireAuth, async (req, res) => {
  const { q, type = 'track', limit = 20 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Paramètre de recherche manquant' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { 'Authorization': 'Bearer ' + req.access_token },
      params: { q, type, limit }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Erreur search:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

// Ajouter à la file d'attente
router.post('/queue', requireAuth, async (req, res) => {
  const { uri } = req.body;
  
  if (!uri) {
    return res.status(400).json({ error: 'URI de la chanson manquant' });
  }

  try {
    await axios.post('https://api.spotify.com/v1/me/player/queue', {}, {
      headers: { 'Authorization': 'Bearer ' + req.access_token },
      params: { uri }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur queue:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Erreur lors de l\'ajout à la file d\'attente' });
  }
});

// Obtenir les appareils disponibles
router.get('/devices', requireAuth, async (req, res) => {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/devices', {
      headers: { 'Authorization': 'Bearer ' + req.access_token }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Erreur devices:', error.response?.data || error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des appareils' });
  }
});

// Jouer un track spécifique depuis la queue serveur
router.post('/play-track', requireAuth, async (req, res) => {
  const { uri, device_id } = req.body;
  
  console.log('🎵 Tentative de lecture du track:', uri);
  
  if (!uri) {
    return res.status(400).json({ error: 'URI de la chanson manquant' });
  }

  try {
    const playData = {
      uris: [uri]
    };
    
    if (device_id) {
      playData.device_id = device_id;
    }

    await axios.put('https://api.spotify.com/v1/me/player/play', 
      playData,
      {
        headers: { 'Authorization': 'Bearer ' + req.access_token }
      }
    );
    
    console.log('✅ Track joué avec succès:', uri);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du track:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Erreur lors de la lecture du track' });
  }
});

// Changer d'appareil
router.put('/device', requireAuth, async (req, res) => {
  const { device_ids, play } = req.body;
  
  try {
    await axios.put('https://api.spotify.com/v1/me/player', 
      { device_ids, play },
      {
        headers: { 'Authorization': 'Bearer ' + req.access_token }
      }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur device transfer:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Erreur lors du changement d\'appareil' });
  }
});

// Contrôler le volume
router.put('/volume', requireAuth, async (req, res) => {
  const { volume_percent } = req.body;
  
  if (volume_percent === undefined || volume_percent < 0 || volume_percent > 100) {
    return res.status(400).json({ error: 'Volume doit être entre 0 et 100' });
  }
  
  try {
    await axios.put(`https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(volume_percent)}`, 
      {},
      {
        headers: { 'Authorization': 'Bearer ' + req.access_token }
      }
    );
    console.log('✅ Volume changé à:', volume_percent + '%');
    res.json({ success: true, volume_percent: volume_percent });
  } catch (error) {
    console.error('❌ Erreur lors du changement de volume:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Erreur lors du changement de volume' });
  }
});

// Changer la position de lecture (seek)
router.put('/seek', requireAuth, async (req, res) => {
  const { position_ms } = req.body;
  
  if (position_ms === undefined || position_ms < 0) {
    return res.status(400).json({ error: 'Position doit être un nombre positif' });
  }
  
  try {
    await axios.put(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(position_ms)}`, 
      {},
      {
        headers: { 'Authorization': 'Bearer ' + req.access_token }
      }
    );
    console.log('✅ Position changée à:', Math.round(position_ms) + 'ms');
    res.json({ success: true, position_ms: position_ms });
  } catch (error) {
    console.error('❌ Erreur lors du changement de position:', error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error?.message || 'Erreur lors du changement de position' });
  }
});

module.exports = router;