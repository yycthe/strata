import { NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionCookie,
  getAdminSessionMaxAgeSeconds,
} from '@/lib/admin-session';
import { getAdminAuth, getAdminFirestore, hasFirebaseAdminConfig } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!hasFirebaseAdminConfig()) {
    return NextResponse.json(
      { error: 'Firebase admin credentials are missing on the server.' },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as { idToken?: string } | null;
  const idToken = body?.idToken?.trim();

  if (!idToken) {
    return NextResponse.json({ error: 'Missing Firebase ID token.' }, { status: 400 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const adminDoc = await getAdminFirestore()
      .collection('roles_admin')
      .doc(decoded.uid)
      .get();

    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'This Firebase user is not listed in roles_admin.' },
        { status: 403 }
      );
    }

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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create admin session.' },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
