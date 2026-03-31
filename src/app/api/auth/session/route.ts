import { NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionCookie,
  getAdminSessionMaxAgeSeconds,
} from '@/lib/admin-session';
import { getAdminAuth, hasFirebaseAdminConfig } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!hasFirebaseAdminConfig()) {
    return NextResponse.json(
      { error: 'Sign-in is temporarily unavailable.' },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as { idToken?: string } | null;
  const idToken = body?.idToken?.trim();

  if (!idToken) {
    return NextResponse.json({ error: 'Invalid sign-in request.' }, { status: 400 });
  }

  try {
    await getAdminAuth().verifyIdToken(idToken);

    const sessionCookie = await createAdminSessionCookie(idToken);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: getAdminSessionMaxAgeSeconds(),
    });

    return response;
  } catch (error) {
    console.error('Failed to create login session:', error);
    return NextResponse.json({ error: 'Unable to finish sign-in right now.' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
