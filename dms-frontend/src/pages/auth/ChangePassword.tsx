import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/authApi';

export default function ChangePassword() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const forced = user?.mustChangePassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(next)) {
      setError('Password must be 8+ chars with upper, lower, and a number.');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(current, next);
      // Backend revokes all sessions — force a fresh login.
      logout();
      navigate('/admin/login', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-xl shadow-brand-100/50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-800 shadow-lg shadow-brand-800/30">
          <ShieldCheck className="h-7 w-7 text-accent-400" />
        </div>
        <CardTitle className="font-display text-2xl text-brand-800">Change Password</CardTitle>
        <CardDescription>
          {forced ? 'For security, set a new password before continuing.' : 'Update your account password.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(['current', 'new', 'confirm'] as const).map((field) => {
            const value = field === 'current' ? current : field === 'new' ? next : confirm;
            const setter = field === 'current' ? setCurrent : field === 'new' ? setNext : setConfirm;
            const label = field === 'current' ? 'Current Password' : field === 'new' ? 'New Password' : 'Confirm New Password';
            return (
              <div className="space-y-2" key={field}>
                <Label htmlFor={field}>{label}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input id={field} type="password" value={value} onChange={(e) => setter(e.target.value)} className="pl-10" required />
                </div>
              </div>
            );
          })}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full gap-2" disabled={loading || !current || !next || !confirm}>
            {loading ? <Spinner size="sm" /> : <><span>Update Password</span><ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
