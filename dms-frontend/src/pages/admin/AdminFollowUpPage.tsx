import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { adminApi } from '@/api/adminApi';
import { ConvertManageModal } from '@/components/ConvertManageModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, MessageCircle, HeartHandshake, CheckCircle2 } from 'lucide-react';

function waLink(phone: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, '')}`;
}

export default function AdminFollowUpPage() {
  const { data: rows, loading, error, refetch } = useAsync(() => adminApi.getFollowUp({ days: 5 }));
  const [managing, setManaging] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-800">Needs Follow-up</h1>
        <p className="text-sm text-muted-foreground">
          Converts who've gone quiet, ranked by days of silence. Reach out — a message goes a long way.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="flex-1 text-sm font-medium text-red-800">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
          </CardContent>
        </Card>
      ) : (rows || []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            <p className="text-sm font-medium text-gray-600">Everyone's engaged — nobody needs follow-up right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows!.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-gray-900">{r.firstName} {r.lastName}</p>
                    <Badge variant="info">{r.stageLabel}</Badge>
                    <Badge variant="warning">
                      {r.daysInactive === null ? 'Never active' : `${r.daysInactive}d silent`}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <HeartHandshake className="h-3 w-3" />
                    {r.mentorName ? `Mentor: ${r.mentorName}` : 'No mentor assigned'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a href={waLink(r.phone)} target="_blank" rel="noreferrer"
                     className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="WhatsApp">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                  <Button variant="outline" size="sm" onClick={() => setManaging({ id: r.id, name: `${r.firstName} ${r.lastName}` })}>
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {managing && (
        <ConvertManageModal
          convertId={managing.id}
          convertName={managing.name}
          onClose={() => setManaging(null)}
          onChanged={refetch}
        />
      )}
    </div>
  );
}
