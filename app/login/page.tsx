'use client';

import { useRouter } from 'next/navigation';

export default function LoginGatePage() {
  const router = useRouter();

  return (
    <main style={{ minHeight: '100vh', background: '#F8F5F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', fontFamily: 'Georgia, serif' }}>

      <div style={{ marginBottom: 56, textAlign: 'center' }}>
        <h1 style={{ fontSize: 34, fontWeight: 300, letterSpacing: '0.45em', color: '#1C1A17', margin: 0 }}>SEAL</h1>
        <div style={{ width: 40, height: 1, background: '#8B7355', margin: '10px auto 8px' }} />
        <p style={{ fontSize: 10, letterSpacing: '0.3em', color: '#8B7355', textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>Heritage Seal System</p>
      </div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <button
          onClick={() => router.push('/login/client')}
          style={{
            width: '100%',
            padding: '18px 36px',
            border: 'none',
            background: '#8B7355',
            color: '#FFFFFF',
            fontSize: 13,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 500,
          }}
        >
          Client
        </button>

        <button
          onClick={() => router.push('/admin/login')}
          style={{
            width: '100%',
            padding: '18px 36px',
            border: '1px solid #DDD8D0',
            background: 'transparent',
            color: '#8B7355',
            fontSize: 13,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 500,
          }}
        >
          Admin
        </button>

      </div>
    </main>
  );
}
