import { Types } from 'mongoose';
import { User } from '../modules/user/user.model';
import { Progress } from '../modules/progress/progress.model';
import { Role } from '../shared/constants/roles';
import { DiscipleshipStage } from '../shared/constants/stages';
import { notificationService } from '../modules/notification/notification.service';
import { messagingService } from '../shared/services/messaging.service';
import { env } from '../config';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Re-engagement job.
 *
 * Finds converts who are still working through the class but have gone quiet,
 * and sends them an in-app + WhatsApp/SMS nudge. Respects a cooldown so nobody
 * gets spammed. This is the proactive loop the platform was missing.
 */
export async function runReengagement(): Promise<{ scanned: number; nudged: number }> {
  const now = Date.now();
  const inactiveCutoff = new Date(now - env.NUDGE_INACTIVE_DAYS * DAY_MS);
  const cooldownCutoff = new Date(now - env.NUDGE_COOLDOWN_DAYS * DAY_MS);

  // Candidates: active converts still in the pre-completion stages,
  // who haven't been nudged within the cooldown window.
  const candidates = await User.find({
    role: Role.CONVERT,
    isActive: true,
    currentStage: {
      $in: [
        DiscipleshipStage.NEW_CONVERT,
        DiscipleshipStage.HOLY_SPIRIT_FILLED,
        DiscipleshipStage.IN_CLASS,
      ],
    },
    $or: [{ lastNudgeAt: null }, { lastNudgeAt: { $lt: cooldownCutoff } }],
  }).select('_id firstName phone lastLoginAt createdAt');

  if (candidates.length === 0) return { scanned: 0, nudged: 0 };

  // One aggregation for everyone's last activity timestamp.
  const ids = candidates.map((c) => c._id);
  const activity = await Progress.aggregate<{ _id: Types.ObjectId; last: Date }>([
    { $match: { userId: { $in: ids } } },
    { $group: { _id: '$userId', last: { $max: '$updatedAt' } } },
  ]);
  const lastActivityMap = new Map(activity.map((a) => [a._id.toString(), a.last]));

  let nudged = 0;

  for (const c of candidates) {
    const lastActivity =
      lastActivityMap.get(c._id.toString()) || c.lastLoginAt || c.createdAt;

    if (!lastActivity || lastActivity > inactiveCutoff) continue; // still active enough

    const daysInactive = Math.floor((now - lastActivity.getTime()) / DAY_MS);

    const message = await notificationService.notifyInactivityNudge(
      c._id.toString(),
      c.firstName,
      daysInactive
    );

    // Best-effort external nudge on the channel converts actually use.
    if (c.phone) {
      await messagingService.sendMessage(c.phone, message);
    }

    c.lastNudgeAt = new Date();
    await c.save();
    nudged += 1;
  }

  return { scanned: candidates.length, nudged };
}
