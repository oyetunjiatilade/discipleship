import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '@/api/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  CalendarDays,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_LABELS, type DiscipleshipStage } from '@/constants/enums';

const stageColors: Record<string, string> = {
  NEW_CONVERT: 'bg-sky-100 text-sky-700',
  HOLY_SPIRIT_FILLED: 'bg-purple-100 text-purple-700',
  IN_CLASS: 'bg-amber-100 text-amber-700',
  CLASS_COMPLETED: 'bg-emerald-100 text-emerald-700',
  BAPTIZED: 'bg-brand-100 text-brand-700',
  MEMBER_TRANSFERRED: 'bg-accent-100 text-accent-700',
};

const stageBarColors: Record<string, string> = {
  NEW_CONVERT: 'bg-sky-400',
  HOLY_SPIRIT_FILLED: 'bg-purple-400',
  IN_CLASS: 'bg-amber-400',
  CLASS_COMPLETED: 'bg-emerald-400',
  BAPTIZED: 'bg-brand-400',
  MEMBER_TRANSFERRED: 'bg-accent-400',
};

export default function AdminDashboard() {
  const { data: stats, loading, error } = useAsync(
    () => adminApi.getDashboardStats(), []
  );

  // Also fetch a quick summary from convert report
  const { data: reportData } = useAsync(
    () => adminApi.getConvertReport({ limit: 5, page: 1 }), []
  );

  const statCards = [
    {
      label: 'Total Converts',
      value: stats?.totalConverts ?? '—',
      icon: Users,
      color: 'text-brand-500',
      bg: 'bg-brand-50',
    },
    {
      label: 'New This Week',
      value: stats?.newThisWeek ?? '—',
      icon: UserPlus,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      label: 'New This Month',
      value: stats?.newThisMonth ?? '—',
      icon: CalendarDays,
      color: 'text-violet-500',
      bg: 'bg-violet-50',
    },
    {
      label: 'Avg. Completion',
      value: reportData ? `${reportData.data.summary.averageCompletion}%` : '—',
      icon: TrendingUp,
      color: 'text-accent-500',
      bg: 'bg-accent-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-800">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your discipleship program.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={cn(
                  s.bg,
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl'
                )}
              >
                <s.icon className={cn(s.color, 'h-6 w-6')} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                {loading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="font-display text-2xl font-bold text-gray-900">{s.value}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5 text-brand-400" />
            Stage Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : stats?.stageBreakdown ? (
            <div className="space-y-3">
              {stats.stageBreakdown.map((s) => {
                const label =
                  STAGE_LABELS[s.stage as DiscipleshipStage] || s.label || s.stage;
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        'w-36 justify-center text-xs',
                        stageColors[s.stage] || 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {label}
                    </Badge>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            stageBarColors[s.stage] || 'bg-gray-400'
                          )}
                          style={{ width: `${Math.max(s.percentage, 1)}%` }}
                        />
                      </div>
                    </div>
                    <span className="min-w-[3rem] text-right text-sm font-bold text-gray-700">
                      {s.count}
                    </span>
                    <span className="min-w-[3rem] text-right text-xs text-muted-foreground">
                      {s.percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Recent Converts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Converts</CardTitle>
        </CardHeader>
        <CardContent>
          {reportData && reportData.data.converts.length > 0 ? (
            <div className="space-y-2">
              {reportData.data.converts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.fullName}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={cn(
                        'text-[10px]',
                        stageColors[c.currentStage] || 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {c.stageLabel}
                    </Badge>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.completionPercentage}% complete
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No converts yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
