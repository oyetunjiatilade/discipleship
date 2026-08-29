import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminApi } from '@/api/adminApi';
import type { QuizAdminView } from '@/types/models';
import type { QuestionInput, CreateQuizPayload, UpdateQuizPayload } from '@/api/adminApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner, PageLoader } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  GripVertical,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Default empty question ──
function emptyQuestion(sortOrder: number): QuestionInput {
  return {
    questionText: '',
    options: [
      { label: 'A', text: '' },
      { label: 'B', text: '' },
    ],
    correctLabel: 'A',
    sortOrder,
  };
}

export default function QuizManagement() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing quiz (null = create mode)
  const [quiz, setQuiz] = useState<QuizAdminView | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [questions, setQuestions] = useState<QuestionInput[]>([emptyQuestion(1)]);

  // ── Load existing quiz ──
  const loadQuiz = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setError(null);
    try {
      const existing = await adminApi.getQuizForLesson(lessonId);
      if (existing) {
        setQuiz(existing);
        setTitle(existing.title);
        setDescription(existing.description || '');
        setPassingScore(existing.passingScore);
        setMaxAttempts(existing.maxAttempts);
        setQuestions(
          existing.questions.map((q) => ({
            questionText: q.questionText,
            options: q.options.map((o) => ({ label: o.label, text: o.text })),
            correctLabel: q.correctLabel,
            sortOrder: q.sortOrder,
          }))
        );
      }
    } catch {
      // 404 means no quiz yet — that's fine
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  // ── Question Helpers ──
  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length + 1)]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.map((q, i) => ({ ...q, sortOrder: i + 1 }));
    });
  };

  const updateQuestion = (idx: number, field: keyof QuestionInput, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const nextLabel = String.fromCharCode(65 + q.options.length); // A, B, C...
        return { ...q, options: [...q.options, { label: nextLabel, text: '' }] };
      })
    );
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = q.options.filter((_, j) => j !== oIdx)
          .map((o, j) => ({ ...o, label: String.fromCharCode(65 + j) }));
        const correctStillValid = newOpts.some((o) => o.label === q.correctLabel);
        return {
          ...q,
          options: newOpts,
          correctLabel: correctStillValid ? q.correctLabel : newOpts[0]?.label || 'A',
        };
      })
    );
  };

  const updateOptionText = (qIdx: number, oIdx: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = q.options.map((o, j) => (j === oIdx ? { ...o, text } : o));
        return { ...q, options: newOpts };
      })
    );
  };

  // ── Validation ──
  const validate = (): string | null => {
    if (!title.trim() || title.trim().length < 2) return 'Quiz title must be at least 2 characters.';
    if (questions.length === 0) return 'Add at least one question.';
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim() || q.questionText.trim().length < 5)
        return `Question ${i + 1}: text must be at least 5 characters.`;
      if (q.options.length < 2) return `Question ${i + 1}: need at least 2 options.`;
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) return `Question ${i + 1}, Option ${q.options[j].label}: text is empty.`;
      }
      if (!q.options.some((o) => o.label === q.correctLabel))
        return `Question ${i + 1}: correct answer label "${q.correctLabel}" doesn't match any option.`;
    }
    return null;
  };

  // ── Save (Create or Update) ──
  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast.error('Validation Error', err);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (quiz) {
        // Update
        const payload: UpdateQuizPayload = {
          title: title.trim(),
          description: description.trim() || undefined,
          questions,
          passingScore,
          maxAttempts,
        };
        const updated = await adminApi.updateQuiz(quiz.id, payload);
        setQuiz(updated);
        toast.success('Quiz Updated', 'Changes saved successfully.');
      } else {
        // Create
        const payload: CreateQuizPayload = {
          lessonId: lessonId!,
          title: title.trim(),
          description: description.trim() || undefined,
          questions,
          passingScore,
          maxAttempts,
        };
        const created = await adminApi.createQuiz(payload);
        setQuiz(created);
        toast.success('Quiz Created', `"${created.title}" is now live.`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to save quiz.';
      setError(msg);
      toast.error('Save Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!quiz || !confirm('Delete this quiz? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await adminApi.deleteQuiz(quiz.id);
      toast.success('Quiz Deleted', 'Quiz has been removed from this lesson.');
      setQuiz(null);
      setTitle('');
      setDescription('');
      setPassingScore(70);
      setMaxAttempts(0);
      setQuestions([emptyQuestion(1)]);
    } catch (err: any) {
      toast.error('Delete Failed', err?.response?.data?.error?.message || 'Could not delete.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader label="Loading quiz..." />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin/lessons"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-500"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Lessons
          </Link>
          <h1 className="font-display text-2xl font-bold text-brand-800">
            {quiz ? 'Edit Quiz' : 'Create Quiz'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Lesson ID: <code className="rounded bg-gray-100 px-1 text-xs">{lessonId}</code>
          </p>
        </div>
        {quiz && (
          <Badge variant={quiz.isActive ? 'success' : 'secondary'}>
            {quiz.isActive ? 'Active' : 'Inactive'}
          </Badge>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Quiz Settings ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="quiz-title">Title *</Label>
            <Input
              id="quiz-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lesson 1 Quiz"
              maxLength={300}
            />
          </div>
          <div>
            <Label htmlFor="quiz-desc">Description (optional)</Label>
            <textarea
              id="quiz-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief instructions for the quiz..."
              maxLength={2000}
              rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="passing-score">Passing Score (%)</Label>
              <Input
                id="passing-score"
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value) || 70)}
              />
            </div>
            <div>
              <Label htmlFor="max-attempts">Max Attempts (0 = unlimited)</Label>
              <Input
                id="max-attempts"
                type="number"
                min={0}
                max={100}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Questions ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-gray-900">
            Questions ({questions.length})
          </h2>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={addQuestion}>
            <Plus className="h-4 w-4" /> Add Question
          </Button>
        </div>

        {questions.map((q, qIdx) => (
          <Card key={qIdx} className="relative">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-gray-300" />
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                  {qIdx + 1}
                </span>
                <CardTitle className="text-sm">Question {qIdx + 1}</CardTitle>
              </div>
              {questions.length > 1 && (
                <button
                  onClick={() => removeQuestion(qIdx)}
                  className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Question Text */}
              <div>
                <Label>Question Text *</Label>
                <textarea
                  value={q.questionText}
                  onChange={(e) => updateQuestion(qIdx, 'questionText', e.target.value)}
                  placeholder="Enter the question..."
                  maxLength={2000}
                  rows={2}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <Label>Options *</Label>
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    {/* Correct answer radio */}
                    <button
                      type="button"
                      onClick={() => updateQuestion(qIdx, 'correctLabel', opt.label)}
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                        q.correctLabel === opt.label
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-gray-300 text-gray-400 hover:border-brand-400'
                      )}
                      title={`Set ${opt.label} as correct answer`}
                    >
                      {opt.label}
                    </button>

                    <Input
                      value={opt.text}
                      onChange={(e) => updateOptionText(qIdx, oIdx, e.target.value)}
                      placeholder={`Option ${opt.label} text...`}
                      className="flex-1"
                      maxLength={1000}
                    />

                    {q.options.length > 2 && (
                      <button
                        onClick={() => removeOption(qIdx, oIdx)}
                        className="rounded p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                {q.options.length < 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 gap-1 text-xs text-muted-foreground"
                    onClick={() => addOption(qIdx)}
                  >
                    <Plus className="h-3 w-3" /> Add Option
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-500" />
                  Click a letter circle to set the correct answer. Current:{' '}
                  <strong>{q.correctLabel}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-between border-t pt-6">
        {quiz ? (
          <Button
            variant="outline"
            className="gap-2 text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
            Delete Quiz
          </Button>
        ) : (
          <div />
        )}

        <Button className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Save className="h-4 w-4" />
              {quiz ? 'Save Changes' : 'Create Quiz'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
