# MDR CMS — Deployment Guide
# Raspberry Pi 5 + Docker + Cloudflare Tunnel

---

## STEP 1 — Transfer files to your Pi

On your local machine, zip and copy the project:

```bash
# On your local machine
zip -r mdr-cms.zip mdr-cms/
scp mdr-cms.zip pi@<your-pi-ip>:~/
```

On the Pi:
```bash
cd ~
unzip mdr-cms.zip
cd mdr-cms
```

---

## STEP 2 — Create your .env file

```bash
cp .env.example .env
nano .env
```

Fill in every value:

```
POSTGRES_PASSWORD=choose_a_strong_password_here
DOMAIN=yourdomain.com
NEXTAUTH_SECRET=run_this_to_generate: openssl rand -base64 32
CLOUDFLARE_TUNNEL_TOKEN=get_this_from_cloudflare_step_4
```

Save with Ctrl+X, Y, Enter.

---

## STEP 3 — Set up Cloudflare Tunnel

1. Go to https://one.dash.cloudflare.com
2. Left sidebar → Networks → Tunnels
3. Click "Create a tunnel"
4. Name it: mdr-cms
5. Select "Docker" as the connector
6. Copy the token from the docker run command shown
   (it's the long string after --token)
7. Paste it into your .env as CLOUDFLARE_TUNNEL_TOKEN

Then configure the tunnel route:
1. In the tunnel dashboard, click "Public Hostname"
2. Add a public hostname:
   - Subdomain: app  (or leave blank for root)
   - Domain: yourdomain.com
   - Service: HTTP → localhost:80
   - (Cloudflare handles HTTPS automatically)

---

## STEP 4 — Build and start

```bash
# Build the Next.js image (takes ~5-10 min on Pi 5 first time)
docker compose build web

# Start everything
docker compose up -d

# Watch logs to confirm startup
docker compose logs -f
```

You should see:
- mdr_postgres: ready to accept connections
- mdr_redis: Ready to accept connections
- mdr_hocuspocus: running on port 1234
- mdr_web: started server on 0.0.0.0:3000
- mdr_nginx: started
- mdr_cloudflared: connected to Cloudflare

---

## STEP 5 — Verify it's running

```bash
# Check all containers are healthy
docker compose ps

# Should show: Up (healthy) for postgres and redis
# Up for everything else
```

Open your browser:
https://yourdomain.com

You should see the MDR CMS dashboard.

---

## STEP 6 — First login

Default admin credentials (CHANGE THESE IMMEDIATELY):
  Email:    admin@mdrcms.local
  Password: Admin1234!

After logging in, change the password in settings.

---

## USEFUL COMMANDS

```bash
# Stop everything
docker compose down

# Restart a single service
docker compose restart web

# View logs for one service
docker compose logs -f web
docker compose logs -f nginx
docker compose logs -f cloudflared

# Rebuild after code changes
docker compose build web && docker compose up -d web

# Connect to postgres directly
docker compose exec postgres psql -U mdrcms -d mdrcms

# Backup the database
docker compose exec postgres pg_dump -U mdrcms mdrcms > backup_$(date +%Y%m%d).sql

# Restore from backup
docker compose exec -T postgres psql -U mdrcms -d mdrcms < backup_20260420.sql
```

---

## UPDATING THE APP

When you make code changes:

```bash
# Pull latest code (if using git)
git pull

# Rebuild and restart only the web container
docker compose build web
docker compose up -d web

# Database changes need a manual migration
# (we'll add proper migrations later)
```

---

## TROUBLESHOOTING

**Cloudflared not connecting:**
- Double-check CLOUDFLARE_TUNNEL_TOKEN in .env
- Check logs: docker compose logs cloudflared
- Make sure the tunnel is active in Cloudflare dashboard

**Web app not loading:**
- Check: docker compose logs web
- Common cause: DATABASE_URL wrong — verify POSTGRES_PASSWORD matches

**Database errors on first start:**
- The init.sql only runs once on a fresh volume
- If you need to reset: docker compose down -v (WARNING: deletes all data)
  then docker compose up -d

**Pi running out of memory during build:**
- Add swap if needed:
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile

---

## ARCHITECTURE RUNNING ON YOUR PI

  ┌─────────────────────────────────────┐
  │         Raspberry Pi 5              │
  │                                     │
  │  cloudflared ──→ nginx ──→ web      │
  │                         (Next.js)   │
  │                    ├──→ postgres    │
  │                    ├──→ redis       │
  │                    └──→ hocuspocus  │
  └─────────────────────────────────────┘
           ↕ Cloudflare Tunnel
  ┌─────────────────────┐
  │   Cloudflare Edge   │
  │   (SSL + CDN)       │
  └─────────────────────┘
           ↕ HTTPS
      Your browser /
      Client browsers
