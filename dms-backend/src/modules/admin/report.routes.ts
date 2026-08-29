import { Router } from 'express';
import { reportController } from './report.controller';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { convertReportSchema, csvExportSchema, adminCreateConvertSchema, logContactSchema } from './report.validation';

// ══════════════════════════════════════════════
//  ADMIN REPORT ROUTES — mounted at /v1/admin/reports
//  (authenticate + authorize('admin') applied in app.ts)
// ══════════════════════════════════════════════

const router = Router();

/**
 * GET /v1/admin/reports/dashboard
 * Quick dashboard stats — stage breakdown, new this week/month.
 * No heavy joins, designed for fast dashboard loads.
 */
router.get(
  '/dashboard',
  asyncHandler(reportController.getDashboardStats.bind(reportController))
);

/**
 * GET /v1/admin/reports/follow-up
 * Actionable list of converts who need a check-in (ranked by silence).
 */
router.get(
  '/follow-up',
  asyncHandler(reportController.getFollowUp.bind(reportController))
);

/**
 * GET /v1/admin/reports/discipleship
 * Funnel counts + conversion/attrition rates.
 */
router.get(
  '/discipleship',
  asyncHandler(reportController.getDiscipleshipStats.bind(reportController))
);

/**
 * POST /v1/admin/reports/converts/:convertId/contact
 * Log a phone call with a convert.
 */
router.post(
  '/converts/:convertId/contact',
  validate(logContactSchema),
  asyncHandler(reportController.logContact.bind(reportController))
);

/**
 * GET /v1/admin/reports/converts
 * Paginated list of converts with completion percentage.
 *
 * Query params:
 *   stage          - Filter by discipleship stage (e.g., IN_CLASS)
 *   search         - Search by name or phone
 *   salvationDateFrom - Filter by registration date (YYYY-MM-DD)
 *   salvationDateTo   - Filter by registration date (YYYY-MM-DD)
 *   gender         - Filter by gender (male/female)
 *   isHolySpiritFilled - Filter by Holy Spirit status (true/false)
 *   page           - Page number (default: 1)
 *   limit          - Items per page (default: 20, max: 100)
 *   sort           - Sort field (default: -createdAt)
 */
router.get(
  '/converts',
  validate(convertReportSchema),
  asyncHandler(reportController.getConvertReport.bind(reportController))
);

/**
 * POST /v1/admin/reports/converts
 * Admin creates a new convert directly (no OTP required).
 */
router.post(
  '/converts',
  validate(adminCreateConvertSchema),
  asyncHandler(reportController.createConvert.bind(reportController))
);

/**
 * GET /v1/admin/reports/converts/csv
 * Download all matching converts as a CSV file.
 * Same filters as /converts, but no pagination — exports full dataset.
 */
router.get(
  '/converts/csv',
  validate(csvExportSchema),
  asyncHandler(reportController.downloadCsv.bind(reportController))
);

export { router as reportAdminRoutes };
