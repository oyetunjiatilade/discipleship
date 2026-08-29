import { STAGE_LABELS, type DiscipleshipStage } from '@/constants/enums';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ConvertReportRow } from '@/types/models';
import type { PaginationMeta } from '@/types/api';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsersTableProps {
  converts: ConvertReportRow[];
  meta: PaginationMeta | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onManage?: (convert: ConvertReportRow) => void;
  /** id → name lookup. When provided, a Branch column is shown (super-admin views). */
  branchNames?: Record<string, string>;
}

const stageBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'info' | 'secondary'> = {
  NEW_CONVERT: 'info',
  HOLY_SPIRIT_FILLED: 'default',
  IN_CLASS: 'warning',
  CLASS_COMPLETED: 'success',
  BAPTIZED: 'success',
  MEMBER_TRANSFERRED: 'default',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function UsersTable({
  converts,
  meta,
  loading,
  page,
  onPageChange,
  onManage,
  branchNames,
}: UsersTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (converts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-12 w-12 text-gray-300" />
        <p className="mt-3 text-sm font-medium text-gray-500">
          No converts found matching your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50/80">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Phone</th>
              <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 md:table-cell">
                Salvation Date
              </th>
              <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 lg:table-cell">
                Department
              </th>
              {branchNames && (
                <th className="hidden px-4 py-3 text-left font-semibold text-gray-600 lg:table-cell">
                  Branch
                </th>
              )}
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Stage</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Completion</th>
              {onManage && <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {converts.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{c.fullName}</p>
                    {c.gender && (
                      <p className="text-xs capitalize text-muted-foreground">{c.gender}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.phone}</td>
                <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                  {formatDate(c.salvationDate)}
                </td>
                <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                  {c.department
                    ? `${c.department}${c.departmentStatus === 'interested' ? ' (joining)' : ''}`
                    : '—'}
                </td>
                {branchNames && (
                  <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                    {(c.branchId && branchNames[c.branchId]) || '—'}
                  </td>
                )}
                <td className="px-4 py-3">
                  <Badge
                    variant={stageBadgeVariant[c.currentStage] || 'secondary'}
                    className="whitespace-nowrap"
                  >
                    {c.stageLabel || STAGE_LABELS[c.currentStage as DiscipleshipStage] || c.currentStage}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="hidden w-20 sm:block">
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            c.completionPercentage >= 100
                              ? 'bg-emerald-500'
                              : c.completionPercentage >= 50
                                ? 'bg-brand-500'
                                : 'bg-amber-400'
                          )}
                          style={{ width: `${Math.min(c.completionPercentage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={cn(
                        'min-w-[3rem] text-right text-xs font-bold',
                        c.completionPercentage >= 100
                          ? 'text-emerald-600'
                          : 'text-gray-600'
                      )}
                    >
                      {c.completionPercentage}%
                    </span>
                  </div>
                </td>
                {onManage && (
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => onManage(c)}>
                      Manage
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * meta.limit + 1}–{Math.min(page * meta.limit, meta.total)} of{' '}
            {meta.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-gray-600">
              {page} / {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
