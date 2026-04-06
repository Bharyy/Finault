import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShineBorder } from '@/components/magicui/shine-border';
import { InteractiveGridPattern } from '@/components/magicui/interactive-grid-pattern';
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';

export default function LoginPage() {
  const { user, login, register, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (role: string) => {
    const creds: Record<string, { email: string; password: string }> = {
      admin: { email: 'rahul@finault.com', password: 'Admin@123' },
      analyst: { email: 'priya@finault.com', password: 'Analyst@123' },
      viewer: { email: 'arjun@finault.com', password: 'Viewer@123' },
    };
    const c = creds[role];
    if (c) {
      setEmail(c.email);
      setPassword(c.password);
      setIsRegister(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-surface-secondary flex items-center justify-center p-4 overflow-hidden">
      <InteractiveGridPattern
        className={cn(
          '[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]',
          'inset-x-0 inset-y-[-30%] h-[200%] skew-y-12 text-text-muted'
        )}
      />

      <div className="absolute top-4 right-4 z-20">
        <AnimatedThemeToggler />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl mb-4 shadow-lg shadow-primary/25">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text">Finault</h1>
          <p className="text-text-secondary mt-1">Finance Dashboard with RBAC & Anomaly Detection</p>
        </div>

        <Card className="relative overflow-hidden">
          <ShineBorder shineColor={['#6366f1', '#a78bfa', '#818cf8']} />
          <CardHeader>
            <CardTitle>{isRegister ? 'Create Account' : 'Sign In'}</CardTitle>
            <CardDescription>
              {isRegister
                ? 'Enter your details to create a new account'
                : 'Enter your credentials to access your dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-4">
              {isRegister && (
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {isRegister && (
                  <p className="text-xs text-text-muted">Min 8 chars, uppercase, number, special char</p>
                )}
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              {isRegister ? 'Already have an account? Sign in' : "Need an account? Register"}
            </button>
          </CardFooter>
        </Card>

        <Card className="mt-4">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-text-muted mb-3">Quick Demo Login</p>
            <div className="flex gap-2">
              {(['admin', 'analyst', 'viewer'] as const).map((role) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemo(role)}
                  className="flex-1 capitalize"
                >
                  {role}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
