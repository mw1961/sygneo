import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/app/lib/admin-auth';

export default async function AdminDashboard() {
  const auth = await isAdminAuthenticated();
  if (!auth) redirect('/admin/login');

  return (
    <main style={{ minHeight: '100vh', background: '#F8F5F0', padding: '48px 32px', fontFamily: 'Georgia, serif', color: '#1C1A17' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 52, borderBottom: '1px solid #DDD8D0', paddingBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 300, letterSpacing: '0.4em', margin: 0 }}>SYGNEO</h1>
            <p style={{ fontSize: 10, letterSpacing: '0.3em', color: '#8B7355', textTransform: 'uppercase', margin: '6px 0 0', fontFamily: 'Helvetica, Arial, sans-serif' }}>Admin Dashboard</p>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B0A898', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Logout
            </button>
          </form>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 48 }}>
          {[
            { label: 'Total Seals', value: '0' },
            { label: 'Pending QA', value: '0' },
            { label: 'Delivered', value: '0' },
          ].map(({ label, value }) => (
            <div key={label} style={{ border: '1px solid #DDD8D0', padding: '28px 24px', background: '#FFFFFF' }}>
              <p style={{ fontSize: 36, fontWeight: 200, margin: '0 0 6px', color: '#1C1A17' }}>{value}</p>
              <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B0A898', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Recent Profiles */}
        <div style={{ border: '1px solid #DDD8D0', padding: '32px', background: '#FFFFFF' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8B7355', marginBottom: 20, fontFamily: 'Helvetica, Arial, sans-serif' }}>Recent Profiles</p>
          <p style={{ color: '#B0A898', fontSize: 14, margin: 0 }}>No profiles yet. Start from the questionnaire.</p>
        </div>

      </div>
    </main>
  );
}
