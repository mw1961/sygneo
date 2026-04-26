import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/app/lib/admin-auth';

async function getSelections() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sygneoforever.com'}/api/save-selection`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.selections ?? [];
  } catch {
    return [];
  }
}

export default async function AdminDashboard() {
  const auth = await isAdminAuthenticated();
  if (!auth) redirect('/admin/login');

  const selections = await getSelections();

  const total   = selections.length;
  const pending  = selections.filter((s: { status: string }) => s.status === 'pending').length;
  const approved = selections.filter((s: { status: string }) => s.status === 'approved').length;

  return (
    <main style={{ minHeight: '100vh', background: '#F8F5F0', padding: '48px 32px', fontFamily: 'Georgia, serif', color: '#1C1A17' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, borderBottom: '1px solid #DDD8D0', paddingBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 300, letterSpacing: '0.4em', margin: 0 }}>SYGNEO</h1>
            <p style={{ fontSize: 10, letterSpacing: '0.3em', color: '#8B7355', textTransform: 'uppercase', margin: '6px 0 0', fontFamily: 'Helvetica, Arial, sans-serif' }}>Admin Dashboard</p>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B0A898', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>Logout</button>
          </form>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 48 }}>
          {[
            { label: 'Total Selections', value: total },
            { label: 'Pending Review',   value: pending },
            { label: 'Approved',         value: approved },
          ].map(({ label, value }) => (
            <div key={label} style={{ border: '1px solid #DDD8D0', padding: '24px', background: '#FFFFFF' }}>
              <p style={{ fontSize: 36, fontWeight: 200, margin: '0 0 6px', color: '#1C1A17' }}>{value}</p>
              <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#B0A898', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Selections list */}
        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8B7355', marginBottom: 20, fontFamily: 'Helvetica, Arial, sans-serif' }}>Client Selections</p>

          {selections.length === 0 ? (
            <div style={{ border: '1px solid #DDD8D0', padding: 32, background: '#FFFFFF' }}>
              <p style={{ color: '#B0A898', fontSize: 14, margin: 0 }}>No selections yet. Clients will appear here after confirming their mark.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {selections.map((sel: {
                id: string; createdAt: string; status: string;
                profile: { origin: string; occupation: string; values: string[]; shape: string; style: string; inkColor: string };
                sealSvg: string; notes: string;
              }) => (
                <div key={sel.id} style={{ border: '1px solid #DDD8D0', background: '#FFFFFF', padding: 24, display: 'flex', gap: 24 }}>

                  {/* SVG preview */}
                  <div style={{ width: 120, height: 120, flexShrink: 0, border: '1px solid #DDD8D0', padding: 8 }}
                    dangerouslySetInnerHTML={{ __html: sel.sealSvg }} />

                  {/* Details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.2em', color: '#B0A898', fontFamily: 'Helvetica, Arial, sans-serif', textTransform: 'uppercase' }}>
                        {new Date(sel.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}{sel.id}
                      </span>
                      <span style={{
                        fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif',
                        color: sel.status === 'approved' ? '#1B4332' : sel.status === 'rejected' ? '#8B0000' : '#8B7355',
                        border: `1px solid currentColor`, padding: '3px 8px',
                      }}>{sel.status}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px', marginBottom: 12 }}>
                      {[
                        ['Origin', sel.profile.origin],
                        ['Occupation', sel.profile.occupation],
                        ['Shape', sel.profile.shape],
                        ['Style', sel.profile.style],
                        ['Values', sel.profile.values?.join(' · ')],
                        ['Ink', sel.profile.inkColor],
                      ].map(([label, value]) => (
                        <div key={label} style={{ fontSize: 12 }}>
                          <span style={{ color: '#B0A898', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}: </span>
                          <span style={{ color: '#1C1A17' }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    {sel.notes && (
                      <div style={{ borderTop: '1px solid #DDD8D0', paddingTop: 10, marginTop: 4 }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.15em', color: '#B0A898', fontFamily: 'Helvetica, Arial, sans-serif', textTransform: 'uppercase' }}>Client notes: </span>
                        <span style={{ fontSize: 13, color: '#7A7060', fontStyle: 'italic' }}>{sel.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
