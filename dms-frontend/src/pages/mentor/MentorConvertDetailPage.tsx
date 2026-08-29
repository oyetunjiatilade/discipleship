import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { mentorApi } from '@/api/mentorApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import type { MentorNote } from '@/types/care';
import {
  ArrowLeft, MessageCircle, Phone, Sparkles, Building2, Users,
  PenLine, Trash2, Save, CheckCircle2, Circle, AlertCircle,
} from 'lucide-react';

function waLink(phone: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, '')}`;
}
function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export default function MentorConvertDetailPage() {
  const { convertId } = useParams<{ convertId: string }>();
  const toast = useToast();
  const { data, loading, error, refetch } = useAsync(() => mentorApi.getConvertDetail(convertId!), [convertId]);

  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [notes, setNotes] = useState<MentorNote[] | null>(null);

  const noteList = notes ?? data?.notes ?? [];

  const addNote = async () => {
    if (!noteText.trim() || !convertId) return;
    setSavingNote(true);
    try {
      const note = await mentorApi.addNote(convertId, noteText.trim());
      setNotes([note, ...noteList]);
      setNoteText('');
    } catch (err: any) {
      toast.error('Could not save note', err?.response?.data?.error?.message || 'Try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const removeNote = async (id: string) => {
    try {
      await mentorApi.deleteNote(id);
      setNotes(noteList.filter((n) => n.id !== id));
    } catch (err: any) {
      toast.error('Could not delete', err?.response?.data?.error?.message || 'Try again.');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link to="/mentor/flock" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-500">
          <ArrowLeft className="h-4 w-4" /> Back to flock
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="flex-1 text-sm font-medium text-red-800">{error || 'Not found'}</p>
            <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { convert, progress, reflections, stageHistory } = data;

  return (
    <div className="space-y-5">
      <Link to="/mentor/flock" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-brand-500">
        <ArrowLeft className="h-4 w-4" /> Back to flock
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-bold text-gray-900">{convert.firstName} {convert.lastName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="info">{convert.stageLabel}</Badge>
                {convert.isHolySpiritFilled && (
                  <Badge variant="success" className="gap-1"><Sparkles className="h-3 w-3" /> Holy Spirit</Badge>
                )}
              </div>
              <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {convert.cohortName && <p className="flex items-center gap-1"><Users className="h-3 w-3" /> {convert.cohortName}</p>}
                {convert.department && (
                  <p className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {convert.department}
                    {convert.departmentStatus === 'interested' ? ' (wants to join)' : ''}
                  </p>
                )}
                <p>Last seen: {fmt(convert.lastLoginAt)}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <a href={waLink(convert.phone)} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="WhatsApp">
                <MessageCircle className="h-4 w-4" />
              </a>
              <a href={`tel:${convert.phone}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" title="Call">
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.completedLessons}/{progress.totalLessons} lessons</span>
              <span className="font-semibold">{progress.percentComplete}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(progress.percentComplete, 100)}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><PenLine className="h-4 w-4 text-brand-500" /> My notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              placeholder="Private note — a prayer point, a follow-up, something they shared…"
              className="flex-1 rounded-md border border-input bg-background p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button size="sm" className="gap-1 self-end" disabled={savingNote || !noteText.trim()} onClick={addNote}>
              {savingNote ? <Spinner size="sm" /> : <><Save className="h-4 w-4" /> Save</>}
            </Button>
          </div>
          {noteList.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="space-y-2">
              {noteList.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                  <div>
                    <p className="whitespace-pre-wrap text-sm text-gray-800">{n.text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{fmt(n.createdAt)}</p>
                  </div>
                  <button onClick={() => removeNote(n.id)} className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Reflections */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Their reflections</CardTitle>
        </CardHeader>
        <CardContent>
          {reflections.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reflections written yet.</p>
          ) : (
            <ul className="space-y-3">
              {reflections.map((r) => (
                <li key={r.lessonId} className="rounded-lg border p-3">
                  <p className="text-xs font-semibold text-brand-600">{r.lessonTitle}</p>
                  {r.text && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{r.text}</p>}
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {r.actionStepDone ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Circle className="h-3 w-3" />}
                    Action step {r.actionStepDone ? 'done' : 'not done'} · {fmt(r.updatedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Stage history */}
      {stageHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Journey</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {stageHistory.map((h) => (
                <li key={h.id}>
                  {h.fromStage ? `${h.fromStage} → ` : ''}{h.toStage} · {fmt(h.transitionedAt)}
                  {h.trigger === 'admin_manual' ? ' (admin)' : ''}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
