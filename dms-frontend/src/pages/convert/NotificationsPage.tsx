import { useState, useCallback } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { notificationApi } from '@/api/notificationApi';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner, PageLoader } from '@/components/ui/spinner';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  XCircle,
  Megaphone,
  ArrowUpDown,
  Sparkles,
  Settings,
  Trash2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types/models';
import type { NotificationType } from '@/constants/enums';

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  welcome: { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100' },
  stage_transition: { icon: ArrowUpDown, color: 'text-brand-600', bg: 'bg-brand-100' },
  lesson_completed: { icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  course_completed: { icon: GraduationCap, color: 'text-accent-600', bg: 'bg-accent-100' },
  quiz_passed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  quiz_failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
  admin_message: { icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-100' },
  system: { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
};

export default function NotificationsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const {
    data: result,
    loading,
    error,
    refetch,
  } = useAsync(
    () => notificationApi.list({ page, limit: 15 }),
    [page]
  );

  const notifications = result?.notifications || [];
  const meta = result?.meta;
  const hasUnread = notifications.some((n) => !n.isRead);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        await notificationApi.markAsRead(id);
        await refetch();
      } catch {
        toast.error('Failed', 'Could not mark notification as read');
      }
    },
    [refetch, toast]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      const count = await notificationApi.markAllAsRead();
      await refetch();
      toast.success('Done', `Marked ${count} notification${count !== 1 ? 's' : ''} as read`);
    } catch {
      toast.error('Failed', 'Could not mark all as read');
    } finally {
      setMarkingAll(false);
    }
  }, [refetch, toast]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await notificationApi.delete(id);
        await refetch();
      } catch {
        toast.error('Failed', 'Could not dismiss notification');
      }
    },
    [refetch, toast]
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && page === 1) return <PageLoader label="Loading notifications..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-brand-800">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} notification${meta.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        {hasUnread && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
          >
            {markingAll ? <Spinner size="sm" /> : <CheckCheck className="h-4 w-4" />}
            Read All
          </Button>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center py-16">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Bell className="h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = typeConfig[n.type] || typeConfig.system;
            const Icon = config.icon;

            return (
              <Card
                key={n.id}
                className={cn(
                  'transition-all',
                  !n.isRead && 'border-l-4 border-l-brand-400 bg-brand-50/30'
                )}
              >
                <CardContent className="flex items-start gap-3 p-3">
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      config.bg
                    )}
                  >
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm',
                          !n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                        )}
                      >
                        {n.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                      {n.message}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col gap-1">
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(n.id)}
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-brand-500"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Dismiss"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
