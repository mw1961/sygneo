import { NextRequest, NextResponse } from 'next/server';

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'seal-dev-secret-2026';

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const ADMIN_PATHS  = ['/admin'];
const PUBLIC_PATHS = [
  '/login',
  '/login/client',
  '/admin/login',
  '/api/user/login',
  '/api/user/logout',
  '/api/admin/login',
  '/api/admin/logout',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const [adminToken, userToken] = await Promise.all([
    hmac('admin'),
    hmac('user:123'),
  ]);

  const isAdminPath = ADMIN_PATHS.some(p => pathname.startsWith(p));

  if (isAdminPath) {
    if (req.cookies.get('seal_admin')?.value !== adminToken) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    return NextResponse.next();
  }

  const hasAdmin = req.cookies.get('seal_admin')?.value === adminToken;
  const hasUser  = req.cookies.get('seal_user')?.value  === userToken;

  if (!hasAdmin && !hasUser) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
