import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, HeartHandshake } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { AuthResponse } from '@/types/auth';

export default function LoginMentor() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.post<ApiSuccessResponse<AuthResponse>>(
        '/v1/auth/admin/login',
        { email, password }
      );
      setAuth(data.data.user, data.data.tokens);
      const u = data.data.user;
      if (u.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate(u.role === 'admin' ? '/admin' : '/mentor/flock', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-xl shadow-brand-100/50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-800 shadow-lg shadow-brand-800/30">
          <HeartHandshake className="h-7 w-7 text-accent-400" />
        </div>
        <CardTitle className="font-display text-2xl text-brand-800">Mentor Login</CardTitle>
        <CardDescription>Sign in to see the people you're walking with</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input id="email" type="email" placeholder="mentor@church.org" value={email}
                onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input id="password" type="password" placeholder="Enter password" value={password}
                onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full gap-2" disabled={loading || !email || !password}>
            {loading ? <Spinner size="sm" /> : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Convert?{' '}
          <Link to="/login" className="font-medium text-brand-500 hover:underline">Login with phone</Link>
        </div>
      </CardContent>
    </Card>
  );
}
