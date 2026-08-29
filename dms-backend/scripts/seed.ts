import crypto from 'crypto';
import { env, connectDatabase, disconnectDatabase, registerConnectionEvents } from '../src/config';
import { authService } from '../src/modules/auth/auth.service';
import { courseService } from '../src/modules/course/course.service';
import { Role } from '../src/shared/constants/roles';

/**
 * Seed script — creates the initial super admin and Believers Class course.
 *
 * Usage:
 *   npm run seed
 *
 * Idempotent: skips creation if resources already exist.
 */
async function seed(): Promise<void> {
  console.log(`🌱 Seeding database (${env.NODE_ENV})...\n`);

  registerConnectionEvents();
  await connectDatabase();

  try {
    // ── 1. Create Super Admin ──
    // This account has no branch — it's the one that subsequently creates
    // real branches and branch admins through the API/UI.
    // Password comes from SEED_ADMIN_PASSWORD; if unset we generate a strong
    // random one and print it ONCE. Either way the admin must change it on
    // first login (mustChangePassword = true).
    const providedPassword = process.env.SEED_ADMIN_PASSWORD;
    const generatedPassword =
      providedPassword ||
      `Tb-${crypto.randomBytes(9).toString('base64url')}-2025`;
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@teambarnabas.org';

    const adminData = {
      firstName: 'Super',
      lastName: 'Admin',
      phone: process.env.SEED_ADMIN_PHONE || '+2348000000000',
      email: adminEmail,
      password: generatedPassword,
      branchId: null,
      role: Role.SUPER_ADMIN,
      mustChangePassword: true,
    } satisfies Parameters<typeof authService.createAdmin>[0];

    try {
      const admin = await authService.createAdmin(adminData);
      console.log(`✅ Super admin created:`);
      console.log(`   Name:  ${admin.firstName} ${admin.lastName}`);
      console.log(`   Email: ${adminEmail}`);
      if (providedPassword) {
        console.log(`   Pass:  (from SEED_ADMIN_PASSWORD env)`);
      } else {
        console.log(`   Pass:  ${generatedPassword}`);
        console.log(`\n   ⚠️  Save this password now — it will NOT be shown again.`);
      }
      console.log(`   🔒 The admin must change this password on first login.\n`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log('ℹ️  Super admin already exists — skipping.\n');
      } else {
        throw error;
      }
    }

    // ── 2. Create Believers Class Course ──
    const course = await courseService.getOrCreateCourse();
    console.log(`✅ Course ready: "${course.title}" (${course.totalLessons} lessons)`);

    console.log('\n🌱 Seed complete.');
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

seed().catch((error) => {
  console.error('💀 Seed failed:', error);
  process.exit(1);
});
