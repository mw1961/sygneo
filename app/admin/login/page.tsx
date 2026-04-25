'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/admin/dashboard');
    } else {
      setError('Invalid password');
      setPassword('');
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F8F5F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', fontFamily: 'Georgia, serif' }}>

      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <h1 style={{ fontSize: 34, fontWeight: 300, letterSpacing: '0.45em', color: '#1C1A17', margin: 0 }}>SYGNEO</h1>
        <div style={{ width: 40, height: 1, background: '#8B7355', margin: '10px auto 8px' }} />
        <p style={{ fontSize: 10, letterSpacing: '0.3em', color: '#8B7355', textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>Admin Access</p>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.3em', color: '#B0A898', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            autoFocus
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #DDD8D0', color: '#1C1A17', fontSize: 17, paddingBottom: 12, outline: 'none', fontFamily: 'Georgia, serif', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <p style={{ color: '#A0522D', fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || password.length === 0}
          style={{
            width: '100%',
            padding: '16px 36px',
            border: 'none',
            background: password.length === 0 ? '#C8BFB3' : '#8B7355',
            color: '#FFFFFF',
            fontSize: 13,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            cursor: password.length === 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 500,
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Verifying...' : 'Enter Admin'}
        </button>
      </form>
    </main>
  );
}
