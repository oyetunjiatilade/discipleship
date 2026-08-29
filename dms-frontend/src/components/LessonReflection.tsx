import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { reflectionApi } from '@/api/reflectionApi';
import { BookMarked, CheckCircle2, Circle, PenLine, Save } from 'lucide-react';

interface Props {
  lessonId: string;
  memoryVerse?: string | null;
  actionStep?: string | null;
}

/**
 * The "active lesson" block: memory verse, a checkable action step, and a
 * personal reflection. Turns passive watching into practice and gives mentors
 * something real to follow up on.
 */
export function LessonReflection({ lessonId, memoryVerse, actionStep }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState('');
  const [actionDone, setActionDone] = useState(false);

  useEffect(() => {
    let active = true;
    reflectionApi
      .getForLesson(lessonId)
      .then((r) => {
        if (!active) return;
        if (r) {
          setText(r.text);
          setActionDone(r.actionStepDone);
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [lessonId]);

  const save = async (nextDone?: boolean) => {
    setSaving(true);
    try {
      const saved = await reflectionApi.save(lessonId, {
        text,
        actionStepDone: nextDone !== undefined ? nextDone : actionDone,
      });
      setActionDone(saved.actionStepDone);
      toast.success('Saved', 'Your reflection has been saved.');
    } catch (err: any) {
      toast.error('Could not save', err?.response?.data?.error?.message || 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAction = () => {
    const next = !actionDone;
    setActionDone(next);
    save(next);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PenLine className="h-4 w-4 text-brand-500" /> Reflect &amp; apply
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-4"><Spinner size="sm" /></div>
        ) : (
          <>
            {memoryVerse && (
              <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3">
                <p className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                  <BookMarked className="h-3.5 w-3.5" /> Memory verse
                </p>
                <p className="mt-1 text-sm italic text-gray-700">{memoryVerse}</p>
              </div>
            )}

            {actionStep && (
              <button
                type="button"
                onClick={toggleAction}
                disabled={saving}
                className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-gray-50"
              >
                {actionDone ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
                )}
                <span>
                  <span className="block text-xs font-semibold text-gray-500">This week, do this:</span>
                  <span className={`text-sm ${actionDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {actionStep}
                  </span>
                </span>
              </button>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500">
                What is one thing you're taking away from this lesson?
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="Write your reflection…"
                className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex justify-end">
              <Button size="sm" className="gap-2" disabled={saving} onClick={() => save()}>
                {saving ? <Spinner size="sm" /> : <><Save className="h-4 w-4" /> Save reflection</>}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
