import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { mentorApi } from '@/api/mentorApi';
import { branchApi } from '@/api/branchApi';
import { useAuthStore } from '@/stores/authStore';
import { FlockList } from '@/components/FlockList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import type { FlockMember } from '@/types/care';
import { HeartHandshake, UserPlus, X, Save, Users, Eye } from 'lucide-react';

export default function MentorsPage() {
  const toast = useToast();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const { data: mentors, loading, refetch } = useAsync(() => mentorApi.listMentors());
  const { data: branches } = useAsync(() => branchApi.listBranches(), [], isSuperAdmin);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    branchId: '',
  });

  const [viewing, setViewing] = useState<{ id: string; name: string } | null>(null);
  const [flock, setFlock] = useState<FlockMember[]>([]);
  const [flockLoading, setFlockLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.phone || !form.email || !form.password) {
      toast.error('Missing fields', 'All fields are required.');
      return;
    }
    if (isSuperAdmin && !form.branchId) {
      toast.error('Missing branch', 'Select the branch this mentor belongs to.');
      return;
    }
    setCreating(true);
    try {
      await mentorApi.createMentor({ ...form, branchId: form.branchId || undefined });
      toast.success('Mentor created', `${form.firstName} can now log in with their email.`);
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', phone: '', email: '', password: '', branchId: '' });
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not create mentor.');
    } finally {
      setCreating(false);
    }
  };

  const viewFlock = async (id: string, name: string) => {
    setViewing({ id, name });
    setFlockLoading(true);
    try {
      setFlock(await mentorApi.getFlock(id));
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not load flock.');
    } finally {
      setFlockLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-800">Mentors</h1>
          <p className="text-sm text-muted-foreground">Staff who shepherd converts one-to-one. Mentors sign in at <span className="font-mono text-brand-600">/mentor/login</span>.</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4" /> Add Mentor
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (mentors || []).length === 0 ? (
        <Card><CardContent className="py-16 text-center text-sm text-gray-500">No mentors yet. Add one to start assigning converts.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {mentors!.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{m.firstName} {m.lastName}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> {m.flockCount} in flock</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => viewFlock(m.id, `${m.firstName} ${m.lastName}`)}>
                  <Eye className="h-3 w-3" /> Flock
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create mentor dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Add Mentor</CardTitle>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First Name</Label><Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
                <div><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
              </div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="08012345678" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="mentor@church.org" /></div>
              <div><Label>Temporary Password</Label><Input type="text" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min 8, upper+lower+number" /></div>
              {isSuperAdmin && (
                <div>
                  <Label>Branch</Label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select a branch</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-xs text-muted-foreground">The mentor must change this password on first login.</p>
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
                <Button className="gap-2" onClick={handleCreate} disabled={creating}>{creating ? <Spinner size="sm" /> : <><Save className="h-4 w-4" /> Create</>}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View flock dialog */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">{viewing.name}'s flock</CardTitle>
              <button onClick={() => setViewing(null)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent>
              {flockLoading ? <div className="flex justify-center py-8"><Spinner /></div> : <FlockList members={flock} />}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
