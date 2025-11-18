'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { logger } from '@/lib/logger';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Get token and email from URL
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');

    if (!tokenParam || !emailParam) {
      toast.error('Invalid invitation link');
      router.push('/auth/signin');
      return;
    }

    setToken(tokenParam);
    setEmail(emailParam);
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          password,
          name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Account created successfully! You can now sign in.');
        router.push('/auth/signin');
      } else {
        toast.error(data.error || 'Failed to create account');
      }
    } catch (error) {
      logger.error({ error }, 'Registration error');
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-sm border-border bg-surface">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <UserPlus className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-xl font-black tracking-tight">
            You&apos;ve been invited!
          </CardTitle>
          <CardDescription className="text-xs text-secondary">
            Create your account to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-secondary">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="h-9 bg-background border-border text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-secondary">
                Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="h-9 bg-background border-border text-sm"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-secondary">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-9 bg-background border-border text-sm"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs text-secondary">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="h-9 bg-background border-border text-sm"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-9 text-xs"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-secondary">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
