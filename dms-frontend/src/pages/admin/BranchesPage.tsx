import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { branchApi } from '@/api/branchApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { Building2, Plus, X, Save } from 'lucide-react';

export default function BranchesPage() {
  const toast = useToast();
  const { data: branches, loading, refetch } = useAsync(() => branchApi.listBranches());

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Missing name', 'Enter a branch name.');
      return;
    }
    setCreating(true);
    try {
      await branchApi.createBranch({ name: name.trim() });
      toast.success('Branch created', `"${name.trim()}" can now onboard converts and staff.`);
      setShowCreate(false);
      setName('');
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not create branch.');
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    setTogglingId(id);
    try {
      await branchApi.updateBranch(id, { isActive: !isActive });
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not update branch.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-800">Branches</h1>
          <p className="text-sm text-muted-foreground">
            Church locations onboarded onto the platform. Converts pick one at registration.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Add Branch
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (branches || []).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-gray-500">
            No branches yet. Add one to start onboarding converts.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {branches!.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{b.name}</p>
                  <Badge variant={b.isActive ? 'default' : 'secondary'}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={togglingId === b.id}
                  onClick={() => toggleActive(b.id, b.isActive)}
                >
                  {togglingId === b.id ? <Spinner size="sm" /> : b.isActive ? 'Deactivate' : 'Activate'}
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
              <CardTitle className="text-lg">Add Branch</CardTitle>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Branch Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lagos" />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button className="gap-2" onClick={handleCreate} disabled={creating}>
                  {creating ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Create
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
