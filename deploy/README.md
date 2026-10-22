# Deploying Hessati web

This folder is the whole production site: a Node.js server (`server.js`), the built pages and the static files. Nothing else to install.

## Requirements

- **Node.js 20.9 or newer** on the server (`node -v`).
- **Its own subdomain**, e.g. `hessaty.taseese.org`. Not the API's domain: the site has its own `/api/...` routes (login, the backend proxy), which would clash with Laravel's `/api`.
- The web server (Nginx or Apache) forwards that subdomain to the Node process.

## 1. Upload and configure

```bash
unzip hessati-web-*.zip -d /var/www/      # gives /var/www/hessati-web
cd /var/www/hessati-web
nano .env                                  # set SITE_URL
```

`.env`:

| Key | Value |
| --- | --- |
| `SITE_URL` | the site's address, e.g. `https://hessaty.taseese.org` (required) |
| `API_BASE_URL` | `https://teacher.taseese.org/api` |
| `API_KEY` | the backend `x-api-key` (already filled in the package; keep this file private) |
| `PORT` / `HOSTNAME` | where Node listens; default `127.0.0.1:3100` |

## 2. Run it (PM2 keeps it up and restarts it on boot)

```bash
npm i -g pm2
pm2 start start.mjs --name hessati-web
pm2 save && pm2 startup                    # run the command it prints
```

Check: `curl -I http://127.0.0.1:3100` → `200`. Logs: `pm2 logs hessati-web`.

## 3. Point the subdomain at it

**Nginx** (`/etc/nginx/sites-available/hessaty.taseese.org`):

```nginx
server {
    server_name hessaty.taseese.org;
    client_max_body_size 25m;              # photos, PDFs, Excel uploads

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Then `ln -s` it into `sites-enabled`, `nginx -t && systemctl reload nginx`, and add HTTPS (`certbot --nginx -d hessaty.taseese.org`, or Cloudflare's proxy with SSL "Full").

**Apache** (with `mod_proxy` and `mod_proxy_http` enabled):

```apache
<VirtualHost *:80>
    ServerName hessaty.taseese.org
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3100/
    ProxyPassReverse / http://127.0.0.1:3100/
</VirtualHost>
```

**DNS**: an `A` record for the subdomain to the server's IP (the domain is on Cloudflare).

## Updating

Upload the new zip, unzip over the folder, keep your `.env`, then `pm2 restart hessati-web`.

Changing the domain later: edit `SITE_URL` and `pm2 restart hessati-web` (no rebuild).

## Backend checklist

- The payment gateway's web return URL: `https://<SITE_URL>/app/subscriptions/result?status=paid|failed`.
- The skills endpoints (`/teacher/skills/*`) are still missing on the API (404).
