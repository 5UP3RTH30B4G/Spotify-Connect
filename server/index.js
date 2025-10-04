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

// Configuration SSL
const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/scpearth.fr/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/scpearth.fr/fullchain.pem')
};

// Créer serveur HTTPS
const server = https.createServer(sslOptions, app);

const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "https://scpearth.fr:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "https://scpearth.fr:3000",
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
  res.json({ status: 'Server is running with SSL!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur HTTPS démarré sur le port ${PORT}`);
  console.log(`🔒 Spotify Connect Remastered Backend avec SSL`);
});