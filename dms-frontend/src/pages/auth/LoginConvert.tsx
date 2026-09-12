import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, KeyRound, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { AuthResponse } from '@/types/auth';

export default function LoginConvert() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiClient.post('/v1/auth/login', { phone });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
        '/v1/auth/login/verify',
        { phone, code }
      );
      setAuth(data.data.user, data.data.tokens);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-xl shadow-brand-100/50">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-2xl text-brand-800">Welcome Back</CardTitle>
        <CardDescription>
          {step === 'phone'
            ? 'Enter your phone number to receive a login code'
            : 'Enter the 6-digit code sent to your phone'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+234 801 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={loading || !phone}>
              {loading ? <Spinner size="sm" /> : <><span>Send Code</span><ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="pl-10 text-center font-mono text-lg tracking-widest"
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full gap-2" disabled={loading || code.length !== 6}>
              {loading ? <Spinner size="sm" /> : <><span>Verify & Login</span><ArrowRight className="h-4 w-4" /></>}
            </Button>
            <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
              Use a different number
            </Button>
          </form>
        )}

        <div className="mt-6 space-y-2 text-center text-sm text-gray-500">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-brand-500 hover:underline">
              Register
            </Link>
          </p>
          <p>
            Admin?{' '}
            <Link to="/admin/login" className="font-medium text-brand-500 hover:underline">
              Login here
            </Link>
          </p>
          <p>
            Mentor?{' '}
            <Link to="/mentor/login" className="font-medium text-brand-500 hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
