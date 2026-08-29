import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { quizApi } from '@/api/quizApi';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner, PageLoader } from '@/components/ui/spinner';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Send,
  RotateCcw,
  Trophy,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Quiz, AttemptResult, AttemptSummary } from '@/types/models';

type Phase = 'quiz' | 'result';

export default function QuizPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>('quiz');
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const {
    data: quiz,
    loading: quizLoading,
    error: quizError,
  } = useAsync(() => quizApi.getQuizForLesson(lessonId!), [lessonId]);

  const { data: attempts, refetch: refetchAttempts } = useAsync(
    () => quizApi.getAttempts(lessonId!), [lessonId]
  );

  const questions = quiz?.questions || [];
  const totalQ = questions.length;
  const allAnswered = totalQ > 0 && Object.keys(selectedAnswers).length === totalQ;

  // Check attempt limits
  const attemptsUsed = attempts?.length || 0;
  const maxAttempts = quiz?.maxAttempts || 0; // 0 = unlimited
  const attemptsExhausted = maxAttempts > 0 && attemptsUsed >= maxAttempts;
  const alreadyPassed = attempts?.some((a) => a.passed) || false;

  const handleSelectAnswer = (questionId: string, label: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: label }));
  };

  const handleSubmit = async () => {
    if (!quiz || !allAnswered) return;
    setSubmitting(true);
    try {
      const payload = {
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedLabel: selectedAnswers[q.id],
        })),
      };
      const res = await quizApi.submitQuiz(lessonId!, payload);
      setResult(res);
      setPhase('result');
      await refetchAttempts();
      if (res.passed) {
        toast.success('Quiz Passed!', `You scored ${res.score}%`);
      } else {
        toast.info('Quiz Not Passed', `You scored ${res.score}%. Need ${res.passingScore}% to pass.`);
      }
    } catch (err: any) {
      toast.error('Submission failed', err?.response?.data?.error?.message || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setPhase('quiz');
    setSelectedAnswers({});
    setCurrentQ(0);
    setResult(null);
  };

  // ── Loading / Error ──

  if (quizLoading) return <PageLoader label="Loading quiz..." />;
  if (quizError || !quiz) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="mt-2 text-sm text-red-600">{quizError || 'No quiz found for this lesson'}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/lessons/${lessonId}`)}>
          Back to Lesson
        </Button>
      </div>
    );
  }

  // ════════════════════════════════════════════
  //  RESULT PHASE
  // ════════════════════════════════════════════

  if (phase === 'result' && result) {
    return (
      <div className="space-y-4">
        <Link
          to={`/lessons/${lessonId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to lesson
        </Link>

        {/* Score Banner */}
        <Card
          className={cn(
            'border-2',
            result.passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
          )}
        >
          <CardContent className="flex flex-col items-center py-8 text-center">
            {result.passed ? (
              <Trophy className="h-14 w-14 text-emerald-500" />
            ) : (
              <XCircle className="h-14 w-14 text-red-400" />
            )}
            <p className="mt-3 font-display text-3xl font-bold">
              {result.score}%
            </p>
            <p
              className={cn(
                'mt-1 text-sm font-medium',
                result.passed ? 'text-emerald-700' : 'text-red-700'
              )}
            >
              {result.passed ? 'Quiz Passed!' : `Need ${result.passingScore}% to pass`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.correctAnswers} of {result.totalQuestions} correct · Attempt #{result.attemptNumber}
            </p>
          </CardContent>
        </Card>

        {/* Answer Review */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Answer Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, idx) => {
              const answer = result.answers.find((a) => a.questionId === q.id);
              return (
                <div key={q.id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium text-gray-800">
                    <span className="text-muted-foreground">Q{idx + 1}.</span> {q.questionText}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {q.options.map((opt) => {
                      const isSelected = answer?.selectedLabel === opt.label;
                      const isCorrect = answer?.correctLabel === opt.label;
                      return (
                        <div
                          key={opt.label}
                          className={cn(
                            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
                            isCorrect && 'bg-emerald-50 text-emerald-800 font-medium',
                            isSelected && !isCorrect && 'bg-red-50 text-red-700',
                            !isCorrect && !isSelected && 'text-gray-600'
                          )}
                        >
                          {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          {isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-400" />}
                          {!isCorrect && !isSelected && <span className="h-4 w-4" />}
                          <span className="font-mono text-xs text-gray-400">{opt.label}.</span>
                          {opt.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => navigate(`/lessons/${lessonId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lesson
          </Button>
          {!result.passed && !attemptsExhausted && (
            <Button className="flex-1 gap-2" onClick={handleRetry}>
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════
  //  QUIZ PHASE
  // ════════════════════════════════════════════

  const currentQuestion = questions[currentQ];

  return (
    <div className="space-y-4">
      <Link
        to={`/lessons/${lessonId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to lesson
      </Link>

      {/* Quiz Header */}
      <div>
        <h1 className="font-display text-lg font-bold text-brand-800">{quiz.title}</h1>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{totalQ} question{totalQ !== 1 ? 's' : ''}</span>
          <span>Pass: {quiz.passingScore}%</span>
          {maxAttempts > 0 && (
            <span>Attempts: {attemptsUsed}/{maxAttempts}</span>
          )}
        </div>
        {alreadyPassed && (
          <Badge variant="success" className="mt-2">Already passed — retaking for a higher score</Badge>
        )}
        {attemptsExhausted && !alreadyPassed && (
          <Badge variant="destructive" className="mt-2">No attempts remaining</Badge>
        )}
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${((currentQ + 1) / totalQ) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {currentQ + 1}/{totalQ}
        </span>
      </div>

      {/* Question Card */}
      {currentQuestion && !attemptsExhausted && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-gray-800">
              <span className="text-brand-500">Q{currentQ + 1}.</span>{' '}
              {currentQuestion.questionText}
            </p>

            <div className="mt-4 space-y-2">
              {currentQuestion.options.map((opt) => {
                const isSelected = selectedAnswers[currentQuestion.id] === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelectAnswer(currentQuestion.id, opt.label)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left text-sm transition-all',
                      isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        isSelected
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      {opt.label}
                    </span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation + Submit */}
      <div className="flex gap-3 pb-4">
        <Button
          variant="outline"
          size="sm"
          disabled={currentQ === 0}
          onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>

        <div className="flex-1" />

        {currentQ < totalQ - 1 ? (
          <Button
            size="sm"
            onClick={() => setCurrentQ((p) => Math.min(totalQ - 1, p + 1))}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!allAnswered || submitting || attemptsExhausted}
            className="gap-2"
          >
            {submitting ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Quiz
              </>
            )}
          </Button>
        )}
      </div>

      {/* Question Navigator Dots */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {questions.map((q, idx) => {
          const answered = !!selectedAnswers[q.id];
          return (
            <button
              key={q.id}
              onClick={() => setCurrentQ(idx)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all',
                idx === currentQ && 'ring-2 ring-brand-400 ring-offset-1',
                answered
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
