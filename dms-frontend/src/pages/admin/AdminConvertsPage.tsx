import { useState, useCallback, useMemo } from 'react';
import { useAdminConverts } from '@/hooks/useAdminConverts';
import { useAsync } from '@/hooks/useAsync';
import { FunnelCounts } from '@/components/DiscipleshipStats';
import { adminApi } from '@/api/adminApi';
import { branchApi } from '@/api/branchApi';
import { useAuthStore } from '@/stores/authStore';
import { UsersTable } from '@/components/UsersTable';
import { ConvertManageModal } from '@/components/ConvertManageModal';
import type { ConvertReportRow } from '@/types/models';
import { StageFilter } from '@/components/StageFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import {
  Users,
  Search,
  Download,
  TrendingUp,
  AlertCircle,
  UserPlus,
  X,
  Save,
  Calendar,
} from 'lucide-react';

export default function AdminConvertsPage() {
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());

  const {
    converts,
    summary,
    meta,
    loading,
    error,
    filters,
    setStage,
    setSearch,
    setBranchId,
    setPage,
    setDateRange,
    refetch,
    downloadCsv,
    csvLoading,
  } = useAdminConverts(20);

  const { data: stats, refetch: refetchStats } = useAsync(() => adminApi.getDiscipleshipStats(), []);
  const { data: branches } = useAsync(() => branchApi.listBranches(), [], isSuperAdmin);
  const branchNames = useMemo(
    () => (isSuperAdmin ? Object.fromEntries((branches || []).map((b) => [b.id, b.name])) : undefined),
    [isSuperAdmin, branches]
  );

  // ── Date range state ──
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const applySearch = useCallback(() => {
    setSearch(searchInput.trim());
  }, [searchInput, setSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applySearch();
  };

  const applyDateRange = () => {
    setDateRange(dateFrom || undefined, dateTo || undefined);
  };

  const clearDateRange = () => {
    setDateFrom('');
    setDateTo('');
    setDateRange(undefined, undefined);
  };

  const handleCsvDownload = async () => {
    try {
      await downloadCsv();
      toast.success('CSV Downloaded', 'Report exported successfully.');
    } catch {
      toast.error('Export Failed', 'Could not download CSV.');
    }
  };

  // ── Create Convert Dialog ──
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: '' as '' | 'male' | 'female',
    invitedBy: '',
    branchId: '',
  });
  const [creating, setCreating] = useState(false);

  // ── Manage convert modal ──
  const [managing, setManaging] = useState<ConvertReportRow | null>(null);

  const handleCreate = async () => {
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.phone.trim()) {
      toast.error('Missing Fields', 'First name, last name, and phone are required.');
      return;
    }
    if (isSuperAdmin && !createForm.branchId) {
      toast.error('Missing branch', 'Select the branch this convert belongs to.');
      return;
    }
    setCreating(true);
    try {
      await adminApi.createConvert({
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        phone: createForm.phone.trim(),
        gender: createForm.gender || undefined,
        invitedBy: createForm.invitedBy.trim() || undefined,
        branchId: isSuperAdmin ? createForm.branchId : undefined,
      });
      toast.success('Convert Created', `${createForm.firstName} ${createForm.lastName} added.`);
      setShowCreate(false);
      setCreateForm({ firstName: '', lastName: '', phone: '', gender: '', invitedBy: '', branchId: '' });
      await refetch();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not create convert.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-800">Converts</h1>
          <p className="text-sm text-muted-foreground">
            {meta ? `${meta.total} convert${meta.total !== 1 ? 's' : ''} total` : 'Manage all converts'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => setShowCreate(true)}>
            <UserPlus className="h-4 w-4" />
            Add Convert
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleCsvDownload} disabled={csvLoading}>
            {csvLoading ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Discipleship funnel counts */}
      {stats && <FunnelCounts stats={stats} />}

      {/* Filters */}
      <Card>
        <CardContent className="space-y-4 p-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by name or phone..."
                className="pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={applySearch}
              />
            </div>
            <Button variant="outline" onClick={applySearch}>Search</Button>
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" /> From
              </Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="mb-1 text-xs text-muted-foreground">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={applyDateRange}>Apply</Button>
            {(filters.salvationDateFrom || filters.salvationDateTo) && (
              <Button variant="ghost" size="sm" onClick={clearDateRange} className="text-xs text-muted-foreground">
                <X className="mr-1 h-3 w-3" /> Clear dates
              </Button>
            )}
          </div>

          {/* Stage Filter */}
          <StageFilter value={filters.stage} onChange={setStage} />

          {/* Branch Filter (super_admin only) */}
          {isSuperAdmin && (
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Branch</Label>
              <select
                value={filters.branchId || ''}
                onChange={(e) => setBranchId(e.target.value || undefined)}
                className="flex h-10 w-56 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All branches</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="flex-1 text-sm font-medium text-red-800">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <UsersTable
        converts={converts}
        meta={meta}
        loading={loading}
        page={filters.page || 1}
        onPageChange={setPage}
        onManage={setManaging}
        branchNames={branchNames}
      />

      {/* ═══════════ MANAGE CONVERT MODAL ═══════════ */}
      {managing && (
        <ConvertManageModal
          convertId={managing.id}
          convertName={managing.fullName}
          convertBranchId={managing.branchId}
          onClose={() => setManaging(null)}
          onChanged={() => {
            refetch();
            refetchStats();
          }}
        />
      )}

      {/* ═══════════ CREATE CONVERT DIALOG ═══════════ */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Add New Convert</CardTitle>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cf-first">First Name *</Label>
                  <Input id="cf-first" value={createForm.firstName} onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="John" />
                </div>
                <div>
                  <Label htmlFor="cf-last">Last Name *</Label>
                  <Input id="cf-last" value={createForm.lastName} onChange={(e) => setCreateForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Doe" />
                </div>
              </div>
              <div>
                <Label htmlFor="cf-phone">Phone *</Label>
                <Input id="cf-phone" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} placeholder="08012345678" />
              </div>
              <div>
                <Label>Gender</Label>
                <div className="flex gap-3">
                  {(['male', 'female'] as const).map((g) => (
                    <button key={g} type="button" onClick={() => setCreateForm((p) => ({ ...p, gender: p.gender === g ? '' : g }))}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${createForm.gender === g ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="cf-invited">Invited By (optional)</Label>
                <Input id="cf-invited" value={createForm.invitedBy} onChange={(e) => setCreateForm((p) => ({ ...p, invitedBy: e.target.value }))} placeholder="Name of inviter" />
              </div>
              {isSuperAdmin && (
                <div>
                  <Label htmlFor="cf-branch">Branch *</Label>
                  <select
                    id="cf-branch"
                    value={createForm.branchId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, branchId: e.target.value }))}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select a branch</option>
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
                <Button className="gap-2" onClick={handleCreate} disabled={creating}>
                  {creating ? <Spinner size="sm" /> : <><Save className="h-4 w-4" />Create</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
