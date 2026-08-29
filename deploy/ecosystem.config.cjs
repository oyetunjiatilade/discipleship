/**
 * PM2 process definition for the DMS API.
 *
 * Used by deploy/deploy.sh:  pm2 startOrReload deploy/ecosystem.config.cjs
 * PM2 itself is resurrected on boot by the pm2-tunji systemd unit (see
 * deploy/setup-server.sh), so `pm2 save` after a reload persists the process list.
 *
 * The API reads its configuration from dms-backend/.env (loaded by dotenv from
 * `cwd`), which is a symlink to /var/www/dms/shared/backend.env — see the env
 * checklist in deploy/README.md.
 */
module.exports = {
  apps: [
    {
      name: 'dms-api',
      cwd: '/var/www/dms/app/dms-backend',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/dms/logs/dms-api.error.log',
      out_file: '/var/www/dms/logs/dms-api.out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
