import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '@/api/adminApi';
import { courseApi } from '@/api/courseApi';
import type { CreateLessonPayload, UpdateLessonPayload } from '@/api/adminApi';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner, PageLoader } from '@/components/ui/spinner';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  BookOpen,
  Video,
  FileText,
  Clock,
  HelpCircle,
  X,
  Save,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Upload,
  CheckCircle2,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminLesson } from '@/types/models';

// ── Form State ──

interface LessonFormData {
  title: string;
  description: string;
  sortOrder: string;
  videoUrl: string;
  videoPublicId: string;
  notesUrl: string;
  notesPublicId: string;
  estimatedMinutes: string;
  memoryVerse: string;
  actionStep: string;
  transcript: string;
  notesMarkdown: string;
  isPublished: boolean;
}

const emptyForm: LessonFormData = {
  title: '',
  description: '',
  sortOrder: '',
  videoUrl: '',
  videoPublicId: '',
  notesUrl: '',
  notesPublicId: '',
  estimatedMinutes: '',
  memoryVerse: '',
  actionStep: '',
  transcript: '',
  notesMarkdown: '',
  isPublished: false,
};

function lessonToForm(lesson: AdminLesson): LessonFormData {
  return {
    title: lesson.title,
    description: lesson.description,
    sortOrder: String(lesson.sortOrder),
    videoUrl: lesson.videoUrl,
    videoPublicId: lesson.videoPublicId,
    notesUrl: lesson.notesUrl,
    notesPublicId: lesson.notesPublicId,
    estimatedMinutes: lesson.estimatedMinutes ? String(lesson.estimatedMinutes) : '',
    memoryVerse: lesson.memoryVerse || '',
    actionStep: lesson.actionStep || '',
    transcript: lesson.transcript || '',
    notesMarkdown: lesson.notesMarkdown || '',
    isPublished: lesson.isPublished,
  };
}

