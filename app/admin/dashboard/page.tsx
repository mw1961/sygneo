import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/app/lib/admin-auth';
import { ProductionCard } from './ProductionPanel';
import type { SealSelection, ProductionStatus } from '@/app/lib/db';

async function getSelections(): Promise<SealSelection[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://sygneoforever.com'}/api/save-selection`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.selections ?? [];
  } catch {
    return [];
  }
}

const STATUS_ORDER: ProductionStatus[] = [
  'pending', 'vector_ready', 'vector_approved',
  'sent_to_manufacturer', 'in_production', 'shipped', 'delivered',
];

const STATUS_COLOR: Record<string, string> = {
  pending: '#B0A898', vector_ready: '#8B7355', vector_approved: '#1B6B4A',
  sent_to_manufacturer: '#4A6B8B', in_production: '#6B4A8B',
  shipped: '#8B6B1B', delivered: '#1B4332',
};

export default async function AdminDashboard() {
  const auth = await isAdminAuthenticated();
  if (!auth) redirect('/admin/login');

  const selections = await getSelections();

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = selections.filter(x => x.status === s).length;
    return acc;
  }, {});

  return (
    <main style={{ minHeight: '100vh', background: '#F8F5F0', padding: '48px 32px',
      fontFamily: 'Georgia, serif', color: '#1C1A17' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginBottom: 40, borderBottom: '1px solid #DDD8D0', paddingBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 300, letterSpacing: '0.4em', margin: 0 }}>SYGNEO</h1>
            <p style={{ fontSize: 10, letterSpacing: '0.3em', color: '#8B7355', textTransform: 'uppercase',
              margin: '6px 0 0', fontFamily: 'Helvetica, Arial, sans-serif' }}>Production Dashboard</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href="/admin/svg-lab" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: '#8B7355', textDecoration: 'none', border: '1px solid #8B7355',
              padding: '8px 16px', fontFamily: 'Helvetica, Arial, sans-serif' }}>SVG Lab</a>
            <form action="/api/admin/logout" method="POST">
              <button type="submit" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: '#B0A898', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Helvetica, Arial, sans-serif' }}>Logout</button>
            </form>
          </div>
        </div>

        {/* Pipeline stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 48 }}>
          {STATUS_ORDER.map(s => (
            <div key={s} style={{ border: `1px solid ${STATUS_COLOR[s]}30`, padding: '16px 12px',
              background: '#FFFFFF', textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 200, margin: '0 0 4px',
                color: counts[s] > 0 ? STATUS_COLOR[s] : '#DDD8D0' }}>{counts[s]}</p>
              <p style={{ fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: STATUS_COLOR[s], margin: 0, fontFamily: 'Helvetica, Arial, sans-serif',
                lineHeight: 1.3 }}>{s.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>

        {/* Orders */}
        <p style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase',
          color: '#8B7355', marginBottom: 20, fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Orders — {selections.length} total
        </p>

        {selections.length === 0 ? (
          <div style={{ border: '1px solid #DDD8D0', padding: 32, background: '#FFFFFF' }}>
            <p style={{ color: '#B0A898', fontSize: 14, margin: 0 }}>
              No selections yet. Clients will appear here after confirming their mark.
            </p>
          </div>
        ) : (
          selections.map(sel => <ProductionCard key={sel.id} sel={sel as Parameters<typeof ProductionCard>[0]['sel']} />)
        )}

      </div>
    </main>
  );
}
