'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/');
    } else {
      setError('Invalid credentials');
      setPassword('');
    }
  }

  const canSubmit = username.length > 0 && password.length > 0;

  return (
    <main style={{ minHeight: '100vh', background: '#F8F5F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', fontFamily: 'Georgia, serif' }}>

      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <h1 style={{ fontSize: 34, fontWeight: 300, letterSpacing: '0.45em', color: '#1C1A17', margin: 0 }}>SEAL</h1>
        <div style={{ width: 40, height: 1, background: '#8B7355', margin: '10px auto 8px' }} />
        <p style={{ fontSize: 10, letterSpacing: '0.3em', color: '#8B7355', textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>Client Access</p>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 28 }}>

        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.3em', color: '#B0A898', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Enter username"
            required
            autoFocus
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #DDD8D0', color: '#1C1A17', fontSize: 17, paddingBottom: 12, outline: 'none', fontFamily: 'Georgia, serif', boxSizing: 'border-box' }}
          />
        </div>

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
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #DDD8D0', color: '#1C1A17', fontSize: 17, paddingBottom: 12, outline: 'none', fontFamily: 'Georgia, serif', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <p style={{ color: '#A0522D', fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          style={{
            width: '100%',
            padding: '16px 36px',
            border: 'none',
            background: canSubmit ? '#8B7355' : '#C8BFB3',
            color: '#FFFFFF',
            fontSize: 13,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            fontFamily: 'Helvetica, Arial, sans-serif',
            fontWeight: 500,
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Verifying...' : 'Enter'}
        </button>
      </form>

      <button
        onClick={() => router.back()}
        style={{ marginTop: 36, fontSize: 10, letterSpacing: '0.2em', color: '#B0A898', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}
      >
        ← Back
      </button>
    </main>
  );
}
