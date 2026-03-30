import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getAdminAuth, getAdminFirestore, hasFirebaseAdminConfig } from '@/lib/firebase-admin';

export const ADMIN_SESSION_COOKIE = 'strata_admin_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5;

export type AdminSession = {
  uid: string;
  email: string | null;
};

export async function createAdminSessionCookie(idToken: string): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!hasFirebaseAdminConfig()) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    const adminDoc = await getAdminFirestore()
      .collection('roles_admin')
      .doc(decoded.uid)
      .get();

    if (!adminDoc.exists) {
      return null;
    }

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export function getAdminSessionMaxAgeSeconds(): number {
  return Math.floor(SESSION_MAX_AGE_MS / 1000);
}
