module.exports = {
  apps: [{
    name: 'spotify-connect-server',
    script: './server/index.js',
    cwd: process.cwd(),
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      CLIENT_URL: 'https://scpearth.fr:3000',
      SPOTIFY_CLIENT_ID: '887b364542194ea6b131edeaddadaa0d',
      SPOTIFY_CLIENT_SECRET: 'b4db5d38adaa49319201ea69baa0c9bf',
      SPOTIFY_REDIRECT_URI: 'https://scpearth.fr:5000/auth/callback',
      API_BASE_URL: 'https://scpearth.fr:5000'
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/server-error.log',
    out_file: './logs/server-out.log',
    log_file: './logs/server.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};