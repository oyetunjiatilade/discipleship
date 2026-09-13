import { useState } from 'react';
import { useAsync } from '@/hooks/useAsync';
import { authApi } from '@/api/authApi';
import { branchApi } from '@/api/branchApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { ShieldCheck, UserPlus, X, Save } from 'lucide-react';

const initialForm = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  password: '',
  branchId: '',
  role: 'admin' as 'admin' | 'super_admin',
};

export default function AdminsPage() {
  const toast = useToast();
  const { data: admins, loading, refetch } = useAsync(() => authApi.listAdmins());
  const { data: branches } = useAsync(() => branchApi.listBranches());

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialForm);

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.phone || !form.email || !form.password) {
      toast.error('Missing fields', 'All fields are required.');
      return;
    }
    if (form.role === 'admin' && !form.branchId) {
      toast.error('Missing branch', 'Select the branch this admin belongs to.');
      return;
    }
    setCreating(true);
    try {
      await authApi.createAdmin({
        ...form,
        branchId: form.role === 'super_admin' ? undefined : form.branchId,
      });
      toast.success('Admin created', `${form.firstName} can now log in with their email.`);
      setShowCreate(false);
      setForm(initialForm);
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not create admin.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-800">Admins</h1>
          <p className="text-sm text-muted-foreground">
            Branch administrators and super admins. They sign in at{' '}
            <span className="font-mono text-brand-600">/admin/login</span>.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4" /> Add Admin
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (admins || []).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-gray-500">
            No admins yet. Add one to manage a branch.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {admins!.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">
                    {a.firstName} {a.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                </div>
                <Badge variant={a.role === 'super_admin' ? 'info' : 'secondary'}>
                  {a.role === 'super_admin' ? 'Super Admin' : 'Branch Admin'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Add Admin</CardTitle>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="08012345678"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="admin@church.org"
                />
              </div>
              <div>
                <Label>Temporary Password</Label>
                <Input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Min 8, upper+lower+number"
                />
              </div>
              <div>
                <Label>Role</Label>
                <div className="flex gap-3">
                  {(['admin', 'super_admin'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, role: r }))}
                      className={`flex-1 rounded-lg border py-2 text-xs font-medium transition-colors ${
                        form.role === r
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {r === 'admin' ? 'Branch Admin' : 'Super Admin'}
                    </button>
                  ))}
                </div>
              </div>
              {form.role === 'admin' && (
                <div>
                  <Label>Branch</Label>
                  <select
                    value={form.branchId}
                    onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select a branch</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                The admin must change this password on first login.
              </p>
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
