import cron from 'node-cron';
import { env } from '../config';
import { runReengagement } from './reengagement.job';
import { notificationService } from '../modules/notification/notification.service';

let started = false;

/**
 * Start all recurring background jobs.
 * Called once after the DB connects (skipped in tests).
 */
export function startScheduler(): void {
  if (!env.ENABLE_SCHEDULER) {
    console.log('⏰ Scheduler disabled (ENABLE_SCHEDULER=false).');
    return;
  }
  if (started) return;
  started = true;

  cron.schedule(env.REENGAGEMENT_CRON, async () => {
    try {
      const result = await runReengagement();
      console.log(
        `⏰ [reengagement] scanned=${result.scanned} nudged=${result.nudged}`
      );
    } catch (err) {
      console.error('⏰ [reengagement] job failed:', err);
    }
  });

  // Notification outbox processor — retries any failed event notifications.
  cron.schedule('* * * * *', async () => {
    try {
      const r = await notificationService.processOutbox();
      if (r.processed > 0 || r.failed > 0) {
        console.log(`⏰ [outbox] processed=${r.processed} failed=${r.failed}`);
      }
    } catch (err) {
      console.error('⏰ [outbox] processor failed:', err);
    }
  });

  console.log(`⏰ Scheduler started (reengagement cron: "${env.REENGAGEMENT_CRON}"; outbox: every minute).`);
}
