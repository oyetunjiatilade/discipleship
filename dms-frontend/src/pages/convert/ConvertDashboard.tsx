import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAsync } from '@/hooks/useAsync';
import { progressApi } from '@/api/progressApi';
import { notificationApi } from '@/api/notificationApi';
import { courseApi } from '@/api/courseApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  STAGE_ORDER,
  STAGE_LABELS,
  DiscipleshipStage,
} from '@/constants/enums';
import {
  BookOpen,
  Trophy,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Bell,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConvertDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: summary, loading: summaryLoading } = useAsync(
    () => progressApi.getSummary(), []
  );
  const { data: unread } = useAsync(
    () => notificationApi.getUnreadCount(), []
  );
  const { data: lessons, loading: lessonsLoading } = useAsync(
    () => courseApi.getLessons(), []
  );
  const { data: lessonProgress } = useAsync(
    () => progressApi.getLessonProgress(), []
  );

  const currentStage =
    (user?.currentStage as DiscipleshipStage) || DiscipleshipStage.NEW_CONVERT;
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  // Find the next lesson to work on
  const nextLesson = (() => {
    if (!lessons || !lessonProgress) return null;
    const progressMap = new Map(lessonProgress.map((p) => [p.lessonId, p]));
    const inProgress = lessons.find(
      (l) => progressMap.get(l.id)?.status === 'in_progress'
    );
    if (inProgress) return inProgress;
    return lessons.find((l) => {
      const p = progressMap.get(l.id);
      return !p || p.status === 'not_started';
    });
  })();

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-5 text-white shadow-lg shadow-brand-500/20">
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-4 -right-2 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative">
          <h1 className="font-display text-xl font-bold">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-1 text-sm text-brand-100">
            Continue your discipleship journey. Every step counts.
          </p>
          {unread !== null && unread > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 gap-2 bg-white/15 text-white hover:bg-white/25"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-3.5 w-3.5" />
              {unread} new notification{unread > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </div>

      {/* ── Stage Stepper ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Your Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-0">
            {STAGE_ORDER.map((stage, idx) => {
              const isComplete = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={stage} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full items-center">
                    {idx > 0 && (
                      <div className={cn('h-0.5 flex-1', idx <= currentIdx ? 'bg-emerald-400' : 'bg-gray-200')} />
                    )}
                    <div
                      className={cn(
                        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all',
                        isComplete && 'border-emerald-500 bg-emerald-500 text-white',
                        isCurrent && 'border-brand-500 bg-brand-50 text-brand-600 ring-4 ring-brand-100',
                        !isComplete && !isCurrent && 'border-gray-200 bg-gray-50 text-gray-400'
                      )}
                    >
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                    </div>
                    {idx < STAGE_ORDER.length - 1 && (
                      <div className={cn('h-0.5 flex-1', idx < currentIdx ? 'bg-emerald-400' : 'bg-gray-200')} />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-center text-[10px] font-medium leading-tight',
                      isCurrent ? 'text-brand-600' : isComplete ? 'text-emerald-600' : 'text-gray-400'
                    )}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: BookOpen, color: 'text-brand-400', value: summary ? `${summary.completedLessons}/${summary.totalLessons}` : '—', label: 'Lessons' },
          { icon: Trophy, color: 'text-accent-400', value: summary ? `${summary.percentComplete}%` : '—', label: 'Complete' },
          { icon: TrendingUp, color: 'text-emerald-400', value: String(summary?.inProgressLessons ?? '—'), label: 'In Progress' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col items-center p-4 text-center">
              <s.icon className={cn('h-6 w-6', s.color)} />
              {summaryLoading ? (
                <Skeleton className="mt-2 h-8 w-12" />
              ) : (
                <p className="mt-2 font-display text-2xl font-bold text-brand-800">{s.value}</p>
              )}
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      {summary && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Course Progress</span>
              <span className="font-bold text-brand-600">{summary.percentComplete}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
                style={{ width: `${summary.percentComplete}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Continue Learning ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Continue Learning</CardTitle>
        </CardHeader>
        <CardContent>
          {lessonsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : nextLesson ? (
            <button
              onClick={() => navigate(`/lessons/${nextLesson.id}`)}
              className="flex w-full items-center gap-3 rounded-lg border border-brand-100 bg-brand-50/50 p-3 text-left transition-colors hover:bg-brand-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                <Play className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand-800">{nextLesson.title}</p>
                <p className="text-xs text-muted-foreground">
                  {nextLesson.estimatedMinutes ? `${nextLesson.estimatedMinutes} min` : 'Continue lesson'}
                  {nextLesson.hasQuiz && ' · Has quiz'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-brand-400" />
            </button>
          ) : summary?.isComplete ? (
            <div className="py-6 text-center">
              <Trophy className="mx-auto h-10 w-10 text-accent-400" />
              <p className="mt-2 font-display text-lg font-bold text-brand-800">Course Complete!</p>
              <p className="text-sm text-muted-foreground">Congratulations on finishing all lessons.</p>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No lessons available yet. Check back soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
