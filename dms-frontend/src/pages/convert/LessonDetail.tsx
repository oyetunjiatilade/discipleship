import { useState, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { useAuthStore } from '@/stores/authStore';
import { courseApi } from '@/api/courseApi';
import { progressApi } from '@/api/progressApi';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner, PageLoader } from '@/components/ui/spinner';
import {
  ArrowLeft,
  PlayCircle,
  FileText,
  HelpCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  ExternalLink,
  Maximize2,
  Minimize2,
  WifiOff,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LessonReflection } from '@/components/LessonReflection';
import { Markdown } from '@/components/Markdown';
import type { LessonProgress } from '@/types/models';

export default function LessonDetail() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId') || undefined;
  const { user, setAuth } = useAuthStore();
  const toast = useToast();

  const [actionLoading, setActionLoading] = useState<'start' | 'complete' | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const lowDataMode = user?.lowDataMode ?? false;
  const [showVideo, setShowVideo] = useState(!lowDataMode);
  const [showTranscript, setShowTranscript] = useState(lowDataMode);

  const {
    data: lesson,
    loading: lessonLoading,
    error: lessonError,
  } = useAsync(() => courseApi.getLesson(lessonId!), [lessonId]);

  const {
    data: allProgress,
    loading: progressLoading,
    refetch: refetchProgress,
  } = useAsync(() => progressApi.getLessonProgress(courseId), [courseId]);

  const progress: LessonProgress | null =
    allProgress?.find((p) => p.lessonId === lessonId) || null;
  const status = progress?.status || 'not_started';

  // ── Actions ──

  const handleStart = useCallback(async () => {
    if (!lessonId) return;
    setActionLoading('start');
    try {
      const result = await progressApi.startLesson(lessonId);
      if (result.stageChanged && user) {
        setAuth({ ...user, currentStage: 'IN_CLASS' as any }, {
          accessToken: useAuthStore.getState().accessToken!,
          expiresIn: '900',
        });
      }
      await refetchProgress();
      toast.success('Lesson started!', `You're now working on "${lesson?.title}"`);
    } catch (err: any) {
      toast.error('Failed to start lesson', err?.response?.data?.error?.message);
    } finally {
      setActionLoading(null);
    }
  }, [lessonId, lesson, user, setAuth, refetchProgress, toast]);

  const handleComplete = useCallback(async () => {
    if (!lessonId) return;
    setActionLoading('complete');
    try {
      const result = await progressApi.completeLesson(lessonId);
      await refetchProgress();
      if (result.allLessonsComplete) {
        toast.success('Course Complete!', 'You have finished all lessons. Congratulations!');
      } else {
        toast.success('Lesson completed!', `Great work finishing "${lesson?.title}"`);
      }
    } catch (err: any) {
      toast.error(
        'Cannot complete lesson',
        err?.response?.data?.error?.message || 'Please try again'
      );
    } finally {
      setActionLoading(null);
    }
  }, [lessonId, lesson, refetchProgress, toast]);

  // ── Loading / Error ──

  if (lessonLoading || progressLoading) return <PageLoader label="Loading lesson..." />;
  if (lessonError || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="mt-2 text-sm text-red-600">{lessonError || 'Lesson not found'}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/lessons')}>
          Back to Lessons
        </Button>
      </div>
    );
  }

  const quizPassed = progress?.quizPassed || false;
  const canComplete = status === 'in_progress' && (!lesson.hasQuiz || quizPassed);

  // Google Docs Viewer for cross-browser PDF embedding
  const notesEmbedUrl = lesson.notesUrl
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(lesson.notesUrl)}&embedded=true`
    : null;

  return (
    <div className="space-y-4">
      {/* ── Back Nav ── */}
      <Link
        to="/lessons"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to lessons
      </Link>

      {/* ── Title + Status ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-brand-800">
            {lesson.title}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {lesson.estimatedMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {lesson.estimatedMinutes} min
              </span>
            )}
            {lesson.hasQuiz && (
              <span className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                Quiz required
              </span>
            )}
          </div>
        </div>
        <Badge
          variant={
            status === 'completed'
              ? 'success'
              : status === 'in_progress'
                ? 'warning'
                : 'secondary'
          }
        >
          {status === 'completed'
            ? 'Completed'
            : status === 'in_progress'
              ? 'In Progress'
              : 'Not Started'}
        </Badge>
      </div>

      {/* ── Video Player ── */}
      <Card className="overflow-hidden">
        {lesson.videoUrl ? (
          lowDataMode && !showVideo ? (
            <CardContent className="flex aspect-video flex-col items-center justify-center gap-3 bg-gray-900 text-center">
              <WifiOff className="h-10 w-10 text-gray-400" />
              <p className="max-w-xs text-sm text-gray-300">
                Data-saver is on — the video won't load until you tap below. You can read the transcript instead.
              </p>
              <Button size="sm" variant="secondary" className="gap-2" onClick={() => setShowVideo(true)}>
                <PlayCircle className="h-4 w-4" /> Load video
              </Button>
            </CardContent>
          ) : (
            <div className="aspect-video bg-black">
              <video
                src={lesson.videoUrl}
                controls
                className="h-full w-full"
                preload={lowDataMode ? 'none' : 'metadata'}
              >
                Your browser does not support video playback.
              </video>
            </div>
          )
        ) : (
          <CardContent className="flex aspect-video items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <PlayCircle className="h-12 w-12" />
              <p className="text-sm">No video available</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Description ── */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm leading-relaxed text-gray-700">{lesson.description}</p>
        </CardContent>
      </Card>

      {/* ── Transcript (low-data reading) ── */}
      {lesson.transcript && (
        <Card>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FileText className="h-4 w-4 text-brand-500" /> Read transcript
            </span>
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', showTranscript && 'rotate-180')} />
          </button>
          {showTranscript && (
            <CardContent className="pt-0">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{lesson.transcript}</p>
            </CardContent>
          )}
        </Card>
      )}

      {/* ═══════════════════════════════════════════
          LESSON NOTES — Full-width, tall, scrollable
         ═══════════════════════════════════════════ */}
      {lesson.notesMarkdown ? (
        <Card>
          <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3">
            <FileText className="h-5 w-5 text-brand-500" />
            <span className="text-sm font-semibold text-gray-700">Lesson Notes</span>
          </div>
          <CardContent className="p-4">
            <Markdown source={lesson.notesMarkdown} />
          </CardContent>
        </Card>
      ) : notesEmbedUrl ? (
        <Card
          className={cn(
            'overflow-hidden transition-all',
            notesExpanded && 'fixed inset-0 z-50 rounded-none'
          )}
        >
          {/* Notes Header */}
          <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-500" />
              <span className="text-sm font-semibold text-gray-800">Lesson Notes</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lesson.notesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in new tab
              </a>
              <button
                onClick={() => setNotesExpanded(!notesExpanded)}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              >
                {notesExpanded ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    Exit fullscreen
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    Fullscreen
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PDF Embed — generous height for readability, scrollable inside iframe */}
          <div
            className={cn(
              'w-full bg-white',
              notesExpanded ? 'h-[calc(100%-48px)]' : 'h-[80vh] min-h-[500px]'
            )}
          >
            <iframe
              src={notesEmbedUrl}
              className="h-full w-full border-0"
              title="Lesson Notes"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-10 text-gray-400">
            <FileText className="mr-2 h-5 w-5" />
            <span className="text-sm">No notes available for this lesson</span>
          </CardContent>
        </Card>
      )}

      {/* ── Reflect & apply ── */}
      <LessonReflection
        lessonId={lesson.id}
        memoryVerse={lesson.memoryVerse}
        actionStep={lesson.actionStep}
      />

      {/* ── Quiz Section ── */}
      {lesson.hasQuiz && (
        <Card className="overflow-hidden">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  quizPassed ? 'bg-emerald-100' : 'bg-brand-100'
                )}
              >
                {quizPassed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <HelpCircle className="h-5 w-5 text-brand-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {quizPassed ? 'Quiz Passed' : 'Lesson Quiz'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {quizPassed
                    ? `Score: ${progress?.bestQuizScore}%`
                    : status === 'not_started'
                      ? 'Start lesson to unlock quiz'
                      : 'Pass the quiz to complete this lesson'}
                </p>
              </div>
            </div>
            <Button
              variant={quizPassed ? 'outline' : 'default'}
              size="sm"
              className="gap-1.5"
              onClick={() => navigate(`/lessons/${lessonId}/quiz`)}
              disabled={status === 'not_started'}
            >
              {quizPassed ? 'Review' : 'Take Quiz'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Quiz Gate Warning ── */}
      {status === 'in_progress' && lesson.hasQuiz && !quizPassed && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4">
            <Lock className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800">Quiz Required</p>
              <p className="mt-0.5 text-xs text-amber-600">
                You must pass the quiz before you can mark this lesson as complete.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Start / Complete Button ── */}
      <div className="pb-4">
        {status === 'not_started' && (
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleStart}
            disabled={actionLoading === 'start'}
          >
            {actionLoading === 'start' ? (
              <Spinner size="sm" />
            ) : (
              <>
                <PlayCircle className="h-5 w-5" />
                Start Lesson
              </>
            )}
          </Button>
        )}

        {status === 'in_progress' && (
          <Button
            className="w-full gap-2"
            size="lg"
            variant={canComplete ? 'default' : 'outline'}
            onClick={handleComplete}
            disabled={!canComplete || actionLoading === 'complete'}
          >
            {actionLoading === 'complete' ? (
              <Spinner size="sm" />
            ) : canComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Mark as Complete
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                Complete Quiz to Finish
              </>
            )}
          </Button>
        )}

        {status === 'completed' && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            Lesson completed
          </div>
        )}
      </div>
    </div>
  );
}
