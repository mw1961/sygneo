import { cookies } from 'next/headers';

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'seal-dev-secret-2026';

async function computeAdminToken(): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('admin'));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('seal_admin')?.value;
  if (!token) return false;
  const expected = await computeAdminToken();
  return token === expected;
}
