import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('seal_admin', '', { maxAge: 0, path: '/' });
  global.__sealAdminToken = undefined;
  return response;
}
