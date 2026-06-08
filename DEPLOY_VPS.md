# Deploying DeskFit backend to a VPS (Docker Compose)

Runs the NestJS API + PostgreSQL (and optional Caddy HTTPS proxy) on one Ubuntu
VPS. Portable: the same Dockerfile/compose can later move to AWS (ECS/EC2/RDS).

Prerequisites: an Ubuntu 22.04/24.04 VPS, SSH access, and (for HTTPS) a domain
whose DNS A record points at the VPS IP.

---

## 1. SSH into the VPS
```bash
ssh root@YOUR_SERVER_IP
```

## 2. Install Docker + Docker Compose plugin
```bash
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version
```
(`docker compose` v2 ships as a plugin with the script above — no separate install.)

## 3. Clone the repo
```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git deskfit
cd deskfit/desk-fit-backend
```

## 4. Create the production env file
```bash
cp .env.production.example .env.production
nano .env.production
```
Fill in real values. Important:
- `POSTGRES_PASSWORD` — a strong password.
- `DATABASE_URL` — host MUST be `postgres`, and user/password/db must match the
  `POSTGRES_*` values, e.g.
  `postgresql://deskfit_user:THEPASSWORD@postgres:5432/deskfit?schema=public`
- `JWT_SECRET` — generate one: `openssl rand -hex 32`
- `APPLE_BUNDLE_ID` / `APPLE_CLIENT_ID` — `com.deskfitapp`

`.env.production` is git-ignored — never commit it.

## 5. Build and start the stack
```bash
docker compose --env-file .env.production up -d --build
```
This starts `postgres` (private) and `api` (published on port 3000).

## 6. Apply database migrations (production-safe)
```bash
docker compose exec api npm run prisma:migrate:deploy
```
> Uses `prisma migrate deploy` only. Never run `migrate dev`, `db push`, or
> `migrate reset` against production.

## 7. Check logs
```bash
docker compose ps
docker compose logs -f api
docker compose logs -f postgres
```

## 8. Test the API
```bash
# On the VPS:
curl http://localhost:3000/health
# From your machine (if port 3000 is open in the firewall):
curl http://YOUR_SERVER_IP:3000/health
```
Expected: `{"status":"ok","app":"DeskFit","timestamp":"..."}`

---

## Optional: HTTPS with Caddy
1. Point `api.your-domain.com` DNS A record at the VPS IP.
2. Edit `Caddyfile` and replace `api.your-domain.com` with your domain.
3. Start with the proxy profile (Caddy auto-provisions a Let's Encrypt cert):
```bash
docker compose --env-file .env.production --profile proxy up -d --build
```
4. (Recommended) stop publishing the API directly: in `docker-compose.yml` change
   the api `ports` to `"127.0.0.1:3000:3000"` and open only 80/443 in the firewall.
5. Test: `curl https://api.your-domain.com/health`

## Updating after a code change
```bash
git pull
docker compose --env-file .env.production up -d --build
docker compose exec api npm run prisma:migrate:deploy   # if new migrations
```

## Notes
- Postgres data persists in the `deskfit_pgdata` Docker volume across restarts.
- Postgres is never published to the host — only the API/proxy is reachable.
- Firewall (optional hardening): `ufw allow OpenSSH && ufw allow 80,443/tcp` (and
  `3000/tcp` only if you expose the API without Caddy), then `ufw enable`.
