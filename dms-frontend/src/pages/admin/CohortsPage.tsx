import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { communityApi } from '@/api/communityApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { Users, Plus, X, Save } from 'lucide-react';

export default function CohortsPage() {
  const toast = useToast();
  const { data: cohorts, loading, refetch } = useAsync(() => communityApi.listCohorts());

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Missing name', 'Cohort name is required.');
      return;
    }
    setCreating(true);
    try {
      await communityApi.createCohort({ name: form.name.trim(), description: form.description.trim() || undefined });
      toast.success('Cohort created', `${form.name} added.`);
      setShowCreate(false);
      setForm({ name: '', description: '' });
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not create cohort.');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      await communityApi.updateCohort(id, { isActive: !isActive });
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not update.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-800">Cohorts</h1>
          <p className="text-sm text-muted-foreground">Class intakes that go through discipleship together.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Cohort
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (cohorts || []).length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-gray-500">No cohorts yet. Create one, then assign converts to it from the Converts page.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cohorts!.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-gray-900">{c.name}</p>
                    <Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {c.description && <p className="truncate text-xs text-muted-foreground">{c.description}</p>}
                  <p className="text-xs text-muted-foreground">{c.memberCount ?? 0} member{(c.memberCount ?? 0) !== 1 ? 's' : ''}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => toggleActive(c.id, c.isActive)}>
                  {c.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">New Cohort</CardTitle>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. March 2026 Intake" /></div>
              <div><Label>Description (optional)</Label><Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
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
