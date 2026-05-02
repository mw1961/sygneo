'use client';

import { useState } from 'react';

const C = {
  bg: '#F8F5F0', surface: '#FFFFFF', border: '#DDD8D0',
  gold: '#8B7355', text: '#1C1A17', muted: '#B0A898', sub: '#7A7060',
};

type ProductionStatus =
  | 'pending' | 'vector_ready' | 'vector_approved'
  | 'sent_to_manufacturer' | 'in_production' | 'shipped' | 'delivered';

const STATUSES: { value: ProductionStatus; label: string; color: string }[] = [
  { value: 'pending',               label: 'Pending',               color: '#B0A898' },
  { value: 'vector_ready',          label: 'Vector Ready',          color: '#8B7355' },
  { value: 'vector_approved',       label: 'Vector Approved',       color: '#1B6B4A' },
  { value: 'sent_to_manufacturer',  label: 'Sent to Manufacturer',  color: '#4A6B8B' },
  { value: 'in_production',         label: 'In Production',         color: '#6B4A8B' },
  { value: 'shipped',               label: 'Shipped',               color: '#8B6B1B' },
  { value: 'delivered',             label: 'Delivered',             color: '#1B4332' },
];

interface HistoryEvent { status: string; at: string; note?: string }

interface ShippingAddress {
  recipientName: string; country: string; street: string;
  streetNumber: string; apartment?: string; postalCode: string; invoiceName?: string;
}

interface Selection {
  id: string; createdAt: string; status: ProductionStatus;
  profile: { origin: string; occupation: string; values: string[]; inkColor: string };
  sealSvg: string; productionSvg?: string; notes: string;
  shipping?: ShippingAddress;
  productionNotes?: string; manufacturerRef?: string; trackingNumber?: string;
  history?: HistoryEvent[];
}

function statusColor(s: string) {
  return STATUSES.find(x => x.value === s)?.color ?? C.muted;
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUSES.find(x => x.value === status)?.label ?? status;
  const color = statusColor(status);
  return (
    <span style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
      fontFamily: 'Helvetica, Arial, sans-serif', color, border: `1px solid ${color}`,
      padding: '3px 8px' }}>{label}</span>
  );
}

