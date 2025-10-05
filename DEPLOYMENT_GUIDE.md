# DEPLOYMENT_GUIDE

This document summarizes the production deployment steps and nginx configuration used for the project.

## Overview
- Frontend: built React app served by nginx (port 3000)
- Backend: Node.js + Express + Socket.IO served on 127.0.0.1:5000 (HTTPS when using Let's Encrypt certs)
- Reverse proxy: nginx handles TLS termination and proxies `/api/`, `/auth/`, `/socket.io/` to the backend

## Key nginx configuration (example)

Save this file at `/etc/nginx/sites-available/spotify-frontend-ssl` and symlink to `sites-enabled`.

```
server {
    listen 3000 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        root /var/www/spotify-connect/client/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass https://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }

    location /auth/ {
        proxy_pass https://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_ssl_verify off;
    }

    location /socket.io/ {
        proxy_pass https://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_ssl_verify off;
    }

    access_log /var/log/nginx/spotify-client-access.log;
    error_log /var/log/nginx/spotify-client-error.log;
}
```

## Important notes
- Use `window.location.origin` for Socket.IO in production so the client connects to the same origin nginx serves.
- Keep `.env` files out of the repo. Use server-side environment variables and ensure `axios.defaults.withCredentials = true` in the client to send cookies.
- If you change TLS certs, restart nginx.

## Troubleshooting
- `nginx -t` to test configuration.
- Check `/var/log/nginx/spotify-client-error.log` and server logs under `/var/www/spotify-connect/logs` for Socket.IO connection messages.
- If Socket.IO shows disconnected clients while static assets load, verify the `/socket.io/` proxy block and that `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "Upgrade";` are present.

## Minimal deploy steps (quick)
1. Build client locally: `cd client && npm run build`
2. Upload `client/build` to `/var/www/spotify-connect/client/build`
3. Ensure correct permissions: `chown -R www-data:www-data /var/www/spotify-connect && chmod -R 755 /var/www/spotify-connect/client/build`
4. Ensure nginx config is present and `nginx -t` passes
5. Reload nginx: `systemctl reload nginx`
6. Restart backend (pm2 or systemd)

---

