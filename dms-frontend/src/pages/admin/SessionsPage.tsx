import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { sessionApi } from '@/api/sessionApi';
import { communityApi } from '@/api/communityApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import type { LiveSession, Attendee } from '@/types/engagement';
import { Video, Plus, X, Save, Users, Trash2, Calendar, Clock } from 'lucide-react';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SessionsPage() {
  const toast = useToast();
  const { data: sessions, loading, refetch } = useAsync(() => sessionApi.list());
  const { data: cohorts } = useAsync(() => communityApi.listCohorts());

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', scheduledAt: '', durationMinutes: '60', meetingUrl: '', cohortId: '',
  });

  const [attendFor, setAttendFor] = useState<LiveSession | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendLoading, setAttendLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.scheduledAt || !form.meetingUrl.trim()) {
      toast.error('Missing fields', 'Title, date/time, and meeting link are required.');
      return;
    }
    setSaving(true);
    try {
      await sessionApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes, 10) : undefined,
        meetingUrl: form.meetingUrl.trim(),
        cohortId: form.cohortId || null,
      });
      toast.success('Session created', `"${form.title}" scheduled.`);
      setShowCreate(false);
      setForm({ title: '', description: '', scheduledAt: '', durationMinutes: '60', meetingUrl: '', cohortId: '' });
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not create session.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await sessionApi.remove(id);
      toast.success('Deleted', 'Session removed.');
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not delete.');
    }
  };

  const openAttendance = async (s: LiveSession) => {
    setAttendFor(s);
    setAttendLoading(true);
    try {
      setAttendees(await sessionApi.getAttendance(s.id));
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not load attendance.');
    } finally {
      setAttendLoading(false);
    }
  };

  const toggleAttended = async (userId: string, attended: boolean) => {
    if (!attendFor) return;
    try {
      await sessionApi.markAttendance(attendFor.id, userId, attended);
      setAttendees((prev) => prev.map((a) => (a.userId === userId ? { ...a, attended } : a)));
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not update.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-800">Live Sessions</h1>
          <p className="text-sm text-muted-foreground">Schedule classes, share the link, and track attendance.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Session
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (sessions || []).length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-gray-500">No sessions scheduled yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sessions!.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{s.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {fmt(s.scheduledAt)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {s.durationMinutes} min</span>
                    <span>Going: {s.goingCount ?? 0} · Attended: {s.attendedCount ?? 0}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a href={s.meetingUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="gap-1"><Video className="h-3.5 w-3.5" /> Link</Button>
                  </a>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openAttendance(s)}>
                    <Users className="h-3.5 w-3.5" /> Attendance
                  </Button>
                  <button onClick={() => remove(s.id)} className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create session dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">New Session</CardTitle>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Week 3 — Prayer" /></div>
              <div><Label>Description (optional)</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date &amp; time</Label><Input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} /></div>
                <div><Label>Duration (min)</Label><Input type="number" min={5} max={600} value={form.durationMinutes} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))} /></div>
              </div>
              <div><Label>Meeting link</Label><Input value={form.meetingUrl} onChange={(e) => setForm((p) => ({ ...p, meetingUrl: e.target.value }))} placeholder="https://meet.google.com/..." /></div>
              <div>
                <Label>Audience</Label>
                <select value={form.cohortId} onChange={(e) => setForm((p) => ({ ...p, cohortId: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Everyone</option>
                  {(cohorts || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
                <Button className="gap-2" onClick={handleCreate} disabled={saving}>{saving ? <Spinner size="sm" /> : <><Save className="h-4 w-4" /> Create</>}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance dialog */}
      {attendFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Attendance — {attendFor.title}</CardTitle>
              <button onClick={() => setAttendFor(null)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent>
              {attendLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : attendees.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No RSVPs or attendance yet. Attendees appear here once converts RSVP.</p>
              ) : (
                <div className="space-y-2">
                  {attendees.map((a) => (
                    <label key={a.userId} className="flex cursor-pointer items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.phone}{a.rsvp ? ` · RSVP: ${a.rsvp === 'going' ? 'Going' : "Can't"}` : ''}
                        </p>
                      </div>
                      <input type="checkbox" checked={a.attended} onChange={(e) => toggleAttended(a.userId, e.target.checked)} className="h-5 w-5 accent-brand-500" />
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
