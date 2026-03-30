import { redirect } from 'next/navigation';
import Link from 'next/link';

import { LoginForm } from '@/components/auth/login-form';
import { getAdminSession } from '@/lib/admin-session';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await getAdminSession();

  if (session) {
    redirect('/');
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_45%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-10">
      <div className="w-full max-w-md space-y-4">
        <LoginForm />
        <div className="rounded-3xl border border-border/70 bg-white/90 p-5 text-center shadow-none">
          <div className="text-sm font-medium tracking-tight">Just showing the product?</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a safe demo workspace with sample notices, owners, and properties.
          </p>
          <Button className="mt-4 w-full" variant="outline" asChild>
            <Link href="/api/demo-mode?enable=1&redirect=/">
              Enter Demo Without Sign In
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
