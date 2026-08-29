import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Phone } from 'lucide-react';
import type { FlockMember, FlockStatus } from '@/types/care';

const statusMeta: Record<FlockStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'info' | 'secondary'; note: string }> = {
  dark: { label: 'Gone quiet', variant: 'warning', note: 'No activity — reach out today' },
  stuck: { label: 'Stalled', variant: 'warning', note: 'Started but stuck mid-class' },
  new: { label: 'New', variant: 'info', note: 'Not started yet' },
  active: { label: 'Active', variant: 'success', note: 'Progressing well' },
  done: { label: 'Completed', variant: 'default', note: 'Finished the class' },
};

function waLink(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}`;
}

export function FlockList({ members, onSelect }: { members: FlockMember[]; onSelect?: (id: string) => void }) {
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-gray-500">No converts assigned yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((m) => {
        const meta = statusMeta[m.status];
        return (
          <Card key={m.id} className={onSelect ? 'cursor-pointer transition-all hover:border-brand-200 hover:shadow-md' : ''} onClick={onSelect ? () => onSelect(m.id) : undefined}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-gray-900">{m.firstName} {m.lastName}</p>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {m.stageLabel} · {m.completedLessons}/{m.totalLessons} lessons ({m.percentComplete}%)
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.daysSinceActive === null ? 'No activity yet' : `Last active ${m.daysSinceActive}d ago`} · {meta.note}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a href={waLink(m.phone)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                   className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="WhatsApp">
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a href={`tel:${m.phone}`} onClick={(e) => e.stopPropagation()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200" title="Call">
                  <Phone className="h-4 w-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
