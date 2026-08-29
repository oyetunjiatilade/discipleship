import { Request, Response } from 'express';
import { reportService } from './report.service';
import { ConvertReportFilters } from './report.types';
import { sendSuccess } from '../../shared/utils/response';
import { AppError } from '../../shared/errors';

/**
 * Report controller — admin-only reporting endpoints.
 *
 * Three flavors:
 * 1. Paginated JSON (for frontend tables)
 * 2. CSV download (for Excel/Google Sheets)
 * 3. Dashboard stats (quick counts, no joins)
 */
class ReportController {
  /**
   * GET /v1/admin/reports/converts
   *
   * Paginated list of converts with completion percentage.
   * Supports filtering by stage, name/phone search, date range, gender.
   *
   * Query params: stage, search, salvationDateFrom, salvationDateTo,
   *               gender, isHolySpiritFilled, page, limit, sort
   */
  async getConvertReport(req: Request, res: Response): Promise<void> {
    const filters = this.extractFilters(req);
    const { page, limit, sort } = req.query as Record<string, string>;

    const result = await reportService.getConvertReport(filters, { page, limit, sort });

    sendSuccess(res, 200, result.data, result.meta);
  }

  /**
   * GET /v1/admin/reports/converts/csv
   *
   * Download all matching converts as a CSV file.
   * Same filters as the JSON endpoint, but no pagination.
   */
  async downloadCsv(req: Request, res: Response): Promise<void> {
    const filters = this.extractFilters(req);

    const csv = await reportService.generateCsv(filters);

    // Generate filename with current date
    const dateStr = new Date().toISOString().split('T')[0];
    const stageSuffix = filters.stage ? `-${filters.stage.toLowerCase()}` : '';
    const filename = `converts-report${stageSuffix}-${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  }

  /**
   * GET /v1/admin/reports/dashboard
   *
   * Quick dashboard statistics — counts by stage, new this week/month.
   * No heavy joins — designed for fast dashboard loads.
   */
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    const stats = await reportService.getDashboardStats(this.resolveBranchFilter(req));
    sendSuccess(res, 200, stats);
  }

  /**
   * GET /v1/admin/reports/discipleship
   * Funnel counts + conversion/attrition rates.
   */
  async getDiscipleshipStats(req: Request, res: Response): Promise<void> {
    const stats = await reportService.getDiscipleshipStats(this.resolveBranchFilter(req));
    sendSuccess(res, 200, stats);
  }

  /**
   * POST /v1/admin/reports/converts/:convertId/contact
   * Log a phone call / contact with a convert.
   */
  async logContact(req: Request, res: Response): Promise<void> {
    const result = await reportService.logContact(
      req.user!,
      req.params.convertId,
      req.body.note
    );
    sendSuccess(res, 200, result);
  }

  /**
   * GET /v1/admin/reports/follow-up
   *
   * Actionable pastoral-care list: converts who have gone quiet, ranked
   * by days of silence, with their assigned mentor.
   */
  async getFollowUp(req: Request, res: Response): Promise<void> {
    const days = req.query.days ? Math.max(0, Number(req.query.days)) : undefined;
    const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : undefined;
    const list = await reportService.getFollowUpList({
      days,
      limit,
      branchId: this.resolveBranchFilter(req),
    });
    sendSuccess(res, 200, { followUp: list, total: list.length });
  }

  /**
   * POST /v1/admin/reports/converts
   *
   * Admin creates a convert directly (no OTP). A plain admin's convert always
   * lands in their own branch; a super_admin must specify branchId in the body.
   */
  async createConvert(req: Request, res: Response): Promise<void> {
    const { firstName, lastName, phone, gender, invitedBy } = req.body;
    const caller = req.user!;
    const branchId = caller.role === 'super_admin' ? req.body.branchId : caller.branchId;
    if (!branchId) {
      throw new AppError('branchId is required', 400, 'BRANCH_REQUIRED');
    }

    const convert = await reportService.createConvert({
      firstName,
      lastName,
      phone,
      branchId,
      gender,
      invitedBy,
    });

    sendSuccess(res, 201, convert);
  }

  // ════════════════════════════════════════════
  //  HELPER
  // ════════════════════════════════════════════

  /**
   * Resolve the branch to scope a read to: a plain admin is always pinned to
   * their own branch; a super_admin may optionally pass ?branchId= to filter,
   * or omit it to see every branch. Never trust a non-super-admin's query string.
   */
  private resolveBranchFilter(req: Request): string | undefined {
    const requester = req.user!;
    if (requester.role === 'super_admin') {
      const q = req.query.branchId;
      return typeof q === 'string' ? q : undefined;
    }
    return requester.branchId ?? undefined;
  }

  /**
   * Extract and normalize filter values from validated query params.
   */
  private extractFilters(req: Request): ConvertReportFilters {
    const query = req.query as Record<string, unknown>;
    const filters: ConvertReportFilters = { branchId: this.resolveBranchFilter(req) };

    if (query.stage) {
      filters.stage = query.stage as ConvertReportFilters['stage'];
    }

    if (query.search) {
      filters.search = query.search as string;
    }

    if (query.salvationDateFrom) {
      filters.salvationDateFrom = new Date(query.salvationDateFrom as string);
    }

    if (query.salvationDateTo) {
      // Set to end of day for inclusive range
      const d = new Date(query.salvationDateTo as string);
      d.setHours(23, 59, 59, 999);
      filters.salvationDateTo = d;
    }

    if (query.gender) {
      filters.gender = query.gender as 'male' | 'female';
    }

    if (query.isHolySpiritFilled !== undefined) {
      filters.isHolySpiritFilled = query.isHolySpiritFilled as boolean;
    }

    return filters;
  }
}

export const reportController = new ReportController();
