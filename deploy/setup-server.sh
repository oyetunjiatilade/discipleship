#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  DMS one-time server bootstrap  —  Ubuntu 24.04 / 26.04
#
#  Idempotent: safe to re-run. Documents (and reproduces) the exact server
#  state prepared for discipleship.slchurchng.org:
#    - 2G swap, Node 20+, PM2 (boot-persisted), certbot (snap), ufw
#    - /var/www/dms/{app,shared,logs}
#    - nginx vhost (HTTP; TLS added by certbot once DNS resolves)
#    - passwordless sudo for the handful of commands deploy.sh needs
#
#  Run as `tunji` (will prompt for the sudo password):
#    bash deploy/setup-server.sh
#
#  Does NOT deploy the app and does NOT touch DNS or run certbot — see
#  deploy/README.md for those final steps.
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

DOMAIN="discipleship.slchurchng.org"
APP_ROOT="/var/www/dms"
DEPLOY_USER="$(whoami)"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say() { printf '\n\033[36m══ %s\033[0m\n' "$*"; }

say "1/9  Swap (2G)"
if ! swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
free -h | grep -i swap

say "2/9  Disable PPAs with no release for this Ubuntu (e.g. ondrej/php)"
for f in /etc/apt/sources.list.d/ondrej-*.sources /etc/apt/sources.list.d/ondrej*.list; do
  [ -e "$f" ] && sudo mv "$f" "$f.disabled" || true
done

say "3/9  APT base packages"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl gnupg git rsync ufw nginx

say "4/9  Node.js (20 LTS via NodeSource; falls back to distro nodejs)"
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || true
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs || \
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs npm
fi
command -v npm >/dev/null || sudo apt-get install -y npm
echo "node $(node -v) / npm $(npm -v)"

say "5/9  PM2 + boot persistence"
sudo npm install -g pm2@latest
sudo env PATH="$PATH" pm2 startup systemd -u "$DEPLOY_USER" --hp "$HOME" | tail -1
pm2 install pm2-logrotate 2>/dev/null || true

say "6/9  certbot (snap)"
if ! command -v certbot >/dev/null; then
  sudo snap install core
  sudo snap install --classic certbot
  sudo ln -sf /snap/bin/certbot /usr/bin/certbot
fi
certbot --version

say "7/9  Firewall (ufw)"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status

chmod +x "$REPO_DIR"/deploy/*.sh 2>/dev/null || true

say "8/9  Directories"
sudo mkdir -p "$APP_ROOT/app" "$APP_ROOT/shared" "$APP_ROOT/logs"
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT"

say "9/9  nginx vhost + deploy sudoers"
sudo cp "$REPO_DIR/deploy/nginx/$DOMAIN.conf" "/etc/nginx/sites-available/$DOMAIN.conf"
sudo ln -sf "/etc/nginx/sites-available/$DOMAIN.conf" "/etc/nginx/sites-enabled/$DOMAIN.conf"
# Placeholder page so nginx has a root before the first deploy
sudo mkdir -p "$APP_ROOT/app/dms-frontend/dist"
[ -f "$APP_ROOT/app/dms-frontend/dist/index.html" ] || \
  echo '<!doctype html><title>DMS</title><h1>Deploy pending</h1>' | sudo tee "$APP_ROOT/app/dms-frontend/dist/index.html" >/dev/null
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_ROOT/app/dms-frontend"
sudo nginx -t && sudo systemctl reload nginx

# One root-owned helper that deploy.sh may run without a password. It only ever
# syncs THE one vhost from the checked-out repo and reloads nginx — nothing else.
sudo tee /usr/local/sbin/dms-nginx-sync >/dev/null <<HELPER
#!/usr/bin/env bash
set -euo pipefail
SRC="$APP_ROOT/app/deploy/nginx/$DOMAIN.conf"
DST="/etc/nginx/sites-available/$DOMAIN.conf"
[ -f "\$SRC" ] || { echo "vhost source missing: \$SRC" >&2; exit 1; }
if cmp -s "\$SRC" "\$DST"; then echo "nginx vhost unchanged"; exit 0; fi
cp "\$SRC" "\$DST"
ln -sf "\$DST" "/etc/nginx/sites-enabled/$DOMAIN.conf"
nginx -t
systemctl reload nginx
echo "nginx vhost synced + reloaded"
HELPER
sudo chmod 0755 /usr/local/sbin/dms-nginx-sync

echo "$DEPLOY_USER ALL=(root) NOPASSWD: /usr/local/sbin/dms-nginx-sync" | \
  sudo tee /etc/sudoers.d/dms-deploy >/dev/null
sudo chmod 440 /etc/sudoers.d/dms-deploy
sudo visudo -cf /etc/sudoers.d/dms-deploy

cat <<DONE

═══════════════════════════════════════════════════════════════
 Server bootstrap complete.

 Next (see deploy/README.md):
   1. Point DNS:  $DOMAIN  A  ->  $(curl -s -4 ifconfig.me || echo '<server-ip>')
   2. git clone  <repo-url>  $APP_ROOT/app
   3. Create     $APP_ROOT/shared/backend.env   (from deploy/backend.env.production.example)
   4. Walk the env checklist:   $APP_ROOT/app/deploy/check-env.sh $APP_ROOT/shared/backend.env
   5. First deploy:   RUN_SEED=1 $APP_ROOT/app/deploy/deploy.sh main
   6. TLS:   sudo certbot --nginx -d $DOMAIN
═══════════════════════════════════════════════════════════════
DONE
