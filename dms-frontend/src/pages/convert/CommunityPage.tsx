import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { useAuthStore } from '@/stores/authStore';
import { communityApi } from '@/api/communityApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import type { Post, PostType } from '@/types/engagement';
import { HandHeart, Sparkles, MessageSquare, Send, Trash2, Users } from 'lucide-react';

const typeMeta: Record<PostType, { label: string; icon: typeof HandHeart; color: string }> = {
  prayer: { label: 'Prayer', icon: HandHeart, color: 'text-violet-500' },
  praise: { label: 'Praise', icon: Sparkles, color: 'text-amber-500' },
  message: { label: 'Message', icon: MessageSquare, color: 'text-brand-500' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CommunityPage() {
  const toast = useToast();
  const myId = useAuthStore((s) => s.user?.id);
  const { data, loading } = useAsync(() => communityApi.getFeed());

  const [type, setType] = useState<PostType>('message');
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState<Post[] | null>(null);

  const feedPosts = posts ?? data?.posts ?? [];
  const cohort = data?.cohort ?? null;

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const post = await communityApi.createPost({ type, text: text.trim() });
      setPosts([post, ...feedPosts]);
      setText('');
      setType('message');
    } catch (err: any) {
      toast.error('Could not post', err?.response?.data?.error?.message || 'Try again.');
    } finally {
      setPosting(false);
    }
  };

  const amen = async (postId: string) => {
    try {
      const updated = await communityApi.toggleAmen(postId);
      setPosts(feedPosts.map((p) => (p.id === postId ? updated : p)));
    } catch {
      /* ignore */
    }
  };

  const remove = async (postId: string) => {
    try {
      await communityApi.deletePost(postId);
      setPosts(feedPosts.filter((p) => p.id !== postId));
    } catch (err: any) {
      toast.error('Could not delete', err?.response?.data?.error?.message || 'Try again.');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  if (!cohort) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-brand-800">Community</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-600">You're not in a class group yet.</p>
            <p className="text-xs text-muted-foreground">An admin will add you to a cohort so you can pray and share with others.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-800">{cohort.name}</h1>
        <p className="text-sm text-muted-foreground">Share a prayer, a praise, or encourage someone.</p>
      </div>

      {/* Composer */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex gap-2">
            {(Object.keys(typeMeta) as PostType[]).map((t) => {
              const M = typeMeta[t];
              return (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-xs font-medium transition-colors ${type === t ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <M.icon className={`h-3.5 w-3.5 ${type === t ? '' : M.color}`} /> {M.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Write something for your group…"
            className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" disabled={posting || !text.trim()} onClick={submit}>
              {posting ? <Spinner size="sm" /> : <><Send className="h-4 w-4" /> Share</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      {feedPosts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No posts yet — be the first to share.</p>
      ) : (
        <div className="space-y-3">
          {feedPosts.map((p) => {
            const M = typeMeta[p.type];
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
                        {p.authorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.authorName}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <M.icon className={`h-3 w-3 ${M.color}`} /> {M.label} · {timeAgo(p.createdAt)}
                        </p>
                      </div>
                    </div>
                    {p.authorId === myId && (
                      <button onClick={() => remove(p.id)} className="rounded p-1 text-gray-300 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{p.text}</p>
                  <button
                    onClick={() => amen(p.id)}
                    className={`mt-3 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${p.amenedByMe ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-brand-300'}`}
                  >
                    🙏 Amen{p.amenCount > 0 ? ` · ${p.amenCount}` : ''}
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
