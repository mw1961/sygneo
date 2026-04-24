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
    <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center px-6">

      <div className="mb-12 text-center">
        <h1 className="text-4xl font-thin tracking-[0.4em] text-white">SEAL</h1>
        <p className="mt-2 text-xs tracking-[0.3em] text-[#555] uppercase">Admin Access</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <label className="block text-[10px] tracking-[0.3em] text-[#555] uppercase mb-3">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter admin password"
            required
            autoFocus
            className="w-full bg-transparent border-b border-[#333] text-white text-lg pb-3 outline-none placeholder:text-[#333] focus:border-white transition-colors"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="mt-2 px-8 py-3 border border-white text-sm tracking-[0.2em] uppercase disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-all"
        >
          {loading ? 'Verifying...' : 'Enter'}
        </button>
      </form>
    </main>
  );
}
