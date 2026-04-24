import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PATHS = ['/admin'];
const PUBLIC_PATHS = [
  '/login',
  '/admin/login',
  '/api/user/login',
  '/api/user/logout',
  '/api/admin/login',
  '/api/admin/logout',
  '/login/client',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const isAdminPath = ADMIN_PATHS.some(p => pathname.startsWith(p));

  if (isAdminPath) {
    const adminToken = req.cookies.get('seal_admin')?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    return NextResponse.next();
  }

  // All other routes require user OR admin cookie
  const userToken = req.cookies.get('seal_user')?.value;
  const adminToken = req.cookies.get('seal_admin')?.value;

  if (!userToken && !adminToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
