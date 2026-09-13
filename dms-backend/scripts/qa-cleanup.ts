import { connectDatabase, disconnectDatabase, registerConnectionEvents } from '../src/config';
import { User } from '../src/modules/user/user.model';
import { Otp } from '../src/modules/auth/otp.model';

/**
 * QA helper: remove throwaway accounts created by qa-create-staff / manual
 * QA registrations, so they don't clutter real UAT data.
 *
 * Deletes:
 *   - staff (admin/mentor) with email ending in "@teambarnabas.test"
 *   - converts whose phone starts with "+2348009991" (the qa-issue-otp demo range)
 *   - any leftover Otp records for those phones
 *
 * Usage: npm run qa-cleanup
 */
async function cleanup(): Promise<void> {
  registerConnectionEvents();
  await connectDatabase();

  try {
    const staff = await User.deleteMany({ email: { $regex: /@teambarnabas\.test$/i } });
    const converts = await User.find({ phone: { $regex: /^\+2348009991/ } });
    const convertPhones = converts.map((c) => c.phone);
    const convertsDeleted = await User.deleteMany({ phone: { $regex: /^\+2348009991/ } });
    const otpsDeleted = convertPhones.length
      ? await Otp.deleteMany({ phone: { $in: convertPhones } })
      : { deletedCount: 0 };

    console.log(`✅ Cleanup complete:`);
    console.log(`   Staff removed:    ${staff.deletedCount}`);
    console.log(`   Converts removed: ${convertsDeleted.deletedCount}`);
    console.log(`   OTPs removed:     ${otpsDeleted.deletedCount}`);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

cleanup().catch((error) => {
  console.error('💀 Failed:', error);
  process.exit(1);
});
