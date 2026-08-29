import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { sessionApi } from '@/api/sessionApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import type { LiveSession, RsvpStatus } from '@/types/engagement';
import { Video, Calendar, Clock, Check, X } from 'lucide-react';

function fmt(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }),
  };
}

export default function SessionsPage() {
  const toast = useToast();
  const { data, loading } = useAsync(() => sessionApi.listUpcoming());
  const [sessions, setSessions] = useState<LiveSession[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = sessions ?? data ?? [];

  const setRsvp = async (id: string, rsvp: RsvpStatus) => {
    setBusyId(id);
    try {
      const updated = await sessionApi.rsvp(id, rsvp);
      setSessions(list.map((s) => (s.id === id ? { ...s, myRsvp: updated.myRsvp } : s)));
    } catch (err: any) {
      toast.error('Could not RSVP', err?.response?.data?.error?.message || 'Try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-800">Live Sessions</h1>
        <p className="text-sm text-muted-foreground">Upcoming classes and gatherings. Let us know you're coming.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Calendar className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">No upcoming sessions right now.</p>
            <p className="text-xs text-muted-foreground">Check back soon — new sessions are added regularly.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((s) => {
            const { date, time } = fmt(s.scheduledAt);
            const soon = new Date(s.scheduledAt).getTime() - Date.now() < 60 * 60 * 1000;
            return (
              <Card key={s.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{s.title}</p>
                      {s.description && <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>}
                    </div>
                    {soon && <Badge variant="warning">Soon</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {time} · {s.durationMinutes} min</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={s.meetingUrl} target="_blank" rel="noreferrer" className="flex-1">
                      <Button size="sm" className="w-full gap-2"><Video className="h-4 w-4" /> Join</Button>
                    </a>
                    <Button
                      size="sm"
                      variant={s.myRsvp === 'going' ? 'default' : 'outline'}
                      className="gap-1"
                      disabled={busyId === s.id}
                      onClick={() => setRsvp(s.id, 'going')}
                    >
                      <Check className="h-3.5 w-3.5" /> Going
                    </Button>
                    <Button
                      size="sm"
                      variant={s.myRsvp === 'not_going' ? 'default' : 'outline'}
                      className="gap-1"
                      disabled={busyId === s.id}
                      onClick={() => setRsvp(s.id, 'not_going')}
                    >
                      <X className="h-3.5 w-3.5" /> Can't
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
