import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { adminApi } from '@/api/adminApi';
import { mentorApi } from '@/api/mentorApi';
import { communityApi } from '@/api/communityApi';
import { certificateApi } from '@/api/certificateApi';
import { branchApi } from '@/api/branchApi';
import { useAuthStore } from '@/stores/authStore';
import type { ConvertStageInfo, MentorSummary } from '@/types/care';
import type { Cohort } from '@/types/engagement';
import type { Branch } from '@/types/models';
import { X, ArrowRight, Sparkles, UserCheck, Users, Award, PhoneCall, Building2 } from 'lucide-react';

interface Props {
  convertId: string;
  convertName: string;
  /** The convert's current branch — used to preselect the branch picker (super_admin only). */
  convertBranchId?: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

/**
 * Admin modal to manage a single convert: advance their discipleship stage,
 * confirm Holy Spirit filling, and assign/unassign a mentor.
 */
export function ConvertManageModal({ convertId, convertName, convertBranchId, onClose, onChanged }: Props) {
  const toast = useToast();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin());
  const [info, setInfo] = useState<ConvertStageInfo | null>(null);
  const [mentors, setMentors] = useState<MentorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(convertBranchId ?? '');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stage, mentorList, cohortList] = await Promise.all([
        adminApi.getConvertStage(convertId),
        mentorApi.listMentors(),
        communityApi.listCohorts(),
      ]);
      setInfo(stage);
      setMentors(mentorList);
      setCohorts(cohortList);
    } catch (err: any) {
      toast.error('Failed to load', err?.response?.data?.error?.message || 'Try again.');
    } finally {
      setLoading(false);
    }
  }, [convertId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    branchApi
      .listBranches()
      .then((list) => setBranches(list.filter((b) => b.isActive)))
      .catch(() => setBranches([]));
  }, [isSuperAdmin]);

  useEffect(() => {
    setSelectedBranch(convertBranchId ?? '');
  }, [convertBranchId]);

  const doTransition = async (targetStage: ConvertStageInfo['availableTransitions'][number]['toStage'], label: string) => {
    setBusy(true);
    try {
      await adminApi.transitionStage(convertId, targetStage);
      toast.success('Stage updated', `${convertName} is now "${label}".`);
      await load();
      onChanged?.();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not update stage.');
    } finally {
      setBusy(false);
    }
  };

  const toggleHolySpirit = async () => {
    if (!info) return;
    setBusy(true);
    try {
      const next = !info.current.isHolySpiritFilled;
      await adminApi.setHolySpirit(convertId, next);
      toast.success('Updated', next ? 'Marked as Holy Spirit filled.' : 'Holy Spirit flag cleared.');
      await load();
      onChanged?.();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not update.');
    } finally {
      setBusy(false);
    }
  };

  const assignMentor = async () => {
    if (!selectedMentor) return;
    setBusy(true);
    try {
      await mentorApi.assignConvert(convertId, selectedMentor);
      toast.success('Mentor assigned', 'The convert now has a mentor.');
      setSelectedMentor('');
      onChanged?.();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not assign mentor.');
    } finally {
      setBusy(false);
    }
  };

  const unassignMentor = async () => {
    setBusy(true);
    try {
      await mentorApi.unassignConvert(convertId);
      toast.success('Mentor removed', 'Assignment cleared.');
      onChanged?.();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not remove mentor.');
    } finally {
      setBusy(false);
    }
  };

  const assignCohort = async () => {
    if (!selectedCohort) return;
    setBusy(true);
    try {
      await communityApi.assignCohort(convertId, selectedCohort);
      toast.success('Cohort assigned', 'The convert is now part of that cohort.');
      setSelectedCohort('');
      onChanged?.();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not assign cohort.');
    } finally {
      setBusy(false);
    }
  };

  const downloadCert = async () => {
    setBusy(true);
    try {
      await certificateApi.downloadForConvert(convertId);
    } catch (err: any) {
      toast.error('Not available', err?.response?.data?.error?.message || 'This convert has not completed the class yet.');
    } finally {
      setBusy(false);
    }
  };

  const logCall = async () => {
    setBusy(true);
    try {
      await adminApi.logContact(convertId, contactNote.trim() || undefined);
      toast.success('Call logged', `${convertName} marked as contacted today.`);
      setContactNote('');
      onChanged?.();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not log the call.');
    } finally {
      setBusy(false);
    }
  };

  const changeBranch = async () => {
    if (!selectedBranch || selectedBranch === (convertBranchId ?? '')) return;
    setBusy(true);
    try {
      await adminApi.changeConvertBranch(convertId, selectedBranch);
      const name = branches.find((b) => b.id === selectedBranch)?.name ?? 'the new branch';
      toast.success('Branch changed', `${convertName} moved to ${name}. Mentor and cohort cleared.`);
      onChanged?.();
    } catch (err: any) {
      toast.error('Failed', err?.response?.data?.error?.message || 'Could not change branch.');
      setSelectedBranch(convertBranchId ?? '');
    } finally {
      setBusy(false);
    }
  };

  const adminTransitions = info?.availableTransitions.filter((t) => t.trigger === 'admin_manual') ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Manage {convertName}</CardTitle>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : info ? (
            <>
              {/* Current stage */}
              <div>
                <p className="text-xs text-muted-foreground">Current stage</p>
                <Badge variant="info" className="mt-1">{info.current.stageLabel}</Badge>
                {info.current.isHolySpiritFilled && (
                  <Badge variant="success" className="ml-2 mt-1 gap-1">
                    <Sparkles className="h-3 w-3" /> Holy Spirit
                  </Badge>
                )}
              </div>

              {/* Advance stage */}
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">Advance stage</p>
                {adminTransitions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No manual transitions available from here (next steps are automatic as the convert progresses).
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {adminTransitions.map((t) => (
                      <Button
                        key={t.toStage}
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={busy}
                        onClick={() => doTransition(t.toStage, t.toLabel)}
                      >
                        <ArrowRight className="h-3 w-3" /> {t.toLabel}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Holy Spirit */}
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">Holy Spirit baptism</p>
                <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={toggleHolySpirit}>
                  <Sparkles className="h-3 w-3" />
                  {info.current.isHolySpiritFilled ? 'Clear Holy Spirit flag' : 'Mark as Holy Spirit filled'}
                </Button>
              </div>

              {/* Mentor assignment */}
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">Mentor</p>
                {mentors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No mentors yet. Create mentor accounts under Mentors.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedMentor}
                      onChange={(e) => setSelectedMentor(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">Select a mentor…</option>
                      {mentors.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.flockCount})
                        </option>
                      ))}
                    </select>
                    <Button size="sm" className="gap-1" disabled={busy || !selectedMentor} onClick={assignMentor}>
                      <UserCheck className="h-3 w-3" /> Assign
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" disabled={busy} onClick={unassignMentor}>
                      Remove mentor
                    </Button>
                  </div>
                )}
              </div>

              {/* Log a call */}
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">Log a call</p>
                <div className="flex gap-2">
                  <input
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                    placeholder="Optional note (what you discussed)…"
                    className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  />
                  <Button size="sm" className="gap-1" disabled={busy} onClick={logCall}>
                    <PhoneCall className="h-3 w-3" /> Log call
                  </Button>
                </div>
              </div>

              {/* Certificate */}
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">Certificate</p>
                <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={downloadCert}>
                  <Award className="h-3 w-3" /> Download completion certificate
                </Button>
              </div>

              {/* Cohort assignment */}
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">Cohort</p>
                {cohorts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No cohorts yet. Create one under Cohorts.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedCohort}
                      onChange={(e) => setSelectedCohort(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">Select a cohort…</option>
                      {cohorts.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <Button size="sm" className="gap-1" disabled={busy || !selectedCohort} onClick={assignCohort}>
                      <Users className="h-3 w-3" /> Assign
                    </Button>
                  </div>
                )}
              </div>

              {/* Branch (super_admin only) */}
              {isSuperAdmin && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-sm font-semibold text-gray-700">
                    <Building2 className="h-3.5 w-3.5" /> Branch
                  </p>
                  {branches.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No active branches to move to.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="">Select a branch…</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={busy || !selectedBranch || selectedBranch === (convertBranchId ?? '')}
                          onClick={changeBranch}
                        >
                          <Building2 className="h-3 w-3" /> Move
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Moving to another branch clears this convert's mentor and cohort.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* History */}
              {info.history.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700">Stage history</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {info.history.slice(0, 5).map((h) => (
                      <li key={h.id}>
                        {h.fromStage ? `${h.fromStage} → ` : ''}{h.toStage}
                        {' · '}
                        {new Date(h.transitionedAt).toLocaleDateString('en-NG')}
                        {h.trigger === 'admin_manual' ? ' (admin)' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-red-500">Could not load convert.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
