'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { useFirebase } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getFriendlyLoginErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email or password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error while signing in. Please try again.';
    default:
      return 'Unable to sign in right now. Please try again.';
  }
}

export function LoginForm() {
  const router = useRouter();
  const { auth } = useFirebase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const idToken = await credential.user.getIdToken();
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken }),
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          await signOut(auth);
          throw new Error(
            response.status >= 500
              ? 'Sign-in is temporarily unavailable. Please try again shortly.'
              : payload?.error || 'Unable to sign in right now. Please try again.'
          );
        }

        router.push('/');
        router.refresh();
      } catch (error) {
        const message =
          typeof error === 'object' && error && 'code' in error
            ? getFriendlyLoginErrorMessage(error)
            : error instanceof Error && error.message
              ? error.message
              : 'Unable to sign in right now. Please try again.';
        setErrorMessage(message);
      }
    });
  };

  return (
    <Card className="w-full max-w-md border-border/70 bg-white/95 shadow-none">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl tracking-tight">Sign In</CardTitle>
        <CardDescription>
          Use any Firebase email/password account that exists in this project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertTitle>Login failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