function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ProductionCard({ sel: initial }: { sel: Selection }) {
  const [sel, setSel]               = useState(initial);
  const [open, setOpen]             = useState(false);
  const [saving, setSaving]         = useState(false);
  const [status, setStatus]         = useState<ProductionStatus>(initial.status);
  const [prodNotes, setProdNotes]   = useState(initial.productionNotes ?? '');
  const [mfgRef, setMfgRef]         = useState(initial.manufacturerRef  ?? '');
  const [tracking, setTracking]     = useState(initial.trackingNumber   ?? '');
  const [showCompare, setShowCompare] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/production', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sel.id, status, productionNotes: prodNotes, manufacturerRef: mfgRef, trackingNumber: tracking }),
    });
    const data = await res.json();
    if (data.ok) { setSel(data.selection); setOpen(false); }
    setSaving(false);
  }

  const svgDiffers = sel.productionSvg && sel.productionSvg !== sel.sealSvg;

  return (
    <div style={{ border: `1px solid ${C.border}`, background: C.surface, marginBottom: 16 }}>

      {/* Main row */}
      <div style={{ padding: 24, display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* SVG Preview */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ width: 110, height: 110, border: `1px solid ${C.border}`, padding: 6 }}
            dangerouslySetInnerHTML={{ __html: sel.sealSvg }} />
          <p style={{ fontSize: 8, color: C.muted, textAlign: 'center', marginTop: 4,
            fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>ORIGINAL</p>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif',
              letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {new Date(sel.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' · '}{sel.id}
            </span>
            <StatusBadge status={sel.status} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: 10 }}>
            {[
              ['Origin', sel.profile.origin],
              ['Occupation', sel.profile.occupation],
              ['Values', sel.profile.values?.join(' · ')],
              ['Ink', sel.profile.inkColor],
            ].map(([l, v]) => (
              <div key={l} style={{ fontSize: 12 }}>
                <span style={{ color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif',
                  fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{l}: </span>
                <span style={{ color: C.text }}>{v}</span>
              </div>
            ))}
          </div>

          {sel.notes && (
            <p style={{ fontSize: 12, color: C.sub, fontStyle: 'italic', margin: '0 0 8px',
              borderLeft: `2px solid ${C.border}`, paddingLeft: 8 }}>"{sel.notes}"</p>
          )}

          {/* Production fields */}
          {(sel.manufacturerRef || sel.trackingNumber) && (
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: C.sub }}>
              {sel.manufacturerRef  && <span>Mfg ref: <strong>{sel.manufacturerRef}</strong></span>}
              {sel.trackingNumber   && <span>Tracking: <strong>{sel.trackingNumber}</strong></span>}
            </div>
          )}

          {sel.productionNotes && (
            <p style={{ fontSize: 11, color: C.sub, margin: '6px 0 0',
              borderLeft: `2px solid ${C.gold}`, paddingLeft: 8 }}>{sel.productionNotes}</p>
          )}

          {/* Shipping address */}
          {sel.shipping && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#F8F5F0',
              border: `1px solid ${C.border}`, fontSize: 12 }}>
              <p style={{ fontSize: 9, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase',
                fontFamily: 'Helvetica, Arial, sans-serif', margin: '0 0 6px' }}>Ship to</p>
              <p style={{ margin: 0, lineHeight: 1.7, color: C.text }}>
                <strong>{sel.shipping.recipientName}</strong><br/>
                {sel.shipping.street} {sel.shipping.streetNumber}
                {sel.shipping.apartment ? `, ${sel.shipping.apartment}` : ''}<br/>
                {sel.shipping.postalCode} {sel.shipping.country}
              </p>
              {sel.shipping.invoiceName && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: C.sub }}>
                  Invoice: {sel.shipping.invoiceName}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setOpen(o => !o)}
            style={{ padding: '7px 14px', border: `1px solid ${C.gold}`, background: 'transparent',
              color: C.gold, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
            {open ? 'Close' : 'Update'}
          </button>
          <button onClick={() => downloadSvg(sel.productionSvg ?? sel.sealSvg, `sygneo-${sel.id}.svg`)}
            style={{ padding: '7px 14px', border: `1px solid ${C.border}`, background: 'transparent',
              color: C.sub, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
            ↓ SVG
          </button>
          {svgDiffers && (
            <button onClick={() => setShowCompare(c => !c)}
              style={{ padding: '7px 14px', border: `1px solid ${C.border}`, background: 'transparent',
                color: C.sub, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Compare
            </button>
          )}
        </div>
      </div>

      {/* Compare panel */}
      {showCompare && svgDiffers && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 20, background: '#FAFAFA',
          display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 140, height: 140, border: `1px solid ${C.border}`, padding: 8 }}
              dangerouslySetInnerHTML={{ __html: sel.sealSvg }} />
            <p style={{ fontSize: 9, color: C.muted, marginTop: 6, fontFamily: 'Helvetica, Arial, sans-serif',
              letterSpacing: '0.1em', textTransform: 'uppercase' }}>Customer Selection</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 140, height: 140, border: `1px solid ${C.gold}`, padding: 8 }}
              dangerouslySetInnerHTML={{ __html: sel.productionSvg ?? '' }} />
            <p style={{ fontSize: 9, color: C.gold, marginTop: 6, fontFamily: 'Helvetica, Arial, sans-serif',
              letterSpacing: '0.1em', textTransform: 'uppercase' }}>Production File</p>
          </div>
        </div>
      )}

      {/* Update panel */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 24, background: '#FAFAFA' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.25em', color: C.gold, textTransform: 'uppercase',
            fontFamily: 'Helvetica, Arial, sans-serif', marginBottom: 16 }}>Update Production Status</p>

          {/* Status selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => setStatus(s.value)}
                style={{ padding: '6px 14px', border: `1px solid ${status === s.value ? s.color : C.border}`,
                  background: status === s.value ? `${s.color}18` : 'transparent',
                  color: status === s.value ? s.color : C.muted,
                  fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 9, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase',
                fontFamily: 'Helvetica, Arial, sans-serif', display: 'block', marginBottom: 6 }}>
                Manufacturer Reference
              </label>
              <input value={mfgRef} onChange={e => setMfgRef(e.target.value)}
                placeholder="e.g. MFG-2024-001"
                style={{ width: '100%', border: `1px solid ${C.border}`, padding: '8px 12px',
                  fontSize: 13, fontFamily: 'Georgia, serif', background: C.surface,
                  color: C.text, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 9, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase',
                fontFamily: 'Helvetica, Arial, sans-serif', display: 'block', marginBottom: 6 }}>
                Shipping Tracking Number
              </label>
              <input value={tracking} onChange={e => setTracking(e.target.value)}
                placeholder="e.g. IL123456789"
                style={{ width: '100%', border: `1px solid ${C.border}`, padding: '8px 12px',
                  fontSize: 13, fontFamily: 'Georgia, serif', background: C.surface,
                  color: C.text, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 9, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase',
              fontFamily: 'Helvetica, Arial, sans-serif', display: 'block', marginBottom: 6 }}>
              Production Notes (internal)
            </label>
            <textarea value={prodNotes} onChange={e => setProdNotes(e.target.value)}
              rows={2} placeholder="Notes for the team..."
              style={{ width: '100%', border: `1px solid ${C.border}`, padding: '8px 12px',
                fontSize: 13, fontFamily: 'Georgia, serif', background: C.surface,
                color: C.text, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <button onClick={save} disabled={saving}
            style={{ padding: '10px 28px', border: 'none',
              background: saving ? C.muted : C.gold, color: '#fff',
              fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* History log */}
      {sel.history && sel.history.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 24px',
          display: 'flex', gap: 12, flexWrap: 'wrap', background: '#FAFAFA' }}>
          {sel.history.map((h, i) => (
            <div key={i} style={{ fontSize: 10, color: C.muted,
              fontFamily: 'Helvetica, Arial, sans-serif' }}>
              <span style={{ color: statusColor(h.status), letterSpacing: '0.1em',
                textTransform: 'uppercase' }}>{h.status.replace(/_/g, ' ')}</span>
              {' '}
              <span>{new Date(h.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              {h.note && <span style={{ color: C.sub }}> — {h.note}</span>}
              {i < sel.history!.length - 1 && <span style={{ marginLeft: 12, color: C.border }}>→</span>}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
