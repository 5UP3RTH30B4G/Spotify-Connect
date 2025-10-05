const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const spotifyRoutes = require('./routes/spotify');
const socketHandler = require('./socket/socketHandler');

const app = express();

// Configuration SSL (only for production)
let server;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Use HTTPS in production
  const sslKeyPath = process.env.SSL_KEY_PATH;
  const sslCertPath = process.env.SSL_CERT_PATH;
  const sslOptions = {
    key: fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath)
  };
  server = https.createServer(sslOptions, app);
} else {
  // Use HTTP in development
  server = http.createServer(app);
}

const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || "http://127.0.0.1:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || "http://127.0.0.1:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
 
// Routes
app.use('/auth', authRoutes);
app.use('/api/spotify', spotifyRoutes);

// Socket.IO
socketHandler(io);

// Health check
app.get('/health', (req, res) => {
  const protocol = isProduction ? 'HTTPS' : 'HTTP';
  res.json({ status: `Server is running with ${protocol}!` });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  const protocol = isProduction ? 'HTTPS' : 'HTTP';
  console.log(`🚀 Serveur ${protocol} démarré sur le port ${PORT}`);
  console.log(`${isProduction ? '🔒' : '🔓'} Spotify Connect Remastered Backend ${isProduction ? 'avec SSL' : 'en mode développement'}`);
});