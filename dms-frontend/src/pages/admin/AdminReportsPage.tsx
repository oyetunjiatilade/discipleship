import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '@/api/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import {
  Users,
  UserPlus,
  CalendarDays,
  TrendingUp,
  BarChart3,
  Download,
  GraduationCap,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FunnelCounts, FunnelRates } from '@/components/DiscipleshipStats';
import { STAGE_LABELS, type DiscipleshipStage } from '@/constants/enums';
import { useState } from 'react';

const stageColors: Record<string, string> = {
  NEW_CONVERT: 'bg-sky-400',
  HOLY_SPIRIT_FILLED: 'bg-purple-400',
  IN_CLASS: 'bg-amber-400',
  CLASS_COMPLETED: 'bg-emerald-400',
  BAPTIZED: 'bg-brand-400',
  MEMBER_TRANSFERRED: 'bg-accent-400',
};

const stageBgColors: Record<string, string> = {
  NEW_CONVERT: 'bg-sky-100 text-sky-700',
  HOLY_SPIRIT_FILLED: 'bg-purple-100 text-purple-700',
  IN_CLASS: 'bg-amber-100 text-amber-700',
  CLASS_COMPLETED: 'bg-emerald-100 text-emerald-700',
  BAPTIZED: 'bg-brand-100 text-brand-700',
  MEMBER_TRANSFERRED: 'bg-accent-100 text-accent-700',
};

export default function AdminReportsPage() {
  const toast = useToast();
  const [csvLoading, setCsvLoading] = useState(false);

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useAsync(() => adminApi.getDashboardStats(), []);

  const {
    data: reportData,
    loading: reportLoading,
    error: reportError,
  } = useAsync(() => adminApi.getConvertReport({ limit: 1, page: 1 }), []);

  const { data: funnel } = useAsync(() => adminApi.getDiscipleshipStats(), []);

  const loading = statsLoading || reportLoading;
  const error = statsError || reportError;
  const summary = reportData?.data?.summary;

  const handleExportAll = async () => {
    setCsvLoading(true);
    try {
      await adminApi.downloadCsv({});
      toast.success('Exported', 'Full report downloaded.');
    } catch {
      toast.error('Export Failed', 'Could not download CSV.');
    } finally {
      setCsvLoading(false);
    }
  };

  // Find the max count for bar scaling
  const maxCount = stats?.stageBreakdown
    ? Math.max(1, ...stats.stageBreakdown.map((s) => s.count))
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-800">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Discipleship program analytics and insights.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleExportAll}
          disabled={csvLoading}
        >
          {csvLoading ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
          Export Full CSV
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="flex-1 text-sm text-red-800">{error}</p>
            <Button variant="outline" size="sm" onClick={refetchStats}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Total Converts',
            value: stats?.totalConverts,
            icon: Users,
            color: 'text-brand-500',
            bg: 'bg-brand-50',
          },
          {
            label: 'New This Week',
            value: stats?.newThisWeek,
            icon: UserPlus,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
          },
          {
            label: 'New This Month',
            value: stats?.newThisMonth,
            icon: CalendarDays,
            color: 'text-violet-500',
            bg: 'bg-violet-50',
          },
          {
            label: 'Avg. Completion',
            value: summary ? `${summary.averageCompletion}%` : undefined,
            icon: TrendingUp,
            color: 'text-accent-500',
            bg: 'bg-accent-50',
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={cn(
                  kpi.bg,
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl'
                )}
              >
                <kpi.icon className={cn(kpi.color, 'h-6 w-6')} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                {loading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="font-display text-2xl font-bold text-gray-900">
                    {kpi.value ?? '—'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Discipleship Funnel + Rates */}
      {funnel && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-brand-800">Discipleship Funnel</h2>
            <p className="text-sm text-muted-foreground">Where converts stand across the journey.</p>
          </div>
          <FunnelCounts stats={funnel} />
          <div className="pt-1">
            <h3 className="mb-2 font-display text-sm font-bold text-brand-800">Rates</h3>
            <FunnelRates stats={funnel} />
          </div>
        </div>
      )}

      {/* Stage Distribution — Horizontal Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-brand-400" />
            Stage Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats?.stageBreakdown ? (
            <div className="space-y-4">
              {stats.stageBreakdown.map((s) => {
                const label = STAGE_LABELS[s.stage as DiscipleshipStage] || s.label;
                const barWidth = (s.count / maxCount) * 100;
                return (
                  <div key={s.stage}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <Badge
                        className={cn(
                          'text-xs',
                          stageBgColors[s.stage] || 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {label}
                      </Badge>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-lg font-bold text-gray-900">
                          {s.count}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({s.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-700',
                          stageColors[s.stage] || 'bg-gray-400'
                        )}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Program Metrics */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-5 w-5 text-emerald-400" />
              Program Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total Converts</p>
                <p className="font-display text-3xl font-bold text-gray-900">
                  {summary.totalConverts}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Avg. Completion Rate</p>
                <p
                  className={cn(
                    'font-display text-3xl font-bold',
                    summary.averageCompletion >= 70
                      ? 'text-emerald-600'
                      : summary.averageCompletion >= 40
                        ? 'text-amber-600'
                        : 'text-gray-900'
                  )}
                >
                  {summary.averageCompletion}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Active Stages</p>
                <p className="font-display text-3xl font-bold text-gray-900">
                  {summary.stageBreakdown.filter((s) => s.count > 0).length}
                </p>
              </div>
            </div>

            {/* Completion Ring Visual */}
            <div className="mt-6 flex items-center justify-center">
              <div className="relative flex h-32 w-32 items-center justify-center">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 128 128">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="10"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(summary.averageCompletion / 100) * 351.86} 351.86`}
                    className={
                      summary.averageCompletion >= 70
                        ? 'text-emerald-500'
                        : summary.averageCompletion >= 40
                          ? 'text-amber-500'
                          : 'text-brand-500'
                    }
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="font-display text-2xl font-bold text-gray-900">
                    {summary.averageCompletion}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Avg. Completion</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
