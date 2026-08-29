import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { User, Phone, Calendar, Shield, LogOut, Sparkles, Pencil, Save, X, Building2, WifiOff, Award } from 'lucide-react';
import { STAGE_LABELS, DiscipleshipStage } from '@/constants/enums';
import { DEPARTMENTS } from '@/constants/departments';
import apiClient from '@/api/client';
import { meApi } from '@/api/meApi';
import { certificateApi } from '@/api/certificateApi';

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lowData, setLowData] = useState(user?.lowDataMode ?? false);
  const [savingLowData, setSavingLowData] = useState(false);

  const toggleLowData = async () => {
    const next = !lowData;
    setLowData(next);
    setSavingLowData(true);
    try {
      const updated = await meApi.updateProfile({ lowDataMode: next });
      setUser(updated);
    } catch (err: any) {
      setLowData(!next);
      toast.error('Could not update', err?.response?.data?.error?.message || 'Try again.');
    } finally {
      setSavingLowData(false);
    }
  };

  const certEligible =
    !!user?.currentStage &&
    [DiscipleshipStage.CLASS_COMPLETED, DiscipleshipStage.BAPTIZED, DiscipleshipStage.MEMBER_TRANSFERRED].includes(
      user.currentStage as DiscipleshipStage
    );
  const [downloadingCert, setDownloadingCert] = useState(false);
  const downloadCert = async () => {
    setDownloadingCert(true);
    try {
      await certificateApi.downloadOwn();
    } catch (err: any) {
      toast.error('Not available yet', err?.response?.data?.error?.message || 'Complete the class to unlock your certificate.');
    } finally {
      setDownloadingCert(false);
    }
  };
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    address: '',
    gender: '' as '' | 'male' | 'female',
    departmentSelect: '' as string,
    departmentCustom: '',
    departmentStatus: '' as '' | 'member' | 'interested',
  });

  const handleLogout = async () => {
    try {
      await apiClient.post('/v1/auth/logout');
    } catch {
      // Silent
    } finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const startEdit = () => {
    const dept = user?.department || '';
    const known = DEPARTMENTS.includes(dept);
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      address: '',
      gender: '',
      departmentSelect: dept ? (known ? dept : 'OTHER') : '',
      departmentCustom: dept && !known ? dept : '',
      departmentStatus: user?.departmentStatus || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Missing fields', 'First and last name are required.');
      return;
    }
    const department =
      form.departmentSelect === 'OTHER' ? form.departmentCustom.trim() : form.departmentSelect;

    setSaving(true);
    try {
      const updated = await meApi.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        address: form.address.trim() || undefined,
        gender: form.gender || undefined,
        department: department || null,
        departmentStatus: department ? form.departmentStatus || null : null,
      });
      setUser(updated);
      toast.success('Profile updated', 'Your changes have been saved.');
      setEditing(false);
    } catch (err: any) {
      toast.error('Update failed', err?.response?.data?.error?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const stageLabel = user?.currentStage ? STAGE_LABELS[user.currentStage as DiscipleshipStage] : null;
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  const departmentDisplay = user?.department
    ? `${user.department}${user.departmentStatus === 'interested' ? ' (wants to join)' : user.departmentStatus === 'member' ? ' (member)' : ''}`
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-800">My Profile</h1>
          <p className="text-sm text-muted-foreground">Your account information.</p>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" className="gap-2" onClick={startEdit}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}
      </div>

      {/* Avatar */}
      <Card>
        <CardContent className="flex flex-col items-center py-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600">
            {initials}
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-gray-900">
            {user?.firstName} {user?.lastName}
          </h2>
          {stageLabel && <Badge variant="info" className="mt-2">{stageLabel}</Badge>}
          {user?.isHolySpiritFilled && (
            <Badge variant="success" className="mt-1 gap-1">
              <Sparkles className="h-3 w-3" /> Holy Spirit Filled
            </Badge>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pf-first">First Name *</Label>
                <Input id="pf-first" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="pf-last">Last Name *</Label>
                <Input id="pf-last" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="pf-address">Address</Label>
              <Input id="pf-address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="Where you live" />
            </div>
            <div>
              <Label>Gender</Label>
              <div className="flex gap-3">
                {(['male', 'female'] as const).map((g) => (
                  <button key={g} type="button" onClick={() => setForm((p) => ({ ...p, gender: p.gender === g ? '' : g }))}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${form.gender === g ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Department */}
            <div>
              <Label htmlFor="pf-dept">Church Department</Label>
              <select
                id="pf-dept"
                value={form.departmentSelect}
                onChange={(e) => setForm((p) => ({ ...p, departmentSelect: e.target.value }))}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">None / not sure yet</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="OTHER">Other (type below)</option>
              </select>
              {form.departmentSelect === 'OTHER' && (
                <Input
                  className="mt-2"
                  placeholder="Enter your department"
                  value={form.departmentCustom}
                  onChange={(e) => setForm((p) => ({ ...p, departmentCustom: e.target.value }))}
                />
              )}
            </div>

            {/* Department status — only when a department is chosen */}
            {form.departmentSelect !== '' && (
              <div>
                <Label>Are you already in this department?</Label>
                <div className="flex gap-3">
                  {([
                    { key: 'member', label: "Yes, I'm a member" },
                    { key: 'interested', label: 'No, I want to join' },
                  ] as const).map((opt) => (
                    <button key={opt.key} type="button"
                      onClick={() => setForm((p) => ({ ...p, departmentStatus: p.departmentStatus === opt.key ? '' : opt.key }))}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${form.departmentStatus === opt.key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving} className="gap-1">
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Spinner size="sm" /> : <><Save className="h-4 w-4" /> Save</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Detail icon={<User className="h-4 w-4 text-gray-500" />} label="Full Name" value={`${user?.firstName} ${user?.lastName}`} />
            <Detail icon={<Phone className="h-4 w-4 text-gray-500" />} label="Phone" value={user?.phone || '—'} />
            <Detail icon={<Building2 className="h-4 w-4 text-gray-500" />} label="Department" value={departmentDisplay} />
            <Detail icon={<Shield className="h-4 w-4 text-gray-500" />} label="Current Stage" value={stageLabel || '—'} />
            <Detail icon={<Calendar className="h-4 w-4 text-gray-500" />} label="Joined" value={formatDate(user?.createdAt)} />
          </CardContent>
        </Card>
      )}

      {certEligible && (
        <Card className="border-brand-200 bg-brand-50/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100">
                <Award className="h-4 w-4 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Completion certificate</p>
                <p className="text-xs text-muted-foreground">You've completed the class — download your certificate.</p>
              </div>
            </div>
            <Button size="sm" className="gap-2" disabled={downloadingCert} onClick={downloadCert}>
              {downloadingCert ? <Spinner size="sm" /> : <><Award className="h-4 w-4" /> Download</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data-saver toggle */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
              <WifiOff className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Data-saver mode</p>
              <p className="text-xs text-muted-foreground">Don't auto-load videos; read transcripts instead.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleLowData}
            disabled={savingLowData}
            aria-pressed={lowData}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${lowData ? 'bg-brand-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${lowData ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full gap-2 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
