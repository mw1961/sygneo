import { cookies } from 'next/headers';

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('seal_admin')?.value;
  if (!token) return false;
  return token === global.__sealAdminToken;
}

declare global {
  var __sealAdminToken: string | undefined;
}
