const fs = require('fs');
const https = require('https');

const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/scpearth.fr/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/scpearth.fr/fullchain.pem')
};

module.exports = { sslOptions, https };