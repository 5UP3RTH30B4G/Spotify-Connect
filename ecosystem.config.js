module.exports = {
  apps: [{
    name: 'spotify-connect-server',
    script: './server/index.js',
    cwd: process.cwd(),
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      CLIENT_URL: process.env.CLIENT_URL ,
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
      SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI,
      API_BASE_URL: process.env.API_BASE_URL
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