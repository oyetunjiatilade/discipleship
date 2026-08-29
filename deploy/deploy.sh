#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  DMS deployment script  —  run ON the server as user `tunji`
#
#  Usage:
#    /var/www/dms/app/deploy/deploy.sh [branch]        # default branch: main
#
#  Env toggles:
#    RUN_SEED=1        also run `npm run seed` after deploy (first deploy only)
#    RUN_MIGRATE=1     also run `npm run migrate:branches -- "<name>"` (needs MIGRATE_BRANCH_NAME)
#    SKIP_FRONTEND=1   don't rebuild the SPA
#    SKIP_BACKEND=1    don't rebuild/restart the API
#    NO_NGINX=1        don't touch nginx even if the vhost file changed
#
#  What it does:
#    1. Preflight — validate the production env file (the "checklist", enforced)
#    2. git fetch + hard-reset to origin/<branch>
#    3. Backend:  npm ci → build → link prod .env → pm2 reload
#    4. Frontend: npm ci → build (output served by nginx)
#    5. Sync the nginx vhost if it changed, reload nginx
#    6. Health check
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="/var/www/dms/app"
SHARED_ENV="/var/www/dms/shared/backend.env"
LOG_DIR="/var/www/dms/logs"
BRANCH="${1:-main}"
NGINX_VHOST="/etc/nginx/sites-available/discipleship.slchurchng.org.conf"
HEALTH_URL="http://127.0.0.1:4000/health"

cyan()  { printf '\033[36m▶ %s\033[0m\n' "$*"; }
green() { printf '\033[32m✔ %s\033[0m\n' "$*"; }
warn()  { printf '\033[33m! %s\033[0m\n' "$*" >&2; }
red()   { printf '\033[31mx %s\033[0m\n' "$*" >&2; }
die()   { red "$*"; exit 1; }

[ -d "$APP_DIR/.git" ] || die "No git checkout at $APP_DIR — clone the repo there first (see deploy/README.md)."
cd "$APP_DIR"
mkdir -p "$LOG_DIR"

# ── 1. Preflight: the production env checklist, enforced ──────────────
cyan "Preflight: validating $SHARED_ENV"
bash "$APP_DIR/deploy/check-env.sh" "$SHARED_ENV" || die "Env checklist failed — fix $SHARED_ENV and re-run."
green "Env file looks production-ready"

# ── 2. Pull code ─────────────────────────────────────────────────────
cyan "Fetching origin/$BRANCH"
git fetch --prune origin
git checkout -q "$BRANCH" 2>/dev/null || git checkout -q -b "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"
green "At $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# ── 3. Backend ───────────────────────────────────────────────────────
if [ "${SKIP_BACKEND:-0}" != "1" ]; then
  cyan "Backend: npm ci"
  ( cd dms-backend && npm ci --no-audit --no-fund )

  cyan "Backend: linking production env"
  [ -f "$SHARED_ENV" ] || die "Missing $SHARED_ENV"
  ln -sfn "$SHARED_ENV" "$APP_DIR/dms-backend/.env"

  cyan "Backend: build"
  ( cd dms-backend && npm run build )

  cyan "Backend: (re)start via PM2"
  pm2 startOrReload "$APP_DIR/deploy/ecosystem.config.cjs" --update-env
  pm2 save
  green "API reloaded"
else
  cyan "SKIP_BACKEND=1 — skipping API"
fi

# ── 4. Frontend ──────────────────────────────────────────────────────
if [ "${SKIP_FRONTEND:-0}" != "1" ]; then
  cyan "Frontend: npm ci"
  ( cd dms-frontend && npm ci --no-audit --no-fund )

  # Same-origin deployment: empty base URL → the SPA calls /v1 and /socket.io
  # on its own host, which nginx proxies to the API.
  cyan "Frontend: build"
  ( cd dms-frontend && VITE_API_BASE_URL="" npm run build )
  green "SPA built → dms-frontend/dist (served by nginx)"
else
  cyan "SKIP_FRONTEND=1 — skipping SPA"
fi

# ── 5. nginx vhost ───────────────────────────────────────────────────
# dms-nginx-sync is the root-owned helper installed by setup-server.sh; it
# diffs the repo's vhost against the live one and reloads nginx only if needed.
if [ "${NO_NGINX:-0}" != "1" ]; then
  if sudo -n /usr/local/sbin/dms-nginx-sync 2>/dev/null; then
    :
  else
    warn "Could not run dms-nginx-sync (run deploy/setup-server.sh?). If you changed"
    warn "the vhost, apply it manually: sudo cp deploy/nginx/*.conf /etc/nginx/sites-available/ && sudo systemctl reload nginx"
  fi
fi

# ── 6. Optional one-off data steps ───────────────────────────────────
if [ "${RUN_SEED:-0}" = "1" ]; then
  cyan "Running seed (idempotent)"
  ( cd dms-backend && npm run seed )
fi
if [ "${RUN_MIGRATE:-0}" = "1" ]; then
  [ -n "${MIGRATE_BRANCH_NAME:-}" ] || die "RUN_MIGRATE=1 needs MIGRATE_BRANCH_NAME"
  cyan "Running branch migration for '$MIGRATE_BRANCH_NAME'"
  ( cd dms-backend && npm run migrate:branches -- "$MIGRATE_BRANCH_NAME" )
fi

# ── 7. Health check ──────────────────────────────────────────────────
if [ "${SKIP_BACKEND:-0}" != "1" ]; then
  cyan "Health check"
  for i in $(seq 1 10); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      green "API healthy: $(curl -fsS "$HEALTH_URL")"
      break
    fi
    [ "$i" = "10" ] && { pm2 logs dms-api --lines 40 --nostream; die "API did not become healthy"; }
    sleep 1
  done
fi

green "Deploy complete — $(git rev-parse --short HEAD) on $BRANCH"
echo   "   Site:  https://discipleship.slchurchng.org"
echo   "   Logs:  pm2 logs dms-api   |   $LOG_DIR/"
