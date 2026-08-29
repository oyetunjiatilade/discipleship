import { DiscipleshipStage } from '../../shared/constants/stages';

/**
 * Query filters for the convert report.
 */
export interface ConvertReportFilters {
  stage?: DiscipleshipStage;
  search?: string;              // search by name or phone
  salvationDateFrom?: Date;     // createdAt >=
  salvationDateTo?: Date;       // createdAt <=
  gender?: 'male' | 'female';
  isHolySpiritFilled?: boolean;
  /**
   * Resolved server-side by the controller from the requester's identity —
   * a plain admin's own branch, or (optionally) a super_admin's chosen branch.
   * Never trust a client-supplied value for this field.
   */
  branchId?: string;
}

/**
 * A single row in the convert report.
 *
 * Produced by the aggregation pipeline that joins
 * users → progress (aggregated completion percentage).
 */
export interface ConvertReportRow {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  branchId: string | null;
  gender: string | null;
  department?: string | null;
  departmentStatus?: string | null;
  lastContactedAt?: Date | null;
  salvationDate: Date;        // createdAt (when they registered)
  currentStage: string;
  stageLabel: string;
  isHolySpiritFilled: boolean;
  invitedBy: string | null;
  completionPercentage: number; // 0-100, rounded to 1 decimal
  completedLessons: number;
  totalLessons: number;
  lastActivityAt: Date | null;
}

/**
 * Stage-level summary statistics for the dashboard.
 */
export interface StageSummary {
  stage: string;
  label: string;
  count: number;
  percentage: number; // of total converts
}

/**
 * Full report response returned by the API.
 */
export interface ConvertReportResponse {
  converts: ConvertReportRow[];
  summary: {
    totalConverts: number;
    stageBreakdown: StageSummary[];
    averageCompletion: number; // overall average completion %
  };
}
