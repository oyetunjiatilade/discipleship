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
  Check,
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
      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent-400 via-flame-orange to-flame-red" aria-hidden />
        <div className="relative">
          <h1 className="font-display text-xl font-bold text-black">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Continue your discipleship journey. Every step counts.
          </p>
          {unread !== null && unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
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
                      <div className={cn('h-0.5 flex-1', idx <= currentIdx ? 'bg-brand-400' : 'bg-gray-200')} />
                    )}
                    {/* Guide milestone tracker: done = filled flame node + check, current = hollow
                        flame ring, upcoming = neutral. Fill uses ember so the white check stays legible. */}
                    <div
                      className={cn(
                        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums transition-all',
                        isComplete && 'border-brand-500 bg-brand-500 text-white',
                        isCurrent && 'border-brand-400 bg-white text-brand-500',
                        !isComplete && !isCurrent && 'border-gray-200 bg-gray-200 text-gray-500'
                      )}
                    >
                      {isComplete ? <Check className="h-4 w-4" strokeWidth={3} /> : idx + 1}
                    </div>
                    {idx < STAGE_ORDER.length - 1 && (
                      <div className={cn('h-0.5 flex-1', idx < currentIdx ? 'bg-brand-400' : 'bg-gray-200')} />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-center text-[10px] leading-tight',
                      isCurrent ? 'font-semibold text-black' : isComplete ? 'font-medium text-gray-900' : 'font-medium text-gray-500'
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
          { icon: TrendingUp, color: 'text-green-400', value: String(summary?.inProgressLessons ?? '—'), label: 'In Progress' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col items-center p-4 text-center">
              <s.icon className={cn('h-6 w-6', s.color)} />
              {summaryLoading ? (
                <Skeleton className="mt-2 h-8 w-12" />
              ) : (
                <p className="mt-2 font-display text-2xl font-bold text-black">{s.value}</p>
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
                className="h-full rounded-full bg-brand-400 transition-all duration-700"
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
                <p className="truncate text-sm font-semibold text-gray-900">{nextLesson.title}</p>
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
              <p className="mt-2 font-display text-lg font-bold text-black">Course Complete!</p>
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
