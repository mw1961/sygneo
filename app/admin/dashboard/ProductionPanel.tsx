'use client';

import { useState } from 'react';

const C = {
  bg: '#F8F5F0', surface: '#FFFFFF', border: '#DDD8D0',
  gold: '#8B7355', text: '#1C1A17', muted: '#7A6E64', sub: '#5C5248',
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

const STAMP_SIZES = [30, 38, 40, 50];

interface ShippingAddress {
  recipientName: string; country: string; street: string;
  streetNumber: string; apartment?: string; postalCode: string;
  phone?: string; invoiceName?: string;
}

interface HistoryEvent { status: string; at: string; note?: string }

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

function buildProductionSvg(rawSvg: string, mm: number, id: string): string {
  const inner = rawSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '').trim();
  return [
    `<!-- Sygneo Production File | Order: ${id} | Size: ${mm}mm x ${mm}mm | ${new Date().toISOString().slice(0,10)} -->`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="${mm}mm" height="${mm}mm" shape-rendering="crispEdges">`,
    `  <title>Sygneo Seal — Order ${id}</title>`,
    inner,
    `</svg>`,
  ].join('\n');
}

function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ProductionCard({ sel: initial }: { sel: Selection }) {
  const [sel, setSel]             = useState(initial);
  const [openUpdate, setOpenUpdate] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [status, setStatus]       = useState<ProductionStatus>(initial.status);
  const [prodNotes, setProdNotes] = useState(initial.productionNotes ?? '');
  const [mfgRef, setMfgRef]       = useState(initial.manufacturerRef  ?? '');
  const [tracking, setTracking]   = useState(initial.trackingNumber   ?? '');
  const [stampSize, setStampSize] = useState(40);
  const [copied, setCopied]       = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/production', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sel.id, status, productionNotes: prodNotes, manufacturerRef: mfgRef, trackingNumber: tracking }),
    });
    const data = await res.json();
    if (data.ok) { setSel(data.selection); setOpenUpdate(false); }
    setSaving(false);
  }

  function copySvg() {
    const svg = buildProductionSvg(sel.productionSvg ?? sel.sealSvg, stampSize, sel.id);
    navigator.clipboard.writeText(svg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const statusLabel = STATUSES.find(x => x.value === sel.status)?.label ?? sel.status;
  const statusClr   = statusColor(sel.status);
  const svgForProd  = sel.productionSvg ?? sel.sealSvg;

  return (
    <div style={{ border: `1px solid ${C.border}`, background: C.surface, marginBottom: 20 }}>

      {/* ── Header bar ──────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#FAFAFA' }}>
        <span style={{ fontSize: 14, color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif',
          letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          {new Date(sel.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          <span style={{ color: C.border, margin: '0 8px' }}>|</span>
          {sel.id}
        </span>
        <span style={{ fontSize: 15, letterSpacing: '0.15em', textTransform: 'uppercase',
          fontFamily: 'Helvetica, Arial, sans-serif', color: statusClr,
          border: `1px solid ${statusClr}`, padding: '3px 10px' }}>
          {statusLabel}
        </span>
      </div>

      {/* ── Main body: 3 columns ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: 0 }}>

        {/* Col 1: Seal preview */}
        <div style={{ padding: 20, borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 140, height: 140, border: `1px solid ${C.border}`, padding: 6, background: '#fff' }}
            dangerouslySetInnerHTML={{ __html: sel.sealSvg }} />
          <p style={{ fontSize: 15, color: C.muted, margin: 0, fontFamily: 'Helvetica, Arial, sans-serif',
            letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>
            Selected Design
          </p>
          {/* Ink color swatch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%',
              background: sel.profile.inkColor, border: `1px solid ${C.border}` }} />
            <span style={{ fontSize: 14, color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {sel.profile.inkColor}
            </span>
          </div>
        </div>

        {/* Col 2: Customer & order info */}
        <div style={{ padding: 20, borderRight: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 15, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase',
            fontFamily: 'Helvetica, Arial, sans-serif', margin: '0 0 12px' }}>Family Profile</p>

          {[
            ['Origin',     sel.profile.origin],
            ['Occupation', sel.profile.occupation],
            ['Values',     sel.profile.values?.join(', ')],
          ].map(([l, v]) => (
            <div key={l} style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 15, color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif',
                letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l}<br/></span>
              <span style={{ fontSize: 15, color: C.text }}>{v}</span>
            </div>
          ))}

          {sel.notes && (
            <p style={{ fontSize: 14, color: C.sub, fontStyle: 'italic', marginTop: 10,
              borderLeft: `2px solid ${C.border}`, paddingLeft: 8 }}>"{sel.notes}"</p>
          )}

          {/* Shipping address */}
          {sel.shipping && (
            <>
              <p style={{ fontSize: 15, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase',
                fontFamily: 'Helvetica, Arial, sans-serif', margin: '16px 0 10px' }}>Ship To</p>
              <div style={{ fontSize: 15, color: C.text, lineHeight: 1.8 }}>
                <strong>{sel.shipping.recipientName}</strong><br/>
                {sel.shipping.street} {sel.shipping.streetNumber}
                {sel.shipping.apartment ? `, Apt ${sel.shipping.apartment}` : ''}<br/>
                {sel.shipping.postalCode}, {sel.shipping.country}
                {sel.shipping.phone && <><br/><span style={{ color: C.sub }}>📱 {sel.shipping.phone}</span></>}
                {sel.shipping.invoiceName && <><br/><span style={{ fontSize: 15, color: C.muted }}>Invoice: {sel.shipping.invoiceName}</span></>}
              </div>
            </>
          )}

          {(sel.manufacturerRef || sel.trackingNumber) && (
            <div style={{ marginTop: 12, fontSize: 15, color: C.sub, lineHeight: 1.8 }}>
              {sel.manufacturerRef && <div>Mfg ref: <strong>{sel.manufacturerRef}</strong></div>}
              {sel.trackingNumber  && <div>Tracking: <strong>{sel.trackingNumber}</strong></div>}
            </div>
          )}
        </div>

        {/* Col 3: SVG export for manufacturer */}
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 15, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase',
            fontFamily: 'Helvetica, Arial, sans-serif', margin: '0 0 12px' }}>Production File</p>

          {/* Size selector */}
          <p style={{ fontSize: 15, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: 'Helvetica, Arial, sans-serif', marginBottom: 8 }}>Stamp size</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {STAMP_SIZES.map(mm => (
              <button key={mm} onClick={() => setStampSize(mm)}
                style={{ padding: '5px 12px', border: `1px solid ${stampSize === mm ? C.gold : C.border}`,
                  background: stampSize === mm ? 'rgba(139,115,85,0.1)' : 'transparent',
                  color: stampSize === mm ? C.gold : C.muted,
                  fontSize: 14, cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                {mm}mm
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => downloadSvg(buildProductionSvg(svgForProd, stampSize, sel.id), `sygneo-${sel.id}-${stampSize}mm.svg`)}
              style={{ padding: '10px 16px', border: 'none', background: C.gold, color: '#fff',
                fontSize: 15, letterSpacing: '0.2em', textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500,
                textAlign: 'left' }}>
              ↓ Download {stampSize}mm SVG
            </button>

            <button onClick={copySvg}
              style={{ padding: '10px 16px', border: `1px solid ${copied ? '#1B6B4A' : C.border}`,
                background: copied ? 'rgba(27,107,74,0.08)' : 'transparent',
                color: copied ? '#1B6B4A' : C.sub,
                fontSize: 15, letterSpacing: '0.2em', textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif',
                textAlign: 'left' }}>
              {copied ? '✓ Copied to clipboard' : '⎘ Copy SVG code'}
            </button>

            <button onClick={() => setOpenUpdate(o => !o)}
              style={{ padding: '10px 16px', border: `1px solid ${C.border}`,
                background: openUpdate ? C.bg : 'transparent', color: C.sub,
                fontSize: 15, letterSpacing: '0.2em', textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif',
                textAlign: 'left', marginTop: 8 }}>
              ✎ Update Status
            </button>
          </div>

          {/* File name hint */}
          <p style={{ fontSize: 14, color: C.muted, marginTop: 12,
            fontFamily: 'Helvetica, Arial, sans-serif', lineHeight: 1.5 }}>
            sygneo-{sel.id.slice(-8)}-{stampSize}mm.svg<br/>
            SVG · {stampSize}×{stampSize}mm · viewBox 300×300
          </p>
        </div>
      </div>

      {/* ── Update Status panel ──────────────────────────────────────────── */}
      {openUpdate && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 24, background: '#FAFAFA' }}>
          <p style={{ fontSize: 14, letterSpacing: '0.25em', color: C.gold, textTransform: 'uppercase',
            fontFamily: 'Helvetica, Arial, sans-serif', marginBottom: 16 }}>Update Order Status</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => setStatus(s.value)}
                style={{ padding: '6px 14px',
                  border: `1px solid ${status === s.value ? s.color : C.border}`,
                  background: status === s.value ? `${s.color}18` : 'transparent',
                  color: status === s.value ? s.color : C.muted,
                  fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Manufacturer Reference', val: mfgRef, set: setMfgRef, placeholder: 'e.g. MFG-2024-001' },
              { label: 'Tracking Number',        val: tracking, set: setTracking, placeholder: 'e.g. IL123456789' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontSize: 15, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase',
                  fontFamily: 'Helvetica, Arial, sans-serif', display: 'block', marginBottom: 6 }}>{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{ width: '100%', border: `1px solid ${C.border}`, padding: '8px 12px',
                    fontSize: 15, fontFamily: 'Georgia, serif', background: C.surface,
                    color: C.text, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            ))}
          </div>

          <textarea value={prodNotes} onChange={e => setProdNotes(e.target.value)}
            rows={2} placeholder="Internal notes..."
            style={{ width: '100%', border: `1px solid ${C.border}`, padding: '8px 12px',
              fontSize: 15, fontFamily: 'Georgia, serif', background: C.surface,
              color: C.text, outline: 'none', resize: 'vertical',
              boxSizing: 'border-box' as const, marginBottom: 16 }} />

          <button onClick={save} disabled={saving}
            style={{ padding: '10px 28px', border: 'none',
              background: saving ? C.muted : C.gold, color: '#fff',
              fontSize: 15, letterSpacing: '0.2em', textTransform: 'uppercase',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* ── History timeline ────────────────────────────────────────────── */}
      {sel.history && sel.history.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 20px',
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: '#FAFAFA' }}>
          <span style={{ fontSize: 15, color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: 4 }}>History:</span>
          {sel.history.map((h, i) => (
            <span key={i} style={{ fontSize: 14, fontFamily: 'Helvetica, Arial, sans-serif' }}>
              <span style={{ color: statusColor(h.status), letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {h.status.replace(/_/g, ' ')}
              </span>
              <span style={{ color: C.muted, marginLeft: 4 }}>
                {new Date(h.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </span>
              {i < sel.history!.length - 1 && <span style={{ color: C.border, margin: '0 6px' }}>→</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

