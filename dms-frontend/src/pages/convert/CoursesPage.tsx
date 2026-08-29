import { useNavigate } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { courseApi } from '@/api/courseApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/spinner';
import { BookOpen, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CoursesPage() {
  const navigate = useNavigate();
  const { data: courses, loading, error } = useAsync(() => courseApi.getCourses());

  if (loading) return <PageLoader label="Loading courses..." />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-brand-800">Courses</h1>
        <p className="text-sm text-muted-foreground">Your discipleship courses and their progress.</p>
      </div>

      <div className="space-y-3">
        {(courses || []).map((c) => {
          const done = c.isComplete;
          return (
            <Card
              key={c.id}
              className="cursor-pointer transition-all hover:border-brand-200 hover:shadow-md"
              onClick={() => navigate(c.isPrimary ? '/lessons' : `/lessons?courseId=${c.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', done ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600')}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-gray-900">{c.title}</p>
                      {c.isPrimary && <Badge variant="info">Core</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.completedLessons}/{c.totalLessons} lessons</span>
                    <span className="font-semibold">{c.percentComplete}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className={cn('h-full rounded-full', done ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${Math.min(c.percentComplete, 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(!courses || courses.length === 0) && (
          <div className="py-16 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-muted-foreground">No courses available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
