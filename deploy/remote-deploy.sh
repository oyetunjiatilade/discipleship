#!/usr/bin/env bash
# Trigger a deploy on the server from your workstation.
#
#   deploy/remote-deploy.sh [branch]
#
# Assumes SSH access to tunji@62.238.33.106 (key-based). Pass extra deploy.sh
# toggles through the environment, e.g.:
#   SKIP_FRONTEND=1 deploy/remote-deploy.sh
#   RUN_SEED=1 deploy/remote-deploy.sh main
set -euo pipefail

HOST="${DMS_SSH_HOST:-tunji@62.238.33.106}"
APP_DIR="/var/www/dms/app"
BRANCH="${1:-main}"

# Forward known deploy.sh toggles if set locally.
FWD=""
for v in RUN_SEED RUN_MIGRATE MIGRATE_BRANCH_NAME SKIP_FRONTEND SKIP_BACKEND NO_NGINX; do
  [ -n "${!v:-}" ] && FWD="$FWD $v=${!v}"
done

echo "▶ Deploying $BRANCH to $HOST"
# shellcheck disable=SC2029
exec ssh -t "$HOST" "cd $APP_DIR && git fetch --quiet origin && env$FWD bash ./deploy/deploy.sh $BRANCH"
