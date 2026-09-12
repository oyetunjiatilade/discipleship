import crypto from 'crypto';
import { env, connectDatabase, disconnectDatabase, registerConnectionEvents } from '../src/config';
import { authService } from '../src/modules/auth/auth.service';
import { branchService } from '../src/modules/branch/branch.service';
import { Role } from '../src/shared/constants/roles';

/**
 * QA helper: create a throwaway admin or mentor account for manual testing,
 * without touching any existing (real) staff credentials.
 *
 * Usage:
 *   npm run qa-create-staff -- <admin|mentor> <branchName> [password]
 *
 * Creates "QA Tester" with a generated phone/email unique to this run.
 * If [password] is omitted, a strong random one is generated and printed.
 */
async function createStaff(): Promise<void> {
  const role = process.argv[2] as 'admin' | 'mentor';
  const branchName = process.argv[3];
  const providedPassword = process.argv[4];

  if (!['admin', 'mentor'].includes(role) || !branchName) {
    console.error('Usage: npm run qa-create-staff -- <admin|mentor> <branchName> [password]');
    process.exit(1);
  }

  registerConnectionEvents();
  await connectDatabase();

  try {
    const branches = await branchService.listActiveBranches();
    const branch = branches.find((b) => b.name.toLowerCase() === branchName.toLowerCase());
    if (!branch) {
      console.error(
        `❌ No active branch named "${branchName}". Available: ${branches.map((b) => b.name).join(', ') || '(none)'}`
      );
      process.exit(1);
    }

    const stamp = Date.now().toString().slice(-6);
    const password = providedPassword || `Qa-${crypto.randomBytes(9).toString('base64url')}-2026`;
    const email = `qa.${role}.${stamp}@teambarnabas.test`;
    const phone = `+234800${stamp}`;

    const staff = await authService.createAdmin({
      firstName: 'QA',
      lastName: role === 'admin' ? 'Admin' : 'Mentor',
      phone,
      email,
      password,
      branchId: branch.id,
      role: role === 'admin' ? Role.ADMIN : Role.MENTOR,
      mustChangePassword: false,
    });

    console.log(`✅ QA ${role} created in branch "${branch.name}":`);
    console.log(`   Email: ${staff.email}`);
    console.log(`   Phone: ${staff.phone}`);
    if (!providedPassword) {
      console.log(`   Pass:  ${password}`);
    }
    console.log(`\n   This is a throwaway test account — safe to delete when QA is done.`);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

createStaff().catch((error) => {
  console.error('💀 Failed:', error);
  process.exit(1);
});
