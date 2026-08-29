import { env, connectDatabase, disconnectDatabase, registerConnectionEvents } from '../src/config';
import { Branch } from '../src/modules/branch/branch.model';
import { User } from '../src/modules/user/user.model';
import { Cohort } from '../src/modules/cohort/cohort.model';
import { LiveSession } from '../src/modules/session/session.model';
import { Role } from '../src/shared/constants/roles';

/**
 * One-off migration for existing (pre-branch) databases.
 *
 * Creates a single "default" branch and backfills `branchId` onto every
 * existing convert/admin/mentor, cohort, and live session that doesn't
 * already have one. Run this ONCE before deploying the multi-branch feature
 * to a database that predates it.
 *
 * Idempotent: skips documents that already have a branchId, and reuses the
 * default branch by name if it already exists (safe to re-run).
 *
 * Usage:
 *   npm run migrate:branches -- "Lagos HQ"
 *   MIGRATE_BRANCH_NAME="Lagos HQ" npm run migrate:branches
 */
async function migrate(): Promise<void> {
  const branchName = process.argv[2] || process.env.MIGRATE_BRANCH_NAME;
  if (!branchName) {
    console.error(
      '❌ Provide the default branch name, e.g.:\n' +
        '   npm run migrate:branches -- "Lagos HQ"\n' +
        '   MIGRATE_BRANCH_NAME="Lagos HQ" npm run migrate:branches'
    );
    process.exit(1);
  }

  console.log(`🏷️  Migrating to multi-branch (${env.NODE_ENV})...\n`);

  registerConnectionEvents();
  await connectDatabase();

  try {
    let branch = await Branch.findOne({ name: branchName });
    if (branch) {
      console.log(`ℹ️  Branch "${branchName}" already exists — reusing it.`);
    } else {
      branch = await Branch.create({ name: branchName });
      console.log(`✅ Created default branch "${branchName}" (${branch._id.toString()})`);
    }

    const userResult = await User.updateMany(
      { role: { $in: [Role.CONVERT, Role.ADMIN, Role.MENTOR] }, branchId: null },
      { $set: { branchId: branch._id } }
    );
    console.log(`✅ Users backfilled: ${userResult.modifiedCount}`);

    const cohortResult = await Cohort.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: branch._id } }
    );
    console.log(`✅ Cohorts backfilled: ${cohortResult.modifiedCount}`);

    const sessionResult = await LiveSession.updateMany(
      { branchId: { $exists: false } },
      { $set: { branchId: branch._id } }
    );
    console.log(`✅ Live sessions backfilled: ${sessionResult.modifiedCount}`);

    console.log(
      '\n🏷️  Migration complete. The seeded super_admin (npm run seed) can now create ' +
        'additional branches and branch admins.'
    );
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

migrate().catch((error) => {
  console.error('💀 Migration failed:', error);
  process.exit(1);
});
