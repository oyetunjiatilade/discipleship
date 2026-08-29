import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/authApi';
import { useAuthStore } from '@/stores/authStore';
import { registerSchema, type RegisterFormData } from '@/lib/validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  UserPlus,
  Phone,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEPARTMENTS } from '@/constants/departments';
import { branchApi } from '@/api/branchApi';
import { useAsync } from '@/hooks/useAsync';

type Step = 'info' | 'otp';

export default function RegisterConvert() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<Step>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: branches, loading: branchesLoading } = useAsync(
    () => branchApi.listPublicBranches(),
    []
  );

  // ── Step 1: Registration info ──
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    branchId: '',
    gender: '' as '' | 'male' | 'female',
    invitedBy: '',
    departmentSelect: '' as string,
    departmentCustom: '',
    departmentStatus: '' as '' | 'member' | 'interested',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Step 2: OTP ──
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null); // dev mode OTP hint

  const setField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setError(null);
  };

  // ── Step 1: Submit registration ──
  const handleRegister = useCallback(async () => {
    // Validate with Zod
    const department =
      form.departmentSelect === 'OTHER' ? form.departmentCustom.trim() : form.departmentSelect;
    const parsed = registerSchema.safeParse({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      branchId: form.branchId,
      gender: form.gender || undefined,
      invitedBy: form.invitedBy || undefined,
      department: department || undefined,
      departmentStatus: department ? form.departmentStatus || undefined : undefined,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed.error.issues.forEach((e: any) => {
        const field = String(e.path[0]);
        if (!errors[field]) errors[field] = e.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await authApi.register(parsed.data);
      // In dev mode, backend may return otp in response
      if (result.otp) {
        setDevOtp(result.otp);
      }
      setStep('otp');
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [form]);

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await authApi.verifyRegistrationOtp({
        phone: form.phone,
        code: otp,
      });
      useAuthStore.getState().setJustRegistered(true);
      setAuth(result.user, result.tokens);
      navigate('/welcome', { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message || 'Invalid or expired OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [otp, form.phone, setAuth, navigate]);

  // Step indicator
  const steps = [
    { key: 'info', label: 'Your Info', icon: UserPlus },
    { key: 'otp', label: 'Verify Phone', icon: ShieldCheck },
  ];
  const currentStepIdx = step === 'info' ? 0 : 1;

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className={cn(
                  'h-0.5 w-8',
                  idx <= currentStepIdx ? 'bg-brand-400' : 'bg-gray-200'
                )}
              />
            )}
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                idx === currentStepIdx
                  ? 'bg-brand-500 text-white'
                  : idx < currentStepIdx
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-400'
              )}
            >
              {idx < currentStepIdx ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <s.icon className="h-3 w-3" />
              )}
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="font-display text-xl">
            {step === 'info' ? 'Join the Believers Class' : 'Verify Your Phone'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === 'info'
              ? 'Create your account to begin your discipleship journey.'
              : `We sent a 6-digit code to ${form.phone}`}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ═══════════════════════════════════════
              STEP 1: REGISTRATION INFO
             ═══════════════════════════════════════ */}
          {step === 'info' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setField('firstName', e.target.value)}
                    placeholder="John"
                    className={fieldErrors.firstName ? 'border-red-400' : ''}
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => setField('lastName', e.target.value)}
                    placeholder="Doe"
                    className={fieldErrors.lastName ? 'border-red-400' : ''}
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setField('phone', e.target.value)}
                    placeholder="08012345678"
                    className={cn('pl-9', fieldErrors.phone && 'border-red-400')}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
                )}
              </div>

              <div>
                <Label htmlFor="branchId">Branch *</Label>
                <select
                  id="branchId"
                  value={form.branchId}
                  onChange={(e) => setField('branchId', e.target.value)}
                  disabled={branchesLoading}
                  className={cn(
                    'mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    fieldErrors.branchId && 'border-red-400'
                  )}
                >
                  <option value="">
                    {branchesLoading ? 'Loading branches…' : 'Select your branch'}
                  </option>
                  {branches?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.branchId && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.branchId}</p>
                )}
              </div>

              <div>
                <Label>Gender</Label>
                <div className="flex gap-3">
                  {(['male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setField('gender', form.gender === g ? '' : g)}
                      className={cn(
                        'flex-1 rounded-lg border py-2 text-sm font-medium capitalize transition-colors',
                        form.gender === g
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="invitedBy">Who invited you? (optional)</Label>
                <Input
                  id="invitedBy"
                  value={form.invitedBy}
                  onChange={(e) => setField('invitedBy', e.target.value)}
                  placeholder="Name of the person who invited you"
                />
              </div>

              <div>
                <Label htmlFor="department">Church Department (optional)</Label>
                <select
                  id="department"
                  value={form.departmentSelect}
                  onChange={(e) => setField('departmentSelect', e.target.value)}
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
                    value={form.departmentCustom}
                    onChange={(e) => setField('departmentCustom', e.target.value)}
                    placeholder="Enter your department"
                  />
                )}
                {form.departmentSelect !== '' && (
                  <div className="mt-2 flex gap-3">
                    {([
                      { key: 'member', label: "I'm a member" },
                      { key: 'interested', label: 'I want to join' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setField('departmentStatus', form.departmentStatus === opt.key ? '' : opt.key)}
                        className={cn(
                          'flex-1 rounded-lg border py-2 text-xs font-medium transition-colors',
                          form.departmentStatus === opt.key
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-brand-500 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {/* ═══════════════════════════════════════
              STEP 2: OTP VERIFICATION
             ═══════════════════════════════════════ */}
          {step === 'otp' && (
            <>
              {devOtp && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <strong>Dev Mode:</strong> OTP is <code className="font-mono font-bold">{devOtp}</code>
                </div>
              )}

              <div>
                <Label htmlFor="otp">Enter 6-digit code</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(val);
                    setError(null);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center font-mono text-2xl tracking-[0.5em]"
                  autoFocus
                />
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verify & Continue
                  </>
                )}
              </Button>

              <button
                onClick={() => {
                  setStep('info');
                  setOtp('');
                  setDevOtp(null);
                  setError(null);
                }}
                className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-brand-500"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to registration
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
