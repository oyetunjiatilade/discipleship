import { useState } from 'react';
import { adminApi } from '@/api/adminApi';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Send,
  Megaphone,
  User,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DiscipleshipStage,
  STAGE_LABELS,
  STAGE_ORDER,
} from '@/constants/enums';

type Tab = 'send' | 'broadcast';

export default function AdminNotificationsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('send');

  // ── Send to Individual ──
  const [sendForm, setSendForm] = useState({
    convertId: '',
    title: '',
    message: '',
  });
  const [sending, setSending] = useState(false);

  // ── Broadcast ──
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    stage: '' as DiscipleshipStage | '',
  });
  const [broadcasting, setBroadcasting] = useState(false);

  // ── Send Handler ──
  const handleSend = async () => {
    if (!sendForm.convertId.trim()) {
      toast.error('Missing Field', 'Convert ID is required.');
      return;
    }
    if (sendForm.title.trim().length < 2) {
      toast.error('Missing Field', 'Title must be at least 2 characters.');
      return;
    }
    if (sendForm.message.trim().length < 2) {
      toast.error('Missing Field', 'Message must be at least 2 characters.');
      return;
    }

    setSending(true);
    try {
      await adminApi.sendNotification({
        convertId: sendForm.convertId.trim(),
        title: sendForm.title.trim(),
        message: sendForm.message.trim(),
      });
      toast.success('Sent!', 'Notification delivered to convert.');
      setSendForm({ convertId: '', title: '', message: '' });
    } catch (err: any) {
      toast.error(
        'Send Failed',
        err?.response?.data?.error?.message || 'Please check the convert ID and try again.'
      );
    } finally {
      setSending(false);
    }
  };

  // ── Broadcast Handler ──
  const handleBroadcast = async () => {
    if (broadcastForm.title.trim().length < 2) {
      toast.error('Missing Field', 'Title must be at least 2 characters.');
      return;
    }
    if (broadcastForm.message.trim().length < 2) {
      toast.error('Missing Field', 'Message must be at least 2 characters.');
      return;
    }

    setBroadcasting(true);
    try {
      const result = await adminApi.broadcast({
        title: broadcastForm.title.trim(),
        message: broadcastForm.message.trim(),
        stage: broadcastForm.stage || undefined,
      });
      toast.success('Broadcast Sent!', result.message);
      setBroadcastForm({ title: '', message: '', stage: '' });
    } catch (err: any) {
      toast.error(
        'Broadcast Failed',
        err?.response?.data?.error?.message || 'Please try again.'
      );
    } finally {
      setBroadcasting(false);
    }
  };

  const allStages = [
    DiscipleshipStage.NEW_CONVERT,
    DiscipleshipStage.HOLY_SPIRIT_FILLED,
    ...STAGE_ORDER.slice(1),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-800">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Send targeted or broadcast notifications to converts.
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setTab('send')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            tab === 'send'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <User className="h-4 w-4" />
          Send to Convert
        </button>
        <button
          onClick={() => setTab('broadcast')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            tab === 'broadcast'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Megaphone className="h-4 w-4" />
          Broadcast
        </button>
      </div>

      {/* ═══════════════════════════════════════════
          SEND TO INDIVIDUAL
         ═══════════════════════════════════════════ */}
      {tab === 'send' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4 text-brand-400" />
              Send to Specific Convert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="convertId">Convert ID *</Label>
              <Input
                id="convertId"
                value={sendForm.convertId}
                onChange={(e) =>
                  setSendForm((p) => ({ ...p, convertId: e.target.value }))
                }
                placeholder="MongoDB ObjectId (24-char hex)"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                You can find this in the Converts table.
              </p>
            </div>

            <div>
              <Label htmlFor="sendTitle">Title *</Label>
              <Input
                id="sendTitle"
                value={sendForm.title}
                onChange={(e) =>
                  setSendForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Notification title"
                maxLength={300}
              />
            </div>

            <div>
              <Label htmlFor="sendMessage">Message *</Label>
              <textarea
                id="sendMessage"
                value={sendForm.message}
                onChange={(e) =>
                  setSendForm((p) => ({ ...p, message: e.target.value }))
                }
                placeholder="Write your notification message..."
                rows={4}
                maxLength={2000}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {sendForm.message.length}/2000
              </p>
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
              Send Notification
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════
          BROADCAST
         ═══════════════════════════════════════════ */}
      {tab === 'broadcast' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-accent-400" />
              Broadcast to All Converts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stage Filter (optional) */}
            <div>
              <Label>Target Stage (optional)</Label>
              <select
                value={broadcastForm.stage}
                onChange={(e) =>
                  setBroadcastForm((p) => ({
                    ...p,
                    stage: e.target.value as DiscipleshipStage | '',
                  }))
                }
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All active converts</option>
                {allStages.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty to send to all active converts.
              </p>
            </div>

            <div>
              <Label htmlFor="broadcastTitle">Title *</Label>
              <Input
                id="broadcastTitle"
                value={broadcastForm.title}
                onChange={(e) =>
                  setBroadcastForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Broadcast title"
                maxLength={300}
              />
            </div>

            <div>
              <Label htmlFor="broadcastMessage">Message *</Label>
              <textarea
                id="broadcastMessage"
                value={broadcastForm.message}
                onChange={(e) =>
                  setBroadcastForm((p) => ({ ...p, message: e.target.value }))
                }
                placeholder="Write your broadcast message..."
                rows={4}
                maxLength={2000}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {broadcastForm.message.length}/2000
              </p>
            </div>

            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="flex items-start gap-3 p-3">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs text-amber-800">
                  This will send a notification to{' '}
                  {broadcastForm.stage
                    ? `all converts in the "${STAGE_LABELS[broadcastForm.stage]}" stage`
                    : 'every active convert'}
                  . This action cannot be undone.
                </p>
              </CardContent>
            </Card>

            <Button
              className="w-full gap-2"
              onClick={handleBroadcast}
              disabled={broadcasting}
            >
              {broadcasting ? (
                <Spinner size="sm" />
              ) : (
                <Megaphone className="h-4 w-4" />
              )}
              Send Broadcast
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
