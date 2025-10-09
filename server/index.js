const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Vérification et configuration des variables d'environnement
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://127.0.0.1:3000';
const API_BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${PORT}`;

// Vérifications des variables Spotify critiques
if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
  console.error('❌ Variables Spotify manquantes dans .env:');
  console.error('   - SPOTIFY_CLIENT_ID');
  console.error('   - SPOTIFY_CLIENT_SECRET');
  console.error('   Veuillez les configurer avant de démarrer le serveur.');
  process.exit(1);
}

console.log('🔧 Configuration du serveur:');
console.log(`   NODE_ENV: ${NODE_ENV}`);
console.log(`   PORT: ${PORT}`);
console.log(`   CLIENT_URL: ${CLIENT_URL}`);
console.log(`   API_BASE_URL: ${API_BASE_URL}`);
console.log(`   SPOTIFY_REDIRECT_URI: ${process.env.SPOTIFY_REDIRECT_URI}`);

const authRoutes = require('./routes/auth');
const spotifyRoutes = require('./routes/spotify');
const socketHandler = require('./socket/socketHandler');

const app = express();

// Configuration SSL simplifiée comme dans l'ancienne version
let server;
const isProduction = NODE_ENV === 'production';

if (isProduction) {
  // Configuration directe des certificats SSL
  try {
    const sslOptions = {
      key: fs.readFileSync('/etc/letsencrypt/live/scpearth.fr/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/scpearth.fr/fullchain.pem')
    };
    server = https.createServer(sslOptions, app);
    console.log('🔒 HTTPS server configured with SSL certificates');
  } catch (error) {
    console.error('❌ Erreur lecture certificats SSL:', error.message);
    process.exit(1);
  }
} else {
  // Use HTTP in development
  server = http.createServer(app);
}

const io = socketIo(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
 
// Routes
app.use('/auth', authRoutes);
app.use('/api/spotify', spotifyRoutes);

// Socket.IO
socketHandler(io);
socketHandler.setIO(io);

// Health check
app.get('/health', (req, res) => {
  const protocol = isProduction ? 'HTTPS' : 'HTTP';
  res.json({ status: `Server is running with ${protocol}!` });
});

server.listen(PORT, () => {
  const protocol = isProduction ? 'HTTPS' : 'HTTP';
  console.log(`🚀 Serveur ${protocol} démarré sur le port ${PORT}`);
  console.log(`${isProduction ? '🔒' : '🔓'} Sound Party Backend ${isProduction ? 'avec SSL' : 'en mode développement'}`);
});