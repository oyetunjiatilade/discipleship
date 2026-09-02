# DMS — Production deployment

Target host: **`62.238.33.106`** (Ubuntu 26.04, user `tunji`)
Public URL: **`https://discipleship.slchurchng.org`** (SPA + API same-origin behind nginx)
Database: **MongoDB Atlas** (no Mongo on the server)
Process manager: **PM2** (`dms-api`), resurrected on boot by `pm2-tunji.service`

```
Browser ──HTTPS──▶ nginx (:80/:443, vhost discipleship.slchurchng.org)
                     ├─ /                → static SPA  /var/www/dms/app/dms-frontend/dist
                     ├─ /v1/…            → 127.0.0.1:4000  (Node API, PM2)
                     ├─ /socket.io/…     → 127.0.0.1:4000  (websocket upgrade)
                     └─ /health          → 127.0.0.1:4000/health
                                              │
                                              └── MongoDB Atlas (mongodb+srv://…)
```

Server layout:

```
/var/www/dms/
├── app/                     # git clone of the monorepo (this repo)
│   ├── dms-backend/         #   .env → symlink to ../shared/backend.env
│   ├── dms-frontend/dist/   #   built SPA, served by nginx
│   └── deploy/              #   these scripts
├── shared/backend.env       # production secrets — NOT in git
└── logs/                    # pm2 stdout/stderr
```

---

## First-time setup

### 1. Server bootstrap (once)

Already applied to `62.238.33.106`. To reproduce on a fresh box, from a checkout of this repo on the server:

```bash
bash deploy/setup-server.sh      # prompts for sudo password; idempotent
```

Installs: 2 G swap, Node 20+, PM2 (+ boot unit + logrotate), certbot (snap), ufw
(OpenSSH + Nginx Full), `/var/www/dms/{app,shared,logs}`, the nginx vhost, and a
scoped `sudoers.d/dms-deploy` entry for the `dms-nginx-sync` helper.

### 2. DNS

Create an **A record**:

| Host | Type | Value |
|------|------|-------|
| `discipleship.slchurchng.org` | `A` | `62.238.33.106` |

Verify: `dig +short discipleship.slchurchng.org` → `62.238.33.106`. **Done** (2026-09).

### 3. MongoDB Atlas

1. **Network Access** → add `62.238.33.106/32`.
2. **Database Access** → user with `readWrite` on `dms`.
3. Copy the SRV connection string (Connect → Drivers), keep `/dms` as the db name.

### 4. Clone the repo

```bash
git clone <REPO_URL> /var/www/dms/app
```

Private repo → put a read-only deploy key at `~/.ssh/id_ed25519` on the server and
add its `.pub` to the repo's Deploy Keys.

### 5. Production env file — **the checklist**

```bash
cp /var/www/dms/app/deploy/backend.env.production.example /var/www/dms/shared/backend.env
chmod 600 /var/www/dms/shared/backend.env
nano /var/www/dms/shared/backend.env        # work through the table below
/var/www/dms/app/deploy/check-env.sh /var/www/dms/shared/backend.env   # must pass
```

`deploy.sh` runs `check-env.sh` on every deploy and **aborts** if a hard check fails.

#### Production env checklist

