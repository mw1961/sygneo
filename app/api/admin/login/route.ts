import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH
  ?? 'b60a71dba7e3410fa5898793e1e4bbf2b8c57765bdc2577c10e5d27485a86db1';

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'seal-dev-secret-2026';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (!password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 });
  }

  const hash = createHash('sha256').update(password.trim()).digest('hex');

  if (hash !== ADMIN_PASSWORD_HASH) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = createHash('sha256')
    .update(`${SESSION_SECRET}:${Date.now()}`)
    .digest('hex');

  const response = NextResponse.json({ ok: true });
  response.cookies.set('seal_admin', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });

  // Store valid token in memory (simple for now)
  global.__sealAdminToken = token;

  return response;
}
