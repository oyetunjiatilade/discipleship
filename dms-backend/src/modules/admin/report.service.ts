import { PipelineStage } from 'mongoose';
import { User } from '../user/user.model';
import { Lesson } from '../course/lesson.model';
import { Course } from '../course/course.model';
import { Progress } from '../progress/progress.model';
import { Types } from 'mongoose';
import { DiscipleshipStage, STAGE_LABELS, STAGE_VALUES } from '../../shared/constants/stages';
import { Role } from '../../shared/constants/roles';
import { ContactLog } from './contact-log.model';
import { NotFoundError } from '../../shared/errors';
import { assertBranchAccess } from '../../shared/access/branch-scope';
import {
  ConvertReportFilters,
  ConvertReportRow,
  ConvertReportResponse,
  StageSummary,
} from './report.types';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';
import { PaginationMeta } from '../../shared/types/express.d';

class ReportService {
  // ════════════════════════════════════════════
  //  CONVERT REPORT (paginated JSON)
  // ════════════════════════════════════════════

  /**
   * Fetch converts with completion percentage via aggregation pipeline.
   *
   * Pipeline flow:
   * 1. Match active converts with optional filters
   * 2. $lookup progress records grouped by status
   * 3. Calculate completion percentage from completed / total published
   * 4. Project final report fields
   * 5. Sort + paginate
   *
   * Returns paginated rows + summary statistics.
   */
  async getConvertReport(
    filters: ConvertReportFilters,
    pagination: { page?: string | number; limit?: string | number; sort?: string }
  ): Promise<{
    data: ConvertReportResponse;
    meta: PaginationMeta;
  }> {
    const { skip, limit, page } = parsePagination(pagination);

    // ── Get total published lessons for percentage calculation ──
    const totalPublishedLessons = await this.getTotalPublishedLessons();

    // ── Build match stage ──
    const matchStage = this.buildMatchStage(filters);

    // ── Count total (before pagination) ──
    const countResult = await User.aggregate([
      { $match: matchStage },
      { $count: 'total' },
    ]);
    const total = countResult[0]?.total || 0;

    // ── Main aggregation pipeline ──
    const pipeline: PipelineStage[] = [
      { $match: matchStage },

      // ── Join progress: count completed lessons per convert ──
      {
        $lookup: {
          from: 'progresses',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$userId'] },
                status: 'completed',
              },
            },
            { $count: 'completed' },
          ],
          as: '_progressStats',
        },
      },

      // ── Join progress: find last activity ──
      {
        $lookup: {
          from: 'progresses',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$userId'] },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
            { $project: { updatedAt: 1 } },
          ],
          as: '_lastActivity',
        },
      },

      // ── Calculate fields ──
      {
        $addFields: {
          _completedCount: {
            $ifNull: [
              { $arrayElemAt: ['$_progressStats.completed', 0] },
              0,
            ],
          },
          _lastActivityAt: {
            $ifNull: [
              { $arrayElemAt: ['$_lastActivity.updatedAt', 0] },
              null,
            ],
          },
        },
      },

      // ── Project final shape ──
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          fullName: { $concat: ['$firstName', ' ', '$lastName'] },
          phone: 1,
          branchId: { $ifNull: ['$branchId', null] },
          gender: { $ifNull: ['$gender', null] },
          department: { $ifNull: ['$department', null] },
          departmentStatus: { $ifNull: ['$departmentStatus', null] },
          lastContactedAt: { $ifNull: ['$lastContactedAt', null] },
          salvationDate: '$createdAt',
          currentStage: 1,
          isHolySpiritFilled: { $ifNull: ['$isHolySpiritFilled', false] },
          invitedBy: { $ifNull: ['$invitedBy', null] },
          completedLessons: '$_completedCount',
          totalLessons: { $literal: totalPublishedLessons },
          completionPercentage: {
            $cond: {
              if: { $eq: [totalPublishedLessons, 0] },
              then: 0,
              else: {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$_completedCount', totalPublishedLessons] },
                      100,
                    ],
                  },
                  1,
                ],
              },
            },
          },
          lastActivityAt: '$_lastActivityAt',
        },
      },

      // ── Sort (default: newest first) ──
      { $sort: { salvationDate: -1 } },

      // ── Paginate ──
      { $skip: skip },
      { $limit: limit },
    ];

    const rawRows = await User.aggregate(pipeline);

    // ── Map to typed rows ──
    const converts: ConvertReportRow[] = rawRows.map((r) => ({
      id: r._id.toString(),
      fullName: r.fullName,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      branchId: r.branchId ? r.branchId.toString() : null,
      gender: r.gender,
      department: r.department,
      departmentStatus: r.departmentStatus,
      lastContactedAt: r.lastContactedAt,
      salvationDate: r.salvationDate,
      currentStage: r.currentStage,
      stageLabel: STAGE_LABELS[r.currentStage as DiscipleshipStage] || r.currentStage,
      isHolySpiritFilled: r.isHolySpiritFilled,
      invitedBy: r.invitedBy,
      completionPercentage: r.completionPercentage,
      completedLessons: r.completedLessons,
      totalLessons: r.totalLessons,
      lastActivityAt: r.lastActivityAt,
    }));

    // ── Summary statistics ──
    const summary = await this.buildSummary(matchStage, totalPublishedLessons);

    return {
      data: { converts, summary },
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  // ════════════════════════════════════════════
  //  CSV EXPORT (all matching, no pagination)
  // ════════════════════════════════════════════

  /**
   * Generate a CSV string for all converts matching the filters.
   *
   * No pagination — exports the full filtered dataset.
   * Streams would be better for very large datasets, but for a
   * church ministry with hundreds/thousands of converts,
   * in-memory generation is fine.
   */
  async generateCsv(filters: ConvertReportFilters): Promise<string> {
    const totalPublishedLessons = await this.getTotalPublishedLessons();
    const matchStage = this.buildMatchStage(filters);

    // ── Pipeline (same as report but NO pagination) ──
    const pipeline: PipelineStage[] = [
      { $match: matchStage },

      {
        $lookup: {
          from: 'progresses',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$userId', '$$userId'] },
                status: 'completed',
              },
            },
            { $count: 'completed' },
          ],
          as: '_progressStats',
        },
      },

      {
        $addFields: {
          _completedCount: {
            $ifNull: [
              { $arrayElemAt: ['$_progressStats.completed', 0] },
              0,
            ],
          },
        },
      },

      {
        $project: {
          firstName: 1,
          lastName: 1,
          fullName: { $concat: ['$firstName', ' ', '$lastName'] },
          phone: 1,
          gender: { $ifNull: ['$gender', ''] },
          department: { $ifNull: ['$department', ''] },
          lastContactedAt: { $ifNull: ['$lastContactedAt', null] },
          salvationDate: '$createdAt',
          currentStage: 1,
          isHolySpiritFilled: { $ifNull: ['$isHolySpiritFilled', false] },
          invitedBy: { $ifNull: ['$invitedBy', ''] },
          completedLessons: '$_completedCount',
          totalLessons: { $literal: totalPublishedLessons },
          completionPercentage: {
            $cond: {
              if: { $eq: [totalPublishedLessons, 0] },
              then: 0,
              else: {
                $round: [
                  {
                    $multiply: [
                      { $divide: ['$_completedCount', totalPublishedLessons] },
                      100,
                    ],
                  },
                  1,
                ],
              },
            },
          },
        },
      },

      { $sort: { salvationDate: -1 } },
    ];

    const rows = await User.aggregate(pipeline);

    // ── Build CSV ──
    const headers = [
      'Full Name',
      'First Name',
      'Last Name',
      'Phone',
      'Gender',
      'Department',
      'Last Contacted',
      'Salvation Date',
      'Current Stage',
      'Holy Spirit Filled',
      'Invited By',
      'Completed Lessons',
      'Total Lessons',
      'Completion %',
    ];

    const csvLines: string[] = [headers.join(',')];

    for (const row of rows) {
      const stage = STAGE_LABELS[row.currentStage as DiscipleshipStage] || row.currentStage;
      const salvationDate = row.salvationDate
        ? new Date(row.salvationDate).toISOString().split('T')[0]
        : '';

      const values = [
        this.escapeCsvField(row.fullName),
        this.escapeCsvField(row.firstName),
        this.escapeCsvField(row.lastName),
        this.escapeCsvField(row.phone),
        row.gender || '',
        this.escapeCsvField(row.department || ''),
        row.lastContactedAt ? new Date(row.lastContactedAt).toISOString().split('T')[0] : '',
        salvationDate,
        stage,
        row.isHolySpiritFilled ? 'Yes' : 'No',
        this.escapeCsvField(row.invitedBy || ''),
        String(row.completedLessons),
        String(row.totalLessons),
        String(row.completionPercentage),
      ];

      csvLines.push(values.join(','));
    }

    // ── Program-wide discipleship summary at the top of the sheet (same branch scope as the export) ──
    const stats = await this.getDiscipleshipStats(filters.branchId);
    const preamble: string[] = [
      'DISCIPLESHIP SUMMARY',
      `Total Converts,${stats.counts.total}`,
      `Contacted / Reached,${stats.counts.contacted}`,
      `Contacted This Week,${stats.counts.contactedThisWeek}`,
      `Attended Class,${stats.counts.attended}`,
      `Completed Class,${stats.counts.completed}`,
      `Baptized,${stats.counts.baptized}`,
      `Integrated / Transferred,${stats.counts.integrated}`,
      `Outstanding,${stats.counts.outstanding}`,
      '',
      'RATES (%)',
      `Class Attendance Rate,${stats.rates.classAttendance}`,
      `Class Completion Rate,${stats.rates.classCompletion}`,
      `Baptism Rate,${stats.rates.baptism}`,
      `Attrition Rate,${stats.rates.attrition}`,
      `Overall Discipleship Rate,${stats.rates.overall}`,
      '',
      'CONVERTS',
    ];

    return [...preamble, ...csvLines].join('\n');
  }

  // ════════════════════════════════════════════
  //  DASHBOARD STATISTICS
  // ════════════════════════════════════════════

  /**
   * Quick dashboard stats — no joins, just convert counts by stage.
   */
  async getDashboardStats(branchId?: string): Promise<{
    totalConverts: number;
    stageBreakdown: StageSummary[];
    newThisWeek: number;
    newThisMonth: number;
  }> {
    const baseMatch: Record<string, unknown> = { role: Role.CONVERT, isActive: true };
    if (branchId) baseMatch.branchId = new Types.ObjectId(branchId);

    // ── Stage breakdown ──
    const stageAgg = await User.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: '$currentStage',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalConverts = stageAgg.reduce((sum, s) => sum + s.count, 0);

    const stageBreakdown: StageSummary[] = STAGE_VALUES.map((stage) => {
      const found = stageAgg.find((s) => s._id === stage);
      const count = found?.count || 0;
      return {
        stage,
        label: STAGE_LABELS[stage as DiscipleshipStage] || stage,
        count,
        percentage: totalConverts > 0
          ? Math.round((count / totalConverts) * 1000) / 10
          : 0,
      };
    });

    // ── Time-based counts ──
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [newThisWeek, newThisMonth] = await Promise.all([
      User.countDocuments({ ...baseMatch, createdAt: { $gte: startOfWeek } }),
      User.countDocuments({ ...baseMatch, createdAt: { $gte: startOfMonth } }),
    ]);

    return { totalConverts, stageBreakdown, newThisWeek, newThisMonth };
  }

  // ════════════════════════════════════════════
  //  FOLLOW-UP LIST (pastoral care)
  // ════════════════════════════════════════════

  /**
   * "Who needs follow-up" — the actionable list that replaces vanity metrics.
   *
   * Returns converts still working through the class, ranked by how long
   * they've been silent (longest first), enriched with their assigned mentor.
   */
  async getFollowUpList(
    options: { days?: number; limit?: number; branchId?: string } = {}
  ): Promise<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      phone: string;
      currentStage: DiscipleshipStage;
      stageLabel: string;
      mentorId: string | null;
      mentorName: string | null;
      completedLessons: number;
      lastActivityAt: Date | null;
      daysInactive: number | null;
      reason: string;
    }>
  > {
    const minDays = options.days ?? 5;
    const limit = Math.min(options.limit ?? 50, 200);
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const converts = await User.find({
      role: Role.CONVERT,
      isActive: true,
      ...(options.branchId ? { branchId: new Types.ObjectId(options.branchId) } : {}),
      currentStage: {
        $in: [
          DiscipleshipStage.NEW_CONVERT,
          DiscipleshipStage.HOLY_SPIRIT_FILLED,
          DiscipleshipStage.IN_CLASS,
        ],
      },
    }).select('_id firstName lastName phone currentStage mentorId lastLoginAt createdAt');

    if (converts.length === 0) return [];

    const ids = converts.map((c) => c._id);

    // Last activity + completed lesson count per convert (single pass each).
    const [activity, completed] = await Promise.all([
      Progress.aggregate<{ _id: Types.ObjectId; last: Date }>([
        { $match: { userId: { $in: ids } } },
        { $group: { _id: '$userId', last: { $max: '$updatedAt' } } },
      ]),
      Progress.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { userId: { $in: ids }, status: 'completed' } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]),
    ]);
    const lastMap = new Map(activity.map((a) => [a._id.toString(), a.last]));
    const doneMap = new Map(completed.map((c) => [c._id.toString(), c.count]));

    // Resolve mentor names in one query.
    const mentorIds = [
      ...new Set(converts.filter((c) => c.mentorId).map((c) => c.mentorId!.toString())),
    ];
    const mentors = await User.find({ _id: { $in: mentorIds } }).select('firstName lastName');
    const mentorMap = new Map(
      mentors.map((m) => [m._id.toString(), `${m.firstName} ${m.lastName}`])
    );

    const rows = converts.map((c) => {
      const lastActivityAt = lastMap.get(c._id.toString()) || c.lastLoginAt || c.createdAt || null;
      const daysInactive = lastActivityAt
        ? Math.floor((now - lastActivityAt.getTime()) / DAY)
        : null;
      const completedLessons = doneMap.get(c._id.toString()) ?? 0;
      const stage = c.currentStage as DiscipleshipStage;

      let reason: string;
      if (completedLessons === 0) {
        reason = 'Has not started any lesson';
      } else if (stage === DiscipleshipStage.IN_CLASS) {
        reason = 'Started but stalled mid-class';
      } else {
        reason = 'Inactive';
      }

      return {
        id: c._id.toString(),
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        currentStage: stage,
        stageLabel: STAGE_LABELS[stage] || stage,
        mentorId: c.mentorId ? c.mentorId.toString() : null,
        mentorName: c.mentorId ? mentorMap.get(c.mentorId.toString()) ?? null : null,
        completedLessons,
        lastActivityAt,
        daysInactive,
        reason,
      };
    });

    return rows
      .filter((r) => r.daysInactive === null || r.daysInactive >= minDays)
      .sort((a, b) => (b.daysInactive ?? 1e9) - (a.daysInactive ?? 1e9))
      .slice(0, limit);
  }

  // ════════════════════════════════════════════
  //  DISCIPLESHIP FUNNEL METRICS
  // ════════════════════════════════════════════

  /**
   * The discipleship funnel: counts at each stage of the journey plus the
   * conversion/attrition rates leadership cares about.
   *
   * Stage semantics (cumulative — a later stage implies the earlier ones):
   *   attended   = reached IN_CLASS or beyond (started the class)
   *   completed  = CLASS_COMPLETED or beyond
   *   baptized   = BAPTIZED or beyond
   *   integrated = MEMBER_TRANSFERRED
   */
  async getDiscipleshipStats(branchId?: string): Promise<{
    counts: {
      total: number;
      contacted: number;
      contactedThisWeek: number;
      attended: number;
      completed: number;
      baptized: number;
      integrated: number;
      outstanding: number;
    };
    rates: {
      classAttendance: number;
      classCompletion: number;
      baptism: number;
      attrition: number;
      overall: number;
    };
  }> {
    const base: Record<string, unknown> = { role: Role.CONVERT, isActive: true };
    if (branchId) base.branchId = new Types.ObjectId(branchId);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [total, stageAgg, contacted, contactedThisWeek] = await Promise.all([
      User.countDocuments(base),
      User.aggregate<{ _id: string; count: number }>([
        { $match: base },
        { $group: { _id: '$currentStage', count: { $sum: 1 } } },
      ]),
      User.countDocuments({ ...base, lastContactedAt: { $ne: null } }),
      User.countDocuments({ ...base, lastContactedAt: { $gte: startOfWeek } }),
    ]);

    const byStage = (st: DiscipleshipStage): number =>
      stageAgg.find((s) => s._id === st)?.count || 0;

    const inClass = byStage(DiscipleshipStage.IN_CLASS);
    const classCompleted = byStage(DiscipleshipStage.CLASS_COMPLETED);
    const baptizedStage = byStage(DiscipleshipStage.BAPTIZED);
    const transferred = byStage(DiscipleshipStage.MEMBER_TRANSFERRED);

    const attended = inClass + classCompleted + baptizedStage + transferred;
    const completed = classCompleted + baptizedStage + transferred;
    const baptized = baptizedStage + transferred;
    const integrated = transferred;
    const outstanding = total - integrated;

    const pct = (num: number, den: number): number =>
      den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

    return {
      counts: { total, contacted, contactedThisWeek, attended, completed, baptized, integrated, outstanding },
      rates: {
        classAttendance: pct(attended, total),
        classCompletion: pct(completed, attended),
        baptism: pct(baptized, completed),
        attrition: pct(total - integrated, total),
        overall: pct(integrated, total),
      },
    };
  }

  /**
   * Log a phone call / contact with a convert. Updates lastContactedAt and
   * writes a history entry.
   */
  async logContact(
    requester: { userId: string; role: string; branchId: string | null },
    convertId: string,
    note?: string
  ): Promise<{ lastContactedAt: Date }> {
    const convert = await User.findOne({ _id: convertId, role: Role.CONVERT, isActive: true });
    if (!convert) throw new NotFoundError('Convert', convertId);
    assertBranchAccess(requester, convert.branchId?.toString());

    const now = new Date();
    convert.lastContactedAt = now;
    await convert.save();

    await ContactLog.create({
      convertId: convert._id,
      branchId: convert.branchId,
      contactedBy: new Types.ObjectId(requester.userId),
      note: note?.trim() || null,
      calledAt: now,
    });

    return { lastContactedAt: now };
  }

  // ════════════════════════════════════════════
  //  INTERNAL HELPERS
  // ════════════════════════════════════════════

  /**
   * Build the $match stage from filters.
   */
  private buildMatchStage(filters: ConvertReportFilters): Record<string, unknown> {
    const match: Record<string, unknown> = {
      role: Role.CONVERT,
      isActive: true,
    };

    if (filters.branchId) {
      // Aggregation $match does not auto-cast strings to ObjectId — cast explicitly.
      match.branchId = new Types.ObjectId(filters.branchId);
    }

    if (filters.stage) {
      match.currentStage = filters.stage;
    }

    if (filters.gender) {
      match.gender = filters.gender;
    }

    if (filters.isHolySpiritFilled !== undefined) {
      match.isHolySpiritFilled = filters.isHolySpiritFilled;
    }

    // Date range on createdAt (salvation date)
    if (filters.salvationDateFrom || filters.salvationDateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filters.salvationDateFrom) dateFilter.$gte = filters.salvationDateFrom;
      if (filters.salvationDateTo) dateFilter.$lte = filters.salvationDateTo;
      match.createdAt = dateFilter;
    }

    // Text search on name or phone
    if (filters.search) {
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.$or = [
        { firstName: { $regex: escaped, $options: 'i' } },
        { lastName: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    return match;
  }

  /**
   * Build summary statistics for the given match criteria.
   */
  private async buildSummary(
    matchStage: Record<string, unknown>,
    totalPublishedLessons: number
  ): Promise<ConvertReportResponse['summary']> {
    // Stage breakdown (within the current filter set)
    const stageAgg = await User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$currentStage',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalConverts = stageAgg.reduce((sum, s) => sum + s.count, 0);

    const stageBreakdown: StageSummary[] = STAGE_VALUES.map((stage) => {
      const found = stageAgg.find((s) => s._id === stage);
      const count = found?.count || 0;
      return {
        stage,
        label: STAGE_LABELS[stage as DiscipleshipStage] || stage,
        count,
        percentage: totalConverts > 0
          ? Math.round((count / totalConverts) * 1000) / 10
          : 0,
      };
    });

    // Average completion % across all matched converts
    let averageCompletion = 0;
    if (totalConverts > 0 && totalPublishedLessons > 0) {
      const avgAgg = await User.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'progresses',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$userId', '$$userId'] },
                  status: 'completed',
                },
              },
              { $count: 'completed' },
            ],
            as: '_progressStats',
          },
        },
        {
          $addFields: {
            _completionPct: {
              $multiply: [
                {
                  $divide: [
                    {
                      $ifNull: [
                        { $arrayElemAt: ['$_progressStats.completed', 0] },
                        0,
                      ],
                    },
                    totalPublishedLessons,
                  ],
                },
                100,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgCompletion: { $avg: '$_completionPct' },
          },
        },
      ]);

      averageCompletion = avgAgg[0]?.avgCompletion
        ? Math.round(avgAgg[0].avgCompletion * 10) / 10
        : 0;
    }

    return { totalConverts, stageBreakdown, averageCompletion };
  }

  /**
   * Get total published, non-deleted lessons for the active course.
   */
  private async getTotalPublishedLessons(): Promise<number> {
    const course = await Course.findOne({ isActive: true });
    if (!course) return 0;

    return Lesson.countDocuments({
      courseId: course._id,
      isPublished: true,
      isDeleted: false,
    });
  }

  /**
   * Escape a CSV field value — wraps in quotes if it contains
   * commas, quotes, or newlines. Double-quotes internal quotes.
   */
  private escapeCsvField(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // ════════════════════════════════════════════
  //  ADMIN — Create Convert (bypass OTP)
  // ════════════════════════════════════════════

  /**
   * Create a convert directly (admin action, no OTP required).
   * Reuses same User model and validation as auth.register.
   */
  async createConvert(input: {
    firstName: string;
    lastName: string;
    phone: string;
    branchId: string;
    gender?: 'male' | 'female';
    invitedBy?: string;
  }): Promise<ConvertReportRow> {
    const { normalizePhone } = await import('../../shared/utils/phoneNormalizer');
    const phone = normalizePhone(input.phone);

    // Check for existing active convert with same phone
    const existing = await User.findOne({
      phone,
      role: Role.CONVERT,
      isActive: true,
    });

    if (existing) {
      const { ConflictError } = await import('../../shared/errors');
      throw new ConflictError('A convert with this phone number already exists');
    }

    const user = await User.create({
      role: Role.CONVERT,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone,
      branchId: input.branchId,
      gender: input.gender || null,
      invitedBy: input.invitedBy?.trim() || null,
      currentStage: DiscipleshipStage.NEW_CONVERT,
      stageUpdatedAt: new Date(),
      isHolySpiritFilled: false,
    });

    // Return as ConvertReportRow for frontend consistency
    return {
      id: user._id.toString(),
      fullName: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      branchId: user.branchId ? user.branchId.toString() : null,
      gender: user.gender || null,
      salvationDate: user.createdAt,
      currentStage: user.currentStage || DiscipleshipStage.NEW_CONVERT,
      stageLabel: STAGE_LABELS[user.currentStage as DiscipleshipStage] || 'New Convert',
      isHolySpiritFilled: user.isHolySpiritFilled || false,
      invitedBy: user.invitedBy || null,
      completionPercentage: 0,
      completedLessons: 0,
      totalLessons: await this.getTotalPublishedLessons(),
      lastActivityAt: null,
    };
  }
}

export const reportService = new ReportService();