| Variable | Dev value | Production value | Why | Enforced |
|---|---|---|---|---|
| `NODE_ENV` | `development` | `production` | Turns on secure cookies (`Secure`+`SameSite=None`), `info` logging, real error envelopes | **hard** |
| `API_BASE_URL` | `http://localhost:4000` | `https://discipleship.slchurchng.org` | Used in server-rendered links / logs | **hard** |
| `MONGODB_URI` | `mongodb://localhost:27017/dms` | `mongodb+srv://…mongodb.net/dms?retryWrites=true&w=majority` | Atlas; not localhost | **hard** |
| `JWT_ACCESS_SECRET` | `dev-access-secret-…` | new `randomBytes(48).hex` | Dev secret is public in the repo | **hard** |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret-…` | a **different** new `randomBytes(48).hex` | same | **hard** (also: must differ from access) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | `https://discipleship.slchurchng.org` | CORS + Socket.IO origin allow-list | **hard** |
| `LOG_LEVEL` | `debug` | `info` | Noise / disk | warn |
| `RATE_LIMIT_MAX_REQUESTS` | `1000` | `300` | 1000/15 min/IP is too loose for prod | warn |
| `SMS_PROVIDER` | `mock` | `termii` once a key exists | `mock` = **no OTP SMS sent** → convert phone-OTP login & registration verification don't work. Admin/mentor email+password login is unaffected. | warn |
| `SMS_API_KEY` | empty | Termii API key | required when `SMS_PROVIDER=termii` | hard *if* provider≠mock |
| `SMS_SENDER_ID` | `TeamBarnabas` | approved Termii sender ID | Termii rejects unregistered IDs | — |
| `SMS_CHANNEL` | `generic` | `generic` or `whatsapp` | delivery channel for OTP + nudges | — |
| `CLOUDINARY_API_SECRET` | `WgyzK4HLYGpWVjzjZDZYIGsk24I` | **rotate** in Cloudinary console | dev value has been shared in `.env.example`/chat | warn |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` | dev | confirm = church's prod account | — | — |
| `REENGAGEMENT_CRON` | `0 9 * * *` | `0 8 * * *` | server clock is **UTC**; 08:00 UTC = 09:00 WAT | warn (review) |
| `COOKIE_DOMAIN` | unset | **leave unset** | single host; host-scoped cookie is correct. Only set for a separate `api.*` subdomain | warn if set |
| `SEED_ADMIN_EMAIL` / `_PHONE` | — | real church values | identifies the first super-admin | — |
| `SEED_ADMIN_PASSWORD` | — | strong value, or blank to auto-generate + print once | first login forces a change | — |
| `JWT_*_EXPIRY`, `OTP_EXPIRY_MINUTES`, `NUDGE_*`, `ENABLE_SCHEDULER`, `PORT` | — | keep defaults | — | — |

> Frontend needs **no** env file: the build runs with `VITE_API_BASE_URL=""` so the
> SPA uses relative URLs that nginx proxies (same-origin).

### 6. First deploy

```bash
RUN_SEED=1 /var/www/dms/app/deploy/deploy.sh main
```

`RUN_SEED=1` creates the super-admin + the Believers Class course (idempotent).
Save the generated admin password if you left `SEED_ADMIN_PASSWORD` blank.

### 7. TLS (after DNS resolves)

The repo vhost (`deploy/nginx/discipleship.slchurchng.org.conf`) already contains
the `:443` server block and the HTTP→HTTPS redirect — it is self-contained (no
certbot-managed includes) so `dms-nginx-sync` keeps HTTPS intact on every deploy.
You only need to issue the certificate once; **do not** use `certbot --nginx`
(which would rewrite the vhost):

```bash
# 1. issue the cert (works against the current HTTP-only live vhost)
sudo certbot certonly --nginx -d discipleship.slchurchng.org \
  -m <ops-email> --agree-tos --no-eff-email

# 2. install the TLS vhost from the repo + reload nginx
sudo /usr/local/sbin/dms-nginx-sync      # or just run deploy/deploy.sh main
```

certbot installs a renewal timer (nginx authenticator, fully automatic).
**Auth only works over HTTPS** (the refresh cookie is `Secure`), so do this
before handing the URL out.

---

## Routine deploys

From your machine (after pushing to `main`):

```bash
deploy/remote-deploy.sh                 # ssh + git reset + build + pm2 reload + health check
```

or on the server directly:

```bash
/var/www/dms/app/deploy/deploy.sh main
```

Toggles: `SKIP_FRONTEND=1`, `SKIP_BACKEND=1`, `NO_NGINX=1`,
`RUN_MIGRATE=1 MIGRATE_BRANCH_NAME="Lagos HQ"`.

---

## Operations

| Task | Command |
|---|---|
| API logs (live) | `pm2 logs dms-api` |
| API status / restarts | `pm2 status` |
| Restart API | `pm2 restart dms-api` |
| nginx error log | `sudo tail -f /var/log/nginx/error.log` |
| Re-run env checklist | `deploy/check-env.sh /var/www/dms/shared/backend.env` |
| Renew cert (dry run) | `sudo certbot renew --dry-run` |
| Rollback | `cd /var/www/dms/app && git reset --hard <sha> && deploy/deploy.sh main` |

## Troubleshooting

- **502 on `/v1`** — API down: `pm2 status`, `pm2 logs dms-api`. Usually a bad
  `backend.env` (Atlas IP not whitelisted, wrong URI) — the process exits on boot
  if env validation fails.
- **Login works then immediately logs out** — refresh cookie rejected. Confirm the
  site is on **HTTPS** and `NODE_ENV=production`.
- **CORS / socket errors in console** — `ALLOWED_ORIGINS` must be exactly
  `https://discipleship.slchurchng.org` (no trailing slash).
- **OTP never arrives** — expected while `SMS_PROVIDER=mock`. Check `pm2 logs` for
  the mock output, or set a real Termii key.