export default function LessonManagement() {
  const toast = useToast();
  const navigate = useNavigate();

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const { data: courses } = useAsync(() => courseApi.adminListCourses(), []);

  const {
    data: lessons,
    loading,
    error,
    refetch,
  } = useAsync(() => adminApi.getLessons(selectedCourseId || undefined), [selectedCourseId]);

  // ── Dialog State ──
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LessonFormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ── Upload State ──
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoFileName, setVideoFileName] = useState('');

  const [notesMode, setNotesMode] = useState<'file' | 'text'>('file');
  const [notesUploading, setNotesUploading] = useState(false);
  const [notesProgress, setNotesProgress] = useState(0);
  const [notesFileName, setNotesFileName] = useState('');
  const [notesTextContent, setNotesTextContent] = useState('');

  const videoInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);

  // ── Delete Confirm ──
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Publish Toggle ──
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Open Create ──
  const openCreate = () => {
    const nextOrder = lessons ? Math.max(0, ...lessons.map((l) => l.sortOrder)) + 1 : 1;
    setForm({ ...emptyForm, sortOrder: String(nextOrder) });
    setEditingId(null);
    setFormErrors({});
    setVideoFileName('');
    setNotesFileName('');
    setNotesTextContent('');
    setNotesMode('file');
    setShowForm(true);
  };

  // ── Open Edit ──
  const openEdit = (lesson: AdminLesson) => {
    setForm(lessonToForm(lesson));
    setEditingId(lesson.id);
    setFormErrors({});
    setVideoFileName(lesson.videoUrl ? '(current video)' : '');
    setNotesFileName(lesson.notesUrl ? '(current notes)' : '');
    setNotesTextContent('');
    setNotesMode('file');
    setShowForm(true);
  };

  // ── Field Change ──
  const setField = (field: keyof LessonFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // ══════════════════════════════════════════
  //  FILE UPLOAD HANDLERS
  // ══════════════════════════════════════════

  const handleVideoUpload = async (file: File) => {
    setVideoUploading(true);
    setVideoProgress(0);
    setVideoFileName(file.name);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.videoUrl;
      return next;
    });

    try {
      const result = await adminApi.uploadVideo(file, (pct) => setVideoProgress(pct));
      setForm((prev) => ({
        ...prev,
        videoUrl: result.url,
        videoPublicId: result.publicId,
      }));
      toast.success('Video Uploaded', file.name);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Video upload failed';
      toast.error('Upload Failed', msg);
      setVideoFileName('');
      setForm((prev) => ({ ...prev, videoUrl: '', videoPublicId: '' }));
    } finally {
      setVideoUploading(false);
      setVideoProgress(0);
    }
  };

  const handleNotesFileUpload = async (file: File) => {
    setNotesUploading(true);
    setNotesProgress(0);
    setNotesFileName(file.name);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.notesUrl;
      return next;
    });

    try {
      const result = await adminApi.uploadNotesFile(file, (pct) => setNotesProgress(pct));
      setForm((prev) => ({
        ...prev,
        notesUrl: result.url,
        notesPublicId: result.publicId,
      }));
      toast.success('Notes Uploaded', file.name);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Notes upload failed';
      toast.error('Upload Failed', msg);
      setNotesFileName('');
      setForm((prev) => ({ ...prev, notesUrl: '', notesPublicId: '' }));
    } finally {
      setNotesUploading(false);
      setNotesProgress(0);
    }
  };

  const handleNotesTextConvert = async () => {
    if (notesTextContent.trim().length < 10) {
      setFormErrors((prev) => ({ ...prev, notesUrl: 'Notes content must be at least 10 characters.' }));
      return;
    }
    setNotesUploading(true);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.notesUrl;
      return next;
    });

    try {
      const result = await adminApi.uploadNotesText(form.title || 'Lesson Notes', notesTextContent.trim());
      setForm((prev) => ({
        ...prev,
        notesUrl: result.url,
        notesPublicId: result.publicId,
      }));
      setNotesFileName('(generated from text)');
      toast.success('Notes Generated', 'PDF created from your text.');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Notes generation failed';
      toast.error('Failed', msg);
    } finally {
      setNotesUploading(false);
    }
  };

  // ══════════════════════════════════════════
  //  VALIDATE
  // ══════════════════════════════════════════

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (form.title.trim().length < 2) errors.title = 'Title must be at least 2 characters';
    if (form.description.trim().length < 10)
      errors.description = 'Description must be at least 10 characters';

    const order = parseInt(form.sortOrder, 10);
    if (isNaN(order) || order < 1) errors.sortOrder = 'Must be a whole number ≥ 1';

    if (!form.videoUrl) errors.videoUrl = 'Please upload a video file';
    if (!form.notesUrl) {
      if (notesMode === 'text' && notesTextContent.trim().length >= 10) {
        errors.notesUrl = 'Click "Generate PDF" to convert your notes before saving';
      } else {
        errors.notesUrl = 'Please upload a PDF or generate notes from text';
      }
    }

    if (form.estimatedMinutes) {
      const mins = parseInt(form.estimatedMinutes, 10);
      if (isNaN(mins) || mins < 1 || mins > 600) errors.estimatedMinutes = 'Must be 1-600';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ══════════════════════════════════════════
  //  SAVE (Create or Update)
  // ══════════════════════════════════════════

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        const original = lessons?.find((l) => l.id === editingId);
        const payload: UpdateLessonPayload = {};
        if (form.title !== original?.title) payload.title = form.title.trim();
        if (form.description !== original?.description)
          payload.description = form.description.trim();
        if (form.videoUrl !== original?.videoUrl) payload.videoUrl = form.videoUrl.trim();
        if (form.videoPublicId !== original?.videoPublicId)
          payload.videoPublicId = form.videoPublicId.trim();
        if (form.notesUrl !== original?.notesUrl) payload.notesUrl = form.notesUrl.trim();
        if (form.notesPublicId !== original?.notesPublicId)
          payload.notesPublicId = form.notesPublicId.trim();
        if (form.isPublished !== original?.isPublished) payload.isPublished = form.isPublished;

        const mins = form.estimatedMinutes ? parseInt(form.estimatedMinutes, 10) : null;
        if (mins !== original?.estimatedMinutes) payload.estimatedMinutes = mins;
        if ((form.memoryVerse.trim() || '') !== (original?.memoryVerse || ''))
          payload.memoryVerse = form.memoryVerse.trim() || null;
        if ((form.actionStep.trim() || '') !== (original?.actionStep || ''))
          payload.actionStep = form.actionStep.trim() || null;
        if ((form.transcript.trim() || '') !== (original?.transcript || ''))
          payload.transcript = form.transcript.trim() || null;
        if ((form.notesMarkdown.trim() || '') !== (original?.notesMarkdown || ''))
          payload.notesMarkdown = form.notesMarkdown.trim() || null;

        if (Object.keys(payload).length === 0) {
          toast.info('No Changes', 'Nothing to update.');
          setSaving(false);
          return;
        }

        await adminApi.updateLesson(editingId, payload);
        toast.success('Lesson Updated', `"${form.title}" saved.`);
      } else {
        const payload: CreateLessonPayload = {
          courseId: selectedCourseId || undefined,
          title: form.title.trim(),
          description: form.description.trim(),
          sortOrder: parseInt(form.sortOrder, 10),
          videoUrl: form.videoUrl.trim(),
          videoPublicId: form.videoPublicId.trim(),
          notesUrl: form.notesUrl.trim(),
          notesPublicId: form.notesPublicId.trim(),
          memoryVerse: form.memoryVerse.trim() || null,
          actionStep: form.actionStep.trim() || null,
          transcript: form.transcript.trim() || null,
          notesMarkdown: form.notesMarkdown.trim() || null,
          isPublished: form.isPublished,
        };
        if (form.estimatedMinutes) {
          payload.estimatedMinutes = parseInt(form.estimatedMinutes, 10);
        }

        await adminApi.createLesson(payload);
        toast.success('Lesson Created', `"${form.title}" added.`);
      }
      setShowForm(false);
      await refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Save failed';
      toast.error('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await adminApi.deleteLesson(deletingId);
      toast.success('Lesson Deleted', 'Lesson has been removed.');
      setDeletingId(null);
      await refetch();
    } catch (err: any) {
      toast.error('Delete Failed', err?.response?.data?.error?.message || 'Please try again');
    } finally {
      setDeleting(false);
    }
  };

  // ── Toggle Publish ──
  const handleTogglePublish = async (lesson: AdminLesson) => {
    setTogglingId(lesson.id);
    try {
      await adminApi.updateLesson(lesson.id, {
        isPublished: !lesson.isPublished,
      });
      toast.success(
        lesson.isPublished ? 'Unpublished' : 'Published',
        `"${lesson.title}" is now ${lesson.isPublished ? 'hidden from' : 'visible to'} converts.`
      );
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Try again');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Move Up / Down ──
  const handleMove = async (lessonId: string, direction: 'up' | 'down') => {
    if (!lessons) return;
    const sorted = [...lessons].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((l) => l.id === lessonId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    try {
      await adminApi.reorderLessons([
        { lessonId: sorted[idx].id, sortOrder: sorted[swapIdx].sortOrder },
        { lessonId: sorted[swapIdx].id, sortOrder: sorted[idx].sortOrder },
      ], selectedCourseId || undefined);
      await refetch();
    } catch (err: any) {
      toast.error('Reorder Failed', err?.response?.data?.error?.message || 'Try again');
    }
  };

  // ── Loading ──
  if (loading) return <PageLoader label="Loading lessons..." />;

  const sortedLessons = lessons
    ? [...lessons].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const isUploading = videoUploading || notesUploading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-800">Manage Lessons</h1>
          <p className="text-sm text-muted-foreground">
            {sortedLessons.length} lesson{sortedLessons.length !== 1 ? 's' : ''}
          </p>
          {(courses?.length ?? 0) > 1 && (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="mt-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Believers Class (core)</option>
              {(courses || []).filter((c) => !c.isPrimary).map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          )}
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Lesson
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-800">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Lesson List */}
      {sortedLessons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-muted-foreground">
              No lessons yet. Create your first lesson above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedLessons.map((lesson, idx) => (
            <Card
              key={lesson.id}
              className={cn(
                'transition-all',
                !lesson.isPublished && 'border-dashed opacity-70'
              )}
            >
              <CardContent className="flex items-center gap-3 p-4">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => handleMove(lesson.id, 'up')} disabled={idx === 0}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:invisible">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <span className="text-center text-xs font-bold text-gray-400">{lesson.sortOrder}</span>
                  <button onClick={() => handleMove(lesson.id, 'down')} disabled={idx === sortedLessons.length - 1}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:invisible">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900">{lesson.title}</p>
                    {!lesson.isPublished && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                    {lesson.hasQuiz && (
                      <Badge variant="info" className="text-[10px]">
                        <HelpCircle className="mr-0.5 h-2.5 w-2.5" />Quiz
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {lesson.estimatedMinutes && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.estimatedMinutes} min</span>
                    )}
                    <span className="flex items-center gap-1"><Video className="h-3 w-3" />{lesson.videoUrl ? 'Video' : 'No video'}</span>
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{lesson.notesUrl ? 'Notes' : 'No notes'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => navigate(`/admin/lessons/${lesson.id}/quiz`)}
                    className={cn('rounded-md p-2 transition-colors', lesson.hasQuiz ? 'text-violet-500 hover:bg-violet-50' : 'text-gray-400 hover:bg-gray-100')}
                    title={lesson.hasQuiz ? 'Edit Quiz' : 'Add Quiz'}>
                    <HelpCircle className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleTogglePublish(lesson)} disabled={togglingId === lesson.id}
                    className={cn('rounded-md p-2 transition-colors', lesson.isPublished ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100')}
                    title={lesson.isPublished ? 'Unpublish' : 'Publish'}>
                    {togglingId === lesson.id ? <Spinner size="sm" /> : lesson.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => openEdit(lesson)} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-brand-500" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeletingId(lesson.id)} className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          CREATE / EDIT FORM DIALOG
         ═══════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
          <Card className="mb-10 w-full max-w-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">
                {editingId ? 'Edit Lesson' : 'Create Lesson'}
              </CardTitle>
              <button onClick={() => setShowForm(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => setField('title', e.target.value)}
                  placeholder="e.g. Understanding Salvation" className={formErrors.title ? 'border-red-400' : ''} />
                {formErrors.title && <p className="mt-1 text-xs text-red-500">{formErrors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <textarea id="description" value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Lesson description (min 10 characters)" rows={3}
                  className={cn(
                    'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    formErrors.description && 'border-red-400'
                  )} />
                {formErrors.description && <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>}
              </div>

              <div>
                <Label htmlFor="memoryVerse">Memory Verse (optional)</Label>
                <Input id="memoryVerse" value={form.memoryVerse}
                  onChange={(e) => setField('memoryVerse', e.target.value)}
                  placeholder="e.g. John 3:16 — For God so loved the world..." />
              </div>

              <div>
                <Label htmlFor="actionStep">Action Step (optional)</Label>
                <Input id="actionStep" value={form.actionStep}
                  onChange={(e) => setField('actionStep', e.target.value)}
                  placeholder="A practical 'do this' for the week" />
              </div>

              <div>
                <Label htmlFor="transcript">Transcript (optional — for low-data reading)</Label>
                <textarea id="transcript" value={form.transcript}
                  onChange={(e) => setField('transcript', e.target.value)}
                  placeholder="Paste or type the lesson transcript so converts on limited data can read instead of streaming."
                  rows={5}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>

              <div>
                <Label htmlFor="notesMarkdown">Inline Notes (Markdown — shown instead of the PDF)</Label>
                <textarea id="notesMarkdown" value={form.notesMarkdown}
                  onChange={(e) => setField('notesMarkdown', e.target.value)}
                  placeholder={'Supports **bold**, *italic*, # headings, - bullet lists, and [links](https://...). When set, converts read these formatted notes inline (no PDF, no data cost).'}
                  rows={6}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>

              {/* Sort Order + Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sortOrder">Sort Order *</Label>
                  <Input id="sortOrder" type="number" min={1} value={form.sortOrder}
                    onChange={(e) => setField('sortOrder', e.target.value)}
                    className={formErrors.sortOrder ? 'border-red-400' : ''} />
                  {formErrors.sortOrder && <p className="mt-1 text-xs text-red-500">{formErrors.sortOrder}</p>}
                </div>
                <div>
                  <Label htmlFor="estimatedMinutes">Duration (min)</Label>
                  <Input id="estimatedMinutes" type="number" min={1} max={600} value={form.estimatedMinutes}
                    onChange={(e) => setField('estimatedMinutes', e.target.value)} placeholder="Optional"
                    className={formErrors.estimatedMinutes ? 'border-red-400' : ''} />
                  {formErrors.estimatedMinutes && <p className="mt-1 text-xs text-red-500">{formErrors.estimatedMinutes}</p>}
                </div>
              </div>

              {/* ═══════ VIDEO UPLOAD ═══════ */}
              <div className="space-y-3 rounded-lg border bg-gray-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <Video className="mr-1 inline h-3.5 w-3.5" />Lesson Video
                </p>

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVideoUpload(file);
                    e.target.value = '';
                  }}
                />

                {videoUploading ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-brand-600">
                      <Spinner size="sm" />
                      Uploading {videoFileName}... {videoProgress}%
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-300"
                        style={{ width: `${videoProgress}%` }}
                      />
                    </div>
                  </div>
                ) : form.videoUrl ? (
                  <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="truncate">{videoFileName || 'Video uploaded'}</span>
                    </div>
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      className="text-xs font-medium text-brand-600 hover:underline"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className={cn(
                      'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors hover:border-brand-400 hover:bg-brand-50/30',
                      formErrors.videoUrl ? 'border-red-300 bg-red-50/30' : 'border-gray-300'
                    )}
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">Click to upload video</span>
                    <span className="text-xs text-gray-400">MP4, WebM, OGG, MOV, AVI — max 500 MB</span>
                  </button>
                )}
                {formErrors.videoUrl && <p className="text-xs text-red-500">{formErrors.videoUrl}</p>}
              </div>

              {/* ═══════ NOTES UPLOAD / TEXT ═══════ */}
              <div className="space-y-3 rounded-lg border bg-gray-50/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <FileText className="mr-1 inline h-3.5 w-3.5" />Lesson Notes
                  </p>
                  {/* Mode Toggle */}
                  <div className="flex rounded-md border bg-white">
                    <button
                      type="button"
                      onClick={() => setNotesMode('file')}
                      className={cn(
                        'flex items-center gap-1 rounded-l-md px-3 py-1 text-xs font-medium transition-colors',
                        notesMode === 'file'
                          ? 'bg-brand-100 text-brand-700'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <Upload className="h-3 w-3" />Upload PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotesMode('text')}
                      className={cn(
                        'flex items-center gap-1 rounded-r-md px-3 py-1 text-xs font-medium transition-colors',
                        notesMode === 'text'
                          ? 'bg-brand-100 text-brand-700'
                          : 'text-gray-500 hover:text-gray-700'
                      )}
                    >
                      <Type className="h-3 w-3" />Type Notes
                    </button>
                  </div>
                </div>

                <input
                  ref={notesInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleNotesFileUpload(file);
                    e.target.value = '';
                  }}
                />

                {notesMode === 'file' ? (
                  /* ── PDF Upload Mode ── */
                  <>
                    {notesUploading ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-brand-600">
                          <Spinner size="sm" />
                          Uploading {notesFileName}... {notesProgress}%
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-all duration-300"
                            style={{ width: `${notesProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : form.notesUrl && notesFileName ? (
                      <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <div className="flex items-center gap-2 text-sm text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="truncate">{notesFileName}</span>
                        </div>
                        <button
                          onClick={() => notesInputRef.current?.click()}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          Replace
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => notesInputRef.current?.click()}
                        className={cn(
                          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors hover:border-brand-400 hover:bg-brand-50/30',
                          formErrors.notesUrl ? 'border-red-300 bg-red-50/30' : 'border-gray-300'
                        )}
                      >
                        <Upload className="h-8 w-8 text-gray-400" />
                        <span className="text-sm font-medium text-gray-600">Click to upload PDF</span>
                        <span className="text-xs text-gray-400">PDF only — max 20 MB</span>
                      </button>
                    )}
                  </>
                ) : (
                  /* ── Type Notes Mode ── */
                  <div className="space-y-3">
                    <textarea
                      value={notesTextContent}
                      onChange={(e) => {
                        setNotesTextContent(e.target.value);
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.notesUrl;
                          return next;
                        });
                      }}
                      placeholder={`Type your lesson notes here...\n\nUse blank lines to separate paragraphs.\nShort lines without periods become headings in the PDF.\n\nWrite as much as needed — this will be converted to a professional PDF document.`}
                      rows={10}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm leading-relaxed focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {notesTextContent.length} characters
                        {form.notesUrl && notesFileName === '(generated from text)' && (
                          <span className="ml-2 text-emerald-600">
                            <CheckCircle2 className="mr-0.5 inline h-3 w-3" />PDF generated
                          </span>
                        )}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={handleNotesTextConvert}
                        disabled={notesUploading || notesTextContent.trim().length < 10}
                      >
                        {notesUploading ? (
                          <Spinner size="sm" />
                        ) : (
                          <>
                            <FileText className="h-3.5 w-3.5" />
                            Generate PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {formErrors.notesUrl && <p className="text-xs text-red-500">{formErrors.notesUrl}</p>}
              </div>

              {/* Published Toggle */}
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={form.isPublished}
                  onChange={(e) => setField('isPublished', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm font-medium text-gray-700">Publish immediately</span>
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving || isUploading}>
                  Cancel
                </Button>
                <Button className="gap-2" onClick={handleSave} disabled={saving || isUploading}>
                  {saving ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {editingId ? 'Save Changes' : 'Create Lesson'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════ DELETE DIALOG ═══════════ */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Delete Lesson?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This will soft-delete the lesson. It will no longer be visible to converts.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDeletingId(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1 gap-2" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <Spinner size="sm" /> : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
