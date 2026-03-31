import { NextRequest, NextResponse } from 'next/server';

import { DEMO_MODE_COOKIE } from '@/lib/demo-session';

function getSafeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  try {
    const url = new URL(value, 'https://example.local');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

export async function GET(request: NextRequest) {
  const enable = request.nextUrl.searchParams.get('enable') === '1';
  const redirectTarget = getSafeRedirectPath(request.nextUrl.searchParams.get('redirect'));
  const response = NextResponse.redirect(new URL(redirectTarget, request.url));

  if (enable) {
    response.cookies.set(DEMO_MODE_COOKIE, '1', {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
  } else {
    response.cookies.delete(DEMO_MODE_COOKIE);
  }

  return response;
}
