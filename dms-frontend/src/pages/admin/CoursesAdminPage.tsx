import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { courseApi } from '@/api/courseApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { BookOpen, Plus, X, Save } from 'lucide-react';

export default function CoursesAdminPage() {
  const toast = useToast();
  const { data: courses, loading, refetch } = useAsync(() => courseApi.adminListCourses());

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const handleCreate = async () => {
    if (form.title.trim().length < 2 || form.description.trim().length < 10) {
      toast.error('Missing fields', 'Title (2+) and description (10+) are required.');
      return;
    }
    setCreating(true);
    try {
      await courseApi.createCourse({ title: form.title.trim(), description: form.description.trim() });
      toast.success('Course created', `${form.title} added.`);
      setShowCreate(false);
      setForm({ title: '', description: '' });
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not create course.');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await courseApi.updateCourse(id, { isActive: !isActive });
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not update.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-800">Courses</h1>
          <p className="text-sm text-muted-foreground">The Believers Class plus any additional courses. Manage lessons per course under Lessons.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Course
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(courses || []).map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-gray-900">{c.title}</p>
                    {c.isPrimary && <Badge variant="info">Core</Badge>}
                    <Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.totalLessons} lesson{c.totalLessons !== 1 ? 's' : ''}</p>
                </div>
                {!c.isPrimary && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => toggleActive(c.id, c.isActive)}>
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">New Course</CardTitle>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Growth Class" /></div>
              <div>
                <Label>Description</Label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="What this course covers (min 10 chars)" />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
                <Button className="gap-2" onClick={handleCreate} disabled={creating}>{creating ? <Spinner size="sm" /> : <><Save className="h-4 w-4" /> Create</>}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
