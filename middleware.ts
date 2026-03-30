import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function decodeBasicAuth(header: string): { username: string; password: string } | null {
  const [scheme, encoded] = header.split(' ');

  if (scheme !== 'Basic' || !encoded) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const expectedUsername = process.env.APP_BASIC_AUTH_USER;
  const expectedPassword = process.env.APP_BASIC_AUTH_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    const response = NextResponse.next();
    response.headers.set('x-strata-basic-auth', 'disabled');
    return response;
  }

  const credentials = decodeBasicAuth(request.headers.get('authorization') || '');
  const isAuthorized =
    credentials?.username === expectedUsername &&
    credentials?.password === expectedPassword;

  if (isAuthorized) {
    const response = NextResponse.next();
    response.headers.set('x-strata-basic-auth', 'enabled');
    return response;
  }

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Strata Admin"',
    },
  });
}

export const runtime = 'nodejs';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
