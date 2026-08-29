import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { courseApi } from '@/api/courseApi';
import { progressApi } from '@/api/progressApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/spinner';
import {
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Clock,
  HelpCircle,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LessonProgress } from '@/types/models';

const statusConfig = {
  completed: {
    label: 'Completed',
    variant: 'success' as const,
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
  in_progress: {
    label: 'In Progress',
    variant: 'warning' as const,
    icon: PlayCircle,
    iconColor: 'text-amber-500',
  },
  not_started: {
    label: 'Not Started',
    variant: 'secondary' as const,
    icon: Clock,
    iconColor: 'text-gray-400',
  },
};

export default function LessonsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const courseId = params.get('courseId') || undefined;
  const suffix = courseId ? `?courseId=${courseId}` : '';

  const { data: lessons, loading: lessonsLoading, error: lessonsError } = useAsync(
    () => courseApi.getLessons(courseId), [courseId]
  );
  const { data: progress } = useAsync(
    () => progressApi.getLessonProgress(courseId), [courseId]
  );

  const progressMap = new Map<string, LessonProgress>(
    (progress || []).map((p) => [p.lessonId, p])
  );

  if (lessonsLoading) return <PageLoader label="Loading lessons..." />;
  if (lessonsError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="mt-2 text-sm text-red-600">{lessonsError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold text-brand-800">Lessons</h1>
          <p className="text-sm text-muted-foreground">
            {lessons?.length || 0} lesson{(lessons?.length || 0) !== 1 ? 's' : ''}
            {courseId ? '' : ' in the Believers Class'}
          </p>
        </div>
        <Link to="/courses" className="shrink-0 text-xs font-medium text-brand-500 hover:underline">
          All courses
        </Link>
      </div>

      <div className="space-y-3">
        {lessons?.map((lesson, idx) => {
          const prog = progressMap.get(lesson.id);
          const status = prog?.status || 'not_started';
          const config = statusConfig[status];
          const StatusIcon = config.icon;

          return (
            <Card
              key={lesson.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-brand-200"
              onClick={() => navigate(`/lessons/${lesson.id}${suffix}`)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                {/* Lesson Number Circle */}
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                    status === 'completed' && 'bg-emerald-100 text-emerald-600',
                    status === 'in_progress' && 'bg-amber-100 text-amber-600',
                    status === 'not_started' && 'bg-gray-100 text-gray-400'
                  )}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Lesson Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {lesson.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {lesson.estimatedMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {lesson.estimatedMinutes} min
                      </span>
                    )}
                    {lesson.hasQuiz && (
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        Quiz
                        {prog?.quizPassed && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        )}
                      </span>
                    )}
                  </div>
                  {/* Quiz score indicator */}
                  {prog?.bestQuizScore !== null && prog?.bestQuizScore !== undefined && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Best score: {prog.bestQuizScore}%
                    </p>
                  )}
                </div>

                {/* Status Badge + Chevron */}
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={config.variant} className="hidden sm:inline-flex">
                    {config.label}
                  </Badge>
                  <StatusIcon className={cn('h-5 w-5 sm:hidden', config.iconColor)} />
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!lessons || lessons.length === 0) && (
        <div className="py-16 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-muted-foreground">
            No lessons have been published yet.
          </p>
        </div>
      )}
    </div>
  );
}
