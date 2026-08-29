#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  Production env checklist — enforced.
#  deploy.sh runs this against /var/www/dms/shared/backend.env before every
#  deploy. Run it by hand any time:  deploy/check-env.sh <path-to-env>
#
#  Exits non-zero (blocking the deploy) on a hard failure; prints WARN for
#  things you should confirm but that won't break the app.
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail
ENV_FILE="${1:-/var/www/dms/shared/backend.env}"
[ -f "$ENV_FILE" ] || { echo "x  Env file not found: $ENV_FILE"; exit 1; }

# Read a KEY=value line without executing the file (values like the cron
# expression are unquoted and would break `source`).
get() {
  local line
  line="$(grep -E "^[[:space:]]*$1=" "$ENV_FILE" | tail -1 || true)"
  line="${line#*=}"
  line="${line%%#*}"                       # strip trailing comment
  line="${line%"${line##*[![:space:]]}"}"  # rtrim
  line="${line#"${line%%[![:space:]]*}"}"  # ltrim
  line="${line%\"}"; line="${line#\"}"     # unquote
  line="${line%\'}"; line="${line#\'}"
  printf '%s' "$line"
}

fail=0
err()  { printf '  \033[31mFAIL\033[0m  %s\n' "$*"; fail=1; }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$*"; }
ok()   { printf '  \033[32m ok \033[0m  %s\n' "$*"; }

echo "Checking $ENV_FILE"

NODE_ENV="$(get NODE_ENV)"
API_BASE_URL="$(get API_BASE_URL)"
MONGODB_URI="$(get MONGODB_URI)"
JWT_ACCESS_SECRET="$(get JWT_ACCESS_SECRET)"
JWT_REFRESH_SECRET="$(get JWT_REFRESH_SECRET)"
ALLOWED_ORIGINS="$(get ALLOWED_ORIGINS)"
LOG_LEVEL="$(get LOG_LEVEL)"
SMS_PROVIDER="$(get SMS_PROVIDER)"
SMS_API_KEY="$(get SMS_API_KEY)"
CLOUDINARY_API_SECRET="$(get CLOUDINARY_API_SECRET)"
COOKIE_DOMAIN="$(get COOKIE_DOMAIN)"

# ── Hard requirements ──
[ "$NODE_ENV" = "production" ] || err "NODE_ENV must be 'production' (got '${NODE_ENV:-unset}')"

case "$API_BASE_URL" in
  https://discipleship.slchurchng.org*) ok "API_BASE_URL" ;;
  *localhost*|"") err "API_BASE_URL must be the public https URL (got '${API_BASE_URL:-unset}')" ;;
  *) warn "API_BASE_URL is '$API_BASE_URL' — expected https://discipleship.slchurchng.org" ;;
esac

case "$MONGODB_URI" in
  *localhost*|*127.0.0.1*|"") err "MONGODB_URI still points at localhost / is empty — set the Atlas SRV string" ;;
  *USER:PASSWORD*|*CLUSTER.xxxxx*) err "MONGODB_URI still has placeholder USER:PASSWORD / CLUSTER" ;;
  mongodb+srv://*|mongodb://*)
    case "$MONGODB_URI" in
      */dms\?*|*/dms) ok "MONGODB_URI (Mongo, db=dms)" ;;
      *) warn "MONGODB_URI set but database name may not be 'dms'" ;;
    esac ;;
  *) err "MONGODB_URI does not look like a Mongo connection string" ;;
esac

for v in JWT_ACCESS_SECRET JWT_REFRESH_SECRET; do
  val="${!v}"
  if [ -z "$val" ] || [ "$val" = "__GENERATE_ME__" ]; then
    err "$v is unset / still __GENERATE_ME__"
  elif [ "${#val}" -lt 32 ]; then
    err "$v shorter than 32 chars (${#val})"
  elif printf '%s' "$val" | grep -q 'dev-access-secret\|dev-refresh-secret'; then
    err "$v is still a dev secret — regenerate"
  else
    ok "$v (${#val} chars)"
  fi
done
[ -n "$JWT_ACCESS_SECRET" ] && [ "$JWT_ACCESS_SECRET" = "$JWT_REFRESH_SECRET" ] && \
  err "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ"

case "$ALLOWED_ORIGINS" in
  *discipleship.slchurchng.org*) ok "ALLOWED_ORIGINS" ;;
  *) err "ALLOWED_ORIGINS must include https://discipleship.slchurchng.org (got '${ALLOWED_ORIGINS:-unset}')" ;;
esac

# ── Soft checks — confirm, non-blocking ──
[ "${LOG_LEVEL:-info}" = "debug" ] && warn "LOG_LEVEL=debug in production — prefer 'info'"

if [ "${SMS_PROVIDER:-mock}" = "mock" ]; then
  warn "SMS_PROVIDER=mock — convert phone-OTP login/verification won't send real codes (admin/mentor email login unaffected)"
elif [ -z "$SMS_API_KEY" ]; then
  err "SMS_PROVIDER=$SMS_PROVIDER but SMS_API_KEY is empty"
else
  ok "SMS_PROVIDER=$SMS_PROVIDER with a key"
fi

case "$CLOUDINARY_API_SECRET" in
  ""|WgyzK4HLYGpWVjzjZDZYIGsk24I) warn "CLOUDINARY_API_SECRET is empty or the shared dev value — rotate it" ;;
  *) ok "CLOUDINARY_API_SECRET (set)" ;;
esac

[ -n "$COOKIE_DOMAIN" ] && warn "COOKIE_DOMAIN=$COOKIE_DOMAIN set — only needed for a separate api.* subdomain"

echo
if [ "$fail" = "1" ]; then
  echo "x  Checklist FAILED — deploy blocked."
  exit 1
fi
echo "OK  Checklist passed."
