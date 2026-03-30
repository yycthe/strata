import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { getAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await getAdminSession();

  if (session) {
    redirect('/');
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.08),_transparent_45%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] px-6 py-10">
      <LoginForm />
    </div>
  );
}
