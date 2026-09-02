import crypto from 'crypto';
import { env, connectDatabase, disconnectDatabase, registerConnectionEvents } from '../src/config';
import { User } from '../src/modules/user/user.model';
import { Role } from '../src/shared/constants/roles';
import { tokenService } from '../src/modules/auth/token.service';

/**
 * Reset a staff (admin / mentor / super_admin) password out-of-band.
 *
 * Use this when the seed-generated super-admin password was lost. It sets a new
 * password, forces a change on next login (mustChangePassword = true), and
 * revokes any existing refresh tokens.
 *
 * Usage:
 *   npm run reset-admin-password -- <email> [newPassword]
 *   RESET_ADMIN_EMAIL=admin@slchurchng.org RESET_ADMIN_PASSWORD='Xy...' npm run reset-admin-password
 *
 * If no password is given, a strong random one is generated and printed ONCE.
 * The new password still satisfies the change-password policy
 * (>= 8 chars, one lowercase, one uppercase, one digit).
 */
async function resetAdminPassword(): Promise<void> {
  const email = (process.argv[2] || process.env.RESET_ADMIN_EMAIL || '').toLowerCase().trim();
  if (!email) {
    console.error('❌ Provide an email: npm run reset-admin-password -- <email> [newPassword]');
    process.exit(1);
  }

  const provided = process.argv[3] || process.env.RESET_ADMIN_PASSWORD;
  const newPassword = provided || `Tb-${crypto.randomBytes(9).toString('base64url')}-2026`;

  console.log(`🔑 Resetting password for ${email} (${env.NODE_ENV})...\n`);

  registerConnectionEvents();
  await connectDatabase();

  try {
    const admin = await User.findOne({
      email,
      role: { $in: [Role.ADMIN, Role.MENTOR, Role.SUPER_ADMIN] },
      isActive: true,
    }).select('+passwordHash');

    if (!admin) {
      console.error(`❌ No active admin/mentor/super_admin found with email ${email}`);
      process.exit(1);
    }

    admin.passwordHash = newPassword; // pre-save hook hashes it
    admin.mustChangePassword = true;
    await admin.save();

    await tokenService.revokeAllUserTokens(admin._id.toString());

    console.log(`✅ Password reset:`);
    console.log(`   Name:  ${admin.firstName} ${admin.lastName}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role:  ${admin.role}`);
    if (provided) {
      console.log(`   Pass:  (from argument / RESET_ADMIN_PASSWORD env)`);
    } else {
      console.log(`   Pass:  ${newPassword}`);
      console.log(`\n   ⚠️  Save this now — it will NOT be shown again.`);
    }
    console.log(`   🔒 Must be changed on next login. All existing sessions revoked.\n`);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

resetAdminPassword().catch((error) => {
  console.error('💀 Reset failed:', error);
  process.exit(1);
});
