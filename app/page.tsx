'use client';

import { useState, useCallback, useEffect, type ReactElement } from 'react';
import { PROFILER_QUESTIONS, buildProfile, ALPHABETS, getAlphabetKey } from './lib/profiler-agent';
import type { ProfilerQuestion } from './lib/profiler-agent';
import { fontSpec } from './lib/seal-prompt';

const C = {
  bg:        '#F8F5F0',
  surface:   '#FFFFFF',
  border:    '#DDD8D0',
  borderAct: '#8B7355',
  text:      '#1C1A17',
  sub:       '#5C5248',
  muted:     '#7A6E64',
  gold:      '#8B7355',
};

const PATTERN_LABELS: Record<string, string> = {
  angular: 'Geometric',
  organic: 'Organic',
  hybrid:  'Hybrid',
};

const SHAPE_LABELS: Record<string, string> = {
  circle:   '○ Circle',
  square:   '□ Square',
  triangle: '△ Triangle',
};

const COLORS = [
  { label: 'Black',        value: '#000000', hex: '#000000' },
  { label: 'Deep Navy',    value: '#191970', hex: '#191970' },
  { label: 'Crimson',      value: '#8B0000', hex: '#8B0000' },
  { label: 'Forest Green', value: '#1B4332', hex: '#1B4332' },
];

type Phase = 'questionnaire' | 'confirming' | 'generating' | 'results' | 'confirmed';
type ShapeFilter = 'all' | 'circle' | 'square';

interface SealOption {
  pattern:  string;
  shape:    string;
  svg:      string;
  imageUrl?: string;
}

// Exclude shape and style (no longer collected)
const QUESTIONS = PROFILER_QUESTIONS.filter(q => q.id !== 'shape' && q.id !== 'style');

const MAX_GENERATIONS = 2; // 2 batches × 6 seals = 12 total

function ShipField({ label, k, required, placeholder, shipping, setShipping, C, inline, numeric, tel }: {
  label: string; k: string; required?: boolean; placeholder: string;
  shipping: Record<string, string>;
  setShipping: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  C: Record<string, string>; inline?: boolean; numeric?: boolean; tel?: boolean;
}) {
  const inputMode = numeric ? 'numeric' : tel ? 'tel' : 'text';
  const type      = tel ? 'tel' : 'text';

  function handleChange(val: string) {
    // For numeric fields: strip non-digits
    const cleaned = numeric ? val.replace(/\D/g, '') : val;
    setShipping(s => ({ ...s, [k]: cleaned }));
  }

  return (
    <div style={inline ? {} : { marginBottom: 14 }}>
      <label style={{ fontSize: 13, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase',
        fontFamily: 'Helvetica, Arial, sans-serif', display: 'block', marginBottom: 5 }}>
        {label}{required && <span style={{ color: C.gold }}> *</span>}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={shipping[k] ?? ''}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', border: `1px solid ${C.border}`, padding: '9px 12px',
          fontSize: 15, fontFamily: 'Georgia, serif', background: C.bg,
          color: C.text, outline: 'none', boxSizing: 'border-box' as const }} />
    </div>
  );
}

export default function HomePage() {
  const [step, setStep]                       = useState(0);
  const [answers, setAnswers]                 = useState<Record<string, string | string[]>>({});
  const [currentText, setCurrentText]         = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [phase, setPhase]                     = useState<Phase>('questionnaire');
  const [allSeals, setAllSeals]               = useState<SealOption[]>([]);
  const [chosen, setChosen]                   = useState<number | null>(null);
  const [notes, setNotes]                     = useState('');
  const [color, setColor]                     = useState('#000000');
  const [error, setError]                     = useState('');
  const [saving, setSaving]                   = useState(false);
  const [savedId, setSavedId]                 = useState('');
  const [customInput, setCustomInput]         = useState('');
  const [customPending, setCustomPending]     = useState('');
  const [variant, setVariant]                 = useState(0);
  const [generating, setGenerating]           = useState(false);
  const [elapsed, setElapsed]                 = useState(0);
  const [genCount, setGenCount]               = useState(0);
  const [shapeFilter, setShapeFilter]         = useState<ShapeFilter>('all');
  const [previewIdx, setPreviewIdx]           = useState<number | null>(null);
  const [showModal, setShowModal]             = useState(false);
  const [shipping, setShipping]               = useState<Record<string, string>>({
    recipientName: '', country: '', street: '', streetNumber: '',
    apartment: '', postalCode: '', phone: '', invoiceName: '',
  });
  const [termsAccepted, setTermsAccepted]     = useState(false);

  const genLimitReached = genCount >= MAX_GENERATIONS;

  useEffect(() => {
    if (!generating) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [generating]);

  // Apply ink color by replacing black in SVG strings
  const seals = allSeals.map(s => ({
    ...s,
    svg: color === '#000000' ? s.svg
      : s.svg.replace(/stroke="black"/g, `stroke="${color}"`).replace(/fill="black"/g, `fill="${color}"`),
  }));

  const question: ProfilerQuestion | undefined = QUESTIONS[step];
  const isLastStep = step === QUESTIONS.length - 1;

  const minSelect = question?.min ?? (question?.type === 'multiselect' ? 2 : 1);
  const canProceed = question?.type === 'text'
    ? currentText.trim().length > 0
    : question?.type === 'dropdown'
    ? selectedOptions.length > 0 || customInput.trim().length > 0
    : selectedOptions.length >= minSelect;

  function toggleOption(opt: string) {
    if (question?.type === 'select' || question?.type === 'dropdown') {
      setSelectedOptions([opt]);
    } else {
      const max = question?.max ?? Infinity;
      setSelectedOptions(prev => {
        if (prev.includes(opt)) return prev.filter(o => o !== opt);
        if (prev.length >= max) return prev;
        return [...prev, opt];
      });
    }
  }

  const fetchMoreSeals = useCallback(async (
    currentAnswers: Record<string, string | string[]>,
    v: number,
    isFirst: boolean,
  ) => {
    const profile = buildProfile({ ...currentAnswers, shape: 'circle' });
    if (isFirst) setPhase('generating');
    else setGenerating(true);
    setError('');
    try {
      const lineage = (currentAnswers.lineageStart as string) || '';
      const res = await fetch('/api/generate-recraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin:     Array.isArray(currentAnswers.origin) ? currentAnswers.origin : [profile.roots.origin],
          occupation: Array.isArray(currentAnswers.occupation) ? currentAnswers.occupation : [profile.roots.historicOccupation],
          values:     profile.values,
          lineage,
          language:   (currentAnswers.language as string) || '',
          initial:    (currentAnswers.initial as string) || '',
          variant:    v,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      const newSeals = (data.seals as {variant: number; shape?: string; svg?: string; imageUrl?: string | null; error: string | null}[])
        .filter(s => s.svg || s.imageUrl)
        .map(s => ({ pattern: `variant-${s.variant}`, shape: s.shape || 'circle', svg: s.svg || '', imageUrl: s.imageUrl || undefined }));
      setAllSeals(prev => isFirst ? newSeals : [...prev, ...newSeals]);
      setGenCount(prev => prev + 1);
      setPhase('results');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      if (isFirst) setPhase('questionnaire');
    } finally {
      setGenerating(false);
    }
  }, []);

  async function handleNext() {
    if (!question) return;
    const value = question.type === 'multiselect'                         ? selectedOptions
                : question.type === 'dropdown' && (question.max ?? 1) > 1 ? selectedOptions
                : question.type === 'dropdown'                             ? (customInput.trim() || selectedOptions[0] || '')
                : question.type === 'select' || question.type === 'alphabet' ? selectedOptions[0] ?? ''
                : currentText;

    const updated = { ...answers, [question.id]: value };
    setAnswers(updated);
    setCurrentText('');
    setSelectedOptions([]);
    setCustomInput('');
    setCustomPending('');

    if (isLastStep) {
      setPhase('confirming');
    } else {
      setStep(s => s + 1);
    }
  }

  function handleColorChange(newColor: string) {
    setColor(newColor);
  }

  async function handleGenerateMore() {
    const next = variant + 1;
    setVariant(next);
    await fetchMoreSeals(answers, next, false);
  }

  const shippingValid = shipping.recipientName.trim() && shipping.country.trim() &&
    shipping.street.trim() && shipping.streetNumber.trim() && shipping.postalCode.trim() &&
    termsAccepted;

  async function handleConfirm() {
    if (chosen === null || !shippingValid) return;
    setSaving(true); setError('');
    try {
      const profile = buildProfile({ ...answers, shape: seals[chosen].shape });
      const sealSvg = seals[chosen].svg || seals[chosen].imageUrl || '';
      const res = await fetch('/api/save-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            origin:     profile.roots.origin,
            occupation: profile.roots.historicOccupation,
            values:     profile.values,
            shape:      seals[chosen].shape,
            style:      seals[chosen].pattern,
            inkColor:   color,
          },
          sealSvg,
          sealIndex: chosen,
          notes,
          shipping: {
            recipientName: shipping.recipientName,
            country:       shipping.country,
            street:        shipping.street,
            streetNumber:  shipping.streetNumber,
            apartment:     shipping.apartment  || undefined,
            postalCode:    shipping.postalCode,
            phone:         shipping.phone      || undefined,
            invoiceName:   shipping.invoiceName || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSavedId(data.id);
      setShowModal(false);
      setPhase('confirmed');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save selection');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setStep(0); setAnswers({}); setCurrentText(''); setSelectedOptions([]);
    setPhase('questionnaire'); setAllSeals([]); setChosen(null); setNotes('');
    setError(''); setSavedId(''); setColor('#000000');
    setCustomInput(''); setCustomPending(''); setVariant(0); setGenCount(0);
    setShapeFilter('all');
  }

  // ── Confirming ──────────────────────────────────────────────────────────────
  if (phase === 'confirming') {
    const familyInitial = ((answers.initial as string) || '').trim().slice(0, 4) || '?';
    const language      = (answers.language as string) || '';
    const origins       = (Array.isArray(answers.origin) ? answers.origin : [answers.origin]).filter(Boolean) as string[];
    const occupations   = (Array.isArray(answers.occupation) ? answers.occupation : [answers.occupation]).filter(Boolean) as string[];
    const vals          = (Array.isArray(answers.values) ? answers.values : [answers.values]).filter(Boolean) as string[];

    async function handleGenerateFromConfirm() {
      setVariant(0); setAllSeals([]); setChosen(null);
      await fetchMoreSeals(answers, 0, true);
    }

    return (
      <main style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', fontFamily: 'Georgia, serif', color: C.text }}>
        <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: '0.45em', margin: 0 }}>SYGNEO</h1>
        <div style={{ width: 40, height: 1, background: C.gold, margin: '12px auto 32px' }} />

        <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <p style={{ fontSize: 13, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', marginBottom: 28, fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Confirm Your Heritage Profile
          </p>

          {/* Initial preview */}
          <div style={{ border: `1px solid ${C.border}`, background: C.surface, padding: '36px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 96, lineHeight: 1, marginBottom: 12, color: C.text, fontFamily: fontSpec(language) }}>
              {familyInitial}
            </div>
            <p style={{ fontSize: 13, color: C.muted, letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {language || 'Latin script'}
            </p>
          </div>

          {/* Profile summary */}
          <div style={{ border: `1px solid ${C.border}`, padding: '4px 24px', marginBottom: 32, textAlign: 'left' }}>
            {[
              { label: 'Origin',      value: origins.join(', ') },
              { label: 'Occupation',  value: occupations.join(', ') },
              { label: 'Values',      value: vals.join(', ') },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif', width: 100, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 15, color: C.text }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => { setStep(QUESTIONS.length - 1); setPhase('questionnaire'); }}
              style={{ padding: '10px 24px', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              ← Edit
            </button>
            <button onClick={handleGenerateFromConfirm}
              style={{ padding: '13px 36px', border: 'none', background: C.gold, color: '#fff', fontSize: 15, letterSpacing: '0.28em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500 }}>
              Generate My Seal →
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Generating ──────────────────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <main style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: C.text }}>
        <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: '0.45em', margin: 0 }}>SYGNEO</h1>
        <div style={{ width: 40, height: 1, background: C.gold, margin: '12px auto 32px' }} />
        <p style={{ fontSize: 15, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Crafting your heritage marks...
        </p>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 12, fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Crafting 24 unique designs — this takes about 45 seconds
        </p>
        <div style={{ marginTop: 32, display: 'flex', gap: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, animation: `pulse 1.2s ease-in-out ${i * 0.4}s infinite` }} />
          ))}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:0.2}50%{opacity:1}}`}</style>
      </main>
    );
  }

  // ── Confirmed ───────────────────────────────────────────────────────────────
  if (phase === 'confirmed') {
    return (
      <main style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', fontFamily: 'Georgia, serif', color: C.text }}>
        <h1 style={{ fontSize: 36, fontWeight: 300, letterSpacing: '0.45em', margin: 0 }}>SYGNEO</h1>
        <div style={{ width: 40, height: 1, background: C.gold, margin: '12px auto 40px' }} />
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <p style={{ fontSize: 15, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', marginBottom: 20, fontFamily: 'Helvetica, Arial, sans-serif' }}>Selection Confirmed</p>
          <h2 style={{ fontSize: 24, fontWeight: 300, marginBottom: 16 }}>Your mark has been received.</h2>
          <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.7, marginBottom: 40 }}>
            Our team will review your selection and reach out to begin crafting your heritage seal.
          </p>
          {chosen !== null && (
            <div style={{ width: 160, height: 160, margin: '0 auto 40px', border: `1px solid ${C.border}`, padding: 16, background: C.surface }}
              dangerouslySetInnerHTML={{ __html: seals[chosen].svg }} />
          )}
          <p style={{ fontSize: 15, letterSpacing: '0.2em', color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Reference: {savedId}
          </p>
        </div>
      </main>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <>
      <main style={{ minHeight: '100vh', background: C.bg, padding: '40px 24px', fontFamily: 'Georgia, serif', color: C.text }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{ fontSize: 30, fontWeight: 300, letterSpacing: '0.45em', margin: 0 }}>SYGNEO</h1>
            <div style={{ width: 40, height: 1, background: C.gold, margin: '8px auto 6px' }} />
            <p style={{ fontSize: 15, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Choose your heritage mark
            </p>
          </div>

          {/* Ink color + Shape filter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}>Ink</span>
              {COLORS.map(c => (
                <button key={c.value} onClick={() => handleColorChange(c.value)} title={c.label}
                  style={{ width: 22, height: 22, borderRadius: '50%', background: c.hex, border: color === c.value ? `3px solid ${C.gold}` : `2px solid ${C.border}`, cursor: 'pointer', outline: 'none', transition: 'border 0.2s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {(['all', 'circle', 'square'] as ShapeFilter[]).map(f => (
                <button key={f} onClick={() => setShapeFilter(f)}
                  style={{ padding: '5px 14px', border: `1px solid ${shapeFilter === f ? C.gold : C.border}`, background: shapeFilter === f ? 'rgba(139,115,85,0.08)' : 'transparent', color: shapeFilter === f ? C.gold : C.muted, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', transition: 'all 0.2s' }}>
                  {f === 'all' ? 'All' : f === 'circle' ? '○ Circle' : '□ Square'}
                </button>
              ))}
            </div>
          </div>

          {/* Loading indicator */}
          {generating && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 2, background: C.border, borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: C.gold, borderRadius: 1, width: `${Math.min(95, (elapsed / 30) * 100)}%`, transition: 'width 1s linear' }} />
              </div>
              <p style={{ fontSize: 15, color: C.gold, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif', marginTop: 6 }}>
                Crafting marks... {elapsed}s
              </p>
            </div>
          )}

          {/* Seal grid — 3×4 per shape view */}
          {(() => {
            const filteredSeals = seals
              .map((s, i) => ({ ...s, origIdx: i }))
              .filter(s => {
                if (shapeFilter === 'circle') return s.shape === 'circle';
                if (shapeFilter === 'square') return s.shape === 'square';
                return true;
              });
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
                {filteredSeals.map((seal) => {
                  const isSelected = chosen === seal.origIdx;
                  return (
                    <button key={seal.origIdx}
                      onClick={() => setPreviewIdx(seal.origIdx)}
                      style={{ border: `2px solid ${isSelected ? C.gold : C.border}`, background: isSelected ? 'rgba(139,115,85,0.06)' : C.surface, padding: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all 0.2s', position: 'relative' }}>
                      {isSelected && (
                        <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 12, color: C.gold }}>✓</span>
                      )}
                      {seal.imageUrl
                        ? <img src={seal.imageUrl} alt={`Option ${seal.origIdx + 1}`} style={{ width: 130, height: 130, objectFit: 'contain' }} />
                        : <div style={{ width: 130, height: 130 }} dangerouslySetInnerHTML={{ __html: seal.svg }} />
                      }
                      <span style={{ fontSize: 11, color: isSelected ? C.gold : C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                        {isSelected ? 'Selected' : `No. ${seal.origIdx + 1}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Notes + Confirm */}
          {chosen !== null && (
            <div style={{ border: `1px solid ${C.border}`, background: C.surface, padding: '24px', marginTop: 24 }}>
              <p style={{ fontSize: 15, letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase', margin: '0 0 12px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                Notes for the designer (optional)
              </p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any preferences or refinements you'd like..."
                rows={2}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 15, padding: '0 0 10px', outline: 'none', fontFamily: 'Georgia, serif', resize: 'none', boxSizing: 'border-box' }} />
              <button onClick={() => setShowModal(true)}
                style={{ marginTop: 18, padding: '13px 36px', border: 'none', background: C.gold, color: '#fff', fontSize: 15, letterSpacing: '0.28em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500 }}>
                Confirm & Order →
              </button>
            </div>
          )}

          {error && <p style={{ color: '#A0522D', fontSize: 13, marginTop: 16 }}>{error}</p>}

          {/* Generation limit notice */}
          {genLimitReached && (
            <div style={{ border: `1px solid ${C.border}`, padding: '12px 16px', marginTop: 16, background: 'rgba(139,115,85,0.04)' }}>
              <p style={{ fontSize: 13, color: C.sub, margin: 0, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>
                You&apos;ve explored {MAX_GENERATIONS} sets of designs. Please select your favourite mark above to proceed.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            {!genLimitReached && (
              <button onClick={() => handleGenerateMore()} disabled={generating}
                style={{ padding: '10px 24px', border: `1px solid ${C.gold}`, background: 'transparent', color: generating ? C.muted : C.gold, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                {generating ? 'Generating...' : `↻ Try Again — New Designs (${MAX_GENERATIONS - genCount} left)`}
              </button>
            )}
            <button onClick={handleReset}
              style={{ padding: '10px 24px', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Start Over
            </button>
          </div>
          {/* Generation counter */}
          {!genLimitReached && genCount > 0 && (
            <p style={{ fontSize: 13, color: C.muted, marginTop: 10, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.15em' }}>
              {genCount} / {MAX_GENERATIONS} generation{genCount > 1 ? 's' : ''} used
            </p>
          )}
        </div>
      </main>

      {/* ── Confirmation Modal ─────────────────────────────────────────────── */}
      {showModal && chosen !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,23,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          overflowY: 'auto', padding: '40px 16px' }}>
          <div style={{ background: C.surface, maxWidth: 520, width: '100%',
            padding: '40px 36px', fontFamily: 'Georgia, serif', color: C.text, position: 'relative' }}>

            <button onClick={() => setShowModal(false)}
              style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none',
                fontSize: 20, color: C.muted, cursor: 'pointer', lineHeight: 1 }}>×</button>

            <p style={{ fontSize: 15, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase',
              marginBottom: 20, fontFamily: 'Helvetica, Arial, sans-serif' }}>Confirm Your Selection</p>

            {/* Seal preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28,
              padding: '16px 20px', border: `1px solid ${C.border}`, background: C.bg }}>
              <div style={{ width: 90, height: 90, flexShrink: 0 }}
                dangerouslySetInnerHTML={{ __html: seals[chosen].svg }} />
              <div>
                <p style={{ fontSize: 13, margin: '0 0 6px' }}>This is the mark you are ordering.</p>
                <p style={{ fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.6 }}>
                  Once submitted, our team will begin production of your personal heritage stamp.
                </p>
              </div>
            </div>

            {/* Ink notice */}
            <div style={{ background: '#FFF8F0', border: `1px solid #DDD8D0`,
              padding: '12px 16px', marginBottom: 28, borderLeft: `3px solid ${C.gold}` }}>
              <p style={{ fontSize: 13, color: C.sub, margin: 0, lineHeight: 1.7, fontFamily: 'Helvetica, Arial, sans-serif' }}>
                <strong style={{ color: C.text }}>Note:</strong> Your stamp will arrive <strong>without ink</strong> due to postal and import/export regulations. Stamp ink pads are widely available at stationery and office supply stores.
              </p>
            </div>

            {/* Shipping address */}
            <p style={{ fontSize: 15, letterSpacing: '0.25em', color: C.gold, textTransform: 'uppercase',
              marginBottom: 16, fontFamily: 'Helvetica, Arial, sans-serif' }}>Shipping Address</p>

            {/* Row: Recipient Name */}
            <ShipField label="Recipient Name" k="recipientName" required placeholder="Full name" shipping={shipping} setShipping={setShipping} C={C} />
            {/* Row: Country */}
            <ShipField label="Country" k="country" required placeholder="e.g. Israel" shipping={shipping} setShipping={setShipping} C={C} />
            {/* Row: Street + Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
              <ShipField label="Street" k="street" required placeholder="Street name" shipping={shipping} setShipping={setShipping} C={C} inline />
              <ShipField label="Number" k="streetNumber" required placeholder="12" numeric shipping={shipping} setShipping={setShipping} C={C} inline />
            </div>
            {/* Row: Apt + Postal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <ShipField label="Apt / Floor" k="apartment" placeholder="Optional" numeric shipping={shipping} setShipping={setShipping} C={C} inline />
              <ShipField label="Postal Code" k="postalCode" required placeholder="e.g. 6100000" numeric shipping={shipping} setShipping={setShipping} C={C} inline />
            </div>
            {/* Row: Phone (optional) */}
            <ShipField label="Mobile Phone" k="phone" placeholder="+972 50 000 0000 (optional)" tel shipping={shipping} setShipping={setShipping} C={C} />

            {/* Invoice name */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 13, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase',
                fontFamily: 'Helvetica, Arial, sans-serif', display: 'block', marginBottom: 5 }}>
                Invoice Name <span style={{ color: C.muted, fontStyle: 'italic' }}>(if different from recipient)</span>
              </label>
              <input value={shipping.invoiceName}
                onChange={e => setShipping(s => ({ ...s, invoiceName: e.target.value }))}
                placeholder="Company or individual name for invoice"
                style={{ width: '100%', border: `1px solid ${C.border}`, padding: '9px 12px',
                  fontSize: 15, fontFamily: 'Georgia, serif', background: C.bg,
                  color: C.text, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Terms consent */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                aria-required="true"
                style={{ marginTop: 3, width: 16, height: 16, cursor: 'pointer', accentColor: C.gold }} />
              <span style={{ fontSize: 15, color: C.sub, lineHeight: 1.6 }}>
                I have read and agree to the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                  style={{ color: C.gold, textDecoration: 'underline' }}>
                  Terms of Use &amp; Privacy Policy
                </a>
                . I understand my stamp will arrive <strong>without ink</strong> and that delivery dates may vary.
              </span>
            </label>

            {error && <p style={{ color: '#A0522D', fontSize: 13, marginBottom: 16 }}>{error}</p>}

            <button onClick={handleConfirm} disabled={saving || !shippingValid}
              style={{ width: '100%', padding: '14px', border: 'none',
                background: (saving || !shippingValid) ? C.muted : C.gold,
                color: '#fff', fontSize: 15, letterSpacing: '0.3em', textTransform: 'uppercase',
                cursor: (saving || !shippingValid) ? 'not-allowed' : 'pointer',
                fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500 }}>
              {saving ? 'Placing Order...' : 'Place Order'}
            </button>
            <p style={{ fontSize: 15, color: C.muted, textAlign: 'center', marginTop: 12,
              fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Fields marked <span style={{ color: C.gold }}>*</span> are required
            </p>
          </div>
        </div>
      )}
      {/* ── Master Preview Modal ──────────────────────────────────────────────── */}
      {previewIdx !== null && (() => {
        const previewSeal = seals[previewIdx];
        if (!previewSeal) return null;
        const isChosen = chosen === previewIdx;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,26,23,0.8)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setPreviewIdx(null)}>
            <div style={{ background: C.surface, maxWidth: 400, width: '100%', padding: '36px 32px',
              fontFamily: 'Georgia, serif', color: C.text, position: 'relative' }}
              onClick={e => e.stopPropagation()}>

              <button onClick={() => setPreviewIdx(null)}
                style={{ position: 'absolute', top: 14, right: 18, background: 'none', border: 'none',
                  fontSize: 22, color: C.muted, cursor: 'pointer', lineHeight: 1 }}>×</button>

              <p style={{ fontSize: 13, letterSpacing: '0.25em', color: C.gold, textTransform: 'uppercase',
                marginBottom: 20, fontFamily: 'Helvetica, Arial, sans-serif', textAlign: 'center' }}>
                Design Preview · No. {previewIdx + 1}
              </p>

              <div style={{ width: 240, height: 240, margin: '0 auto 28px', border: `1px solid ${C.border}`, padding: 8, background: C.bg }}
                dangerouslySetInnerHTML={{ __html: previewSeal.svg }} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPreviewIdx(null)}
                  style={{ flex: 1, padding: '11px', border: `1px solid ${C.border}`, background: 'transparent',
                    color: C.muted, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase',
                    cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                  ← Back
                </button>
                <button onClick={() => { setChosen(isChosen ? null : previewIdx); setPreviewIdx(null); }}
                  style={{ flex: 2, padding: '11px', border: 'none',
                    background: isChosen ? C.border : C.gold, color: '#fff',
                    fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase',
                    cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500 }}>
                  {isChosen ? 'Deselect' : 'Choose This Design →'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      </>
    );
  }

  // ── Questionnaire ────────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', position: 'relative', fontFamily: 'Georgia, serif' }}>
      <a href="/admin/login" style={{ position: 'absolute', top: 24, right: 32, fontSize: 13, letterSpacing: '0.25em', color: C.gold, textDecoration: 'none', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif', border: `1px solid ${C.border}`, padding: '8px 18px' }}>Admin</a>

      <div style={{ marginBottom: 52, textAlign: 'center' }}>
        <h1 style={{ fontSize: 40, fontWeight: 300, letterSpacing: '0.45em', color: C.text, margin: 0 }}>SYGNEO</h1>
        <div style={{ width: 40, height: 1, background: C.gold, margin: '10px auto 8px' }} />
        <p style={{ fontSize: 15, letterSpacing: '0.32em', color: C.gold, textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>Heritage · Legacy · Trust</p>
      </div>

      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{ height: 1, flex: 1, background: i <= step ? C.gold : C.border, transition: 'background 0.4s' }} />
          ))}
        </div>

        <p style={{ fontSize: 15, letterSpacing: '0.3em', color: C.muted, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Step {step + 1} of {QUESTIONS.length}
        </p>
        <h2 style={{ fontSize: 29, fontWeight: 300, marginBottom: 8, lineHeight: 1.4 }}>{question?.question}</h2>
        <p style={{ fontSize: 15, color: C.sub, marginBottom: 36, lineHeight: 1.6 }}>{question?.hint}</p>

        {question?.type === 'text' && (
          <input type="text" value={currentText}
            onChange={e => setCurrentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
            placeholder="Your answer..." autoFocus
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 18, paddingBottom: 12, outline: 'none', fontFamily: 'Georgia, serif', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderBottomColor = C.gold}
            onBlur={e => e.target.style.borderBottomColor = C.border} />
        )}

        {question?.type === 'alphabet' && (() => {
          const language = (answers.language as string) || '';
          const alphaKey = getAlphabetKey(language);
          const letters  = ALPHABETS[alphaKey] ?? ALPHABETS.Latin;
          const font     = fontSpec(language);
          const selected = selectedOptions[0] ?? null;
          const isRtl    = alphaKey === 'Hebrew' || alphaKey === 'Arabic';
          const isCjk    = alphaKey === 'Chinese' || alphaKey === 'Korean' || alphaKey === 'Japanese';
          return (
            <div>
              {/* Preview of selected letter */}
              <div style={{ textAlign: 'center', marginBottom: 20, minHeight: 88 }}>
                {selected ? (
                  <div style={{ fontFamily: font, fontSize: 88, lineHeight: 1, color: C.text, display: 'inline-block', padding: '10px 28px', border: `1px solid ${C.gold}`, background: C.surface }}>
                    {selected}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.25em', textTransform: 'uppercase', paddingTop: 32 }}>
                    Select a letter below
                  </div>
                )}
              </div>
              {/* Letter grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: 6, direction: isRtl ? 'rtl' : 'ltr' }}>
                {letters.map(letter => {
                  const isActive = selected === letter;
                  return (
                    <button key={letter} onClick={() => setSelectedOptions([letter])}
                      style={{ fontFamily: font, fontSize: isCjk ? 20 : 22, height: 46, border: `1px solid ${isActive ? C.borderAct : C.border}`, background: isActive ? 'rgba(139,115,85,0.1)' : C.surface, color: isActive ? C.gold : C.text, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, outline: 'none' }}>
                      {letter}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {question?.type === 'dropdown' && (() => {
          const max = question.max ?? 1;
          const atMax = selectedOptions.length >= max;
          function addCountry(val: string) {
            const v = val.trim();
            if (!v || selectedOptions.includes(v) || atMax) return;
            setSelectedOptions(prev => [...prev, v]);
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Selected chips */}
              {selectedOptions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedOptions.map(opt => (
                    <span key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: `1px solid ${C.borderAct}`, background: 'rgba(139,115,85,0.06)', fontSize: 13, fontFamily: 'Georgia, serif', color: C.text }}>
                      {opt}
                      <button onClick={() => setSelectedOptions(prev => prev.filter(o => o !== opt))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              {/* Counter */}
              {max > 1 && (
                <p style={{ fontSize: 15, color: atMax ? C.gold : C.muted, margin: 0, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>
                  {selectedOptions.length} / {max} selected
                </p>
              )}
              {/* Dropdown */}
              {!atMax && (
                <div style={{ position: 'relative' }}>
                  <select value="" onChange={e => { addCountry(e.target.value); e.target.value = ''; }}
                    style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, color: C.muted, fontSize: 15, padding: '14px 40px 14px 16px', outline: 'none', fontFamily: 'Georgia, serif', appearance: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                    <option value="">— Select a country —</option>
                    {question.options?.filter(o => !selectedOptions.includes(o)).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.muted, fontSize: 12 }}>▾</span>
                </div>
              )}
              {/* Free text */}
              {!atMax && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif', whiteSpace: 'nowrap' }}>Or type:</span>
                  <input type="text" value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { addCountry(customInput); setCustomInput(''); } }}
                    placeholder="e.g. Catalonia, Yemen 1800s..."
                    style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid ${customInput.trim() ? C.borderAct : C.border}`, color: C.text, fontSize: 15, paddingBottom: 8, outline: 'none', fontFamily: 'Georgia, serif' }} />
                  <button onClick={() => { addCountry(customInput); setCustomInput(''); }}
                    disabled={!customInput.trim()}
                    style={{ padding: '6px 14px', border: `1px solid ${C.border}`, background: 'transparent', color: C.gold, fontSize: 13, letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', textTransform: 'uppercase' }}>
                    + Add
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {(question?.type === 'select' || question?.type === 'multiselect') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {question?.type === 'multiselect' && question.max && (
              <p style={{ fontSize: 13, color: selectedOptions.length >= (question.max ?? 3) ? C.gold : C.muted, marginBottom: 4, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>
                {selectedOptions.length} / {question.max} selected
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: question.options && question.options.length > 8 ? 320 : 'none', overflowY: question.options && question.options.length > 8 ? 'auto' : 'visible', paddingRight: question.options && question.options.length > 8 ? 4 : 0 }}>
              {question.options?.map(opt => {
                const active   = selectedOptions.includes(opt);
                const atMax    = !active && selectedOptions.length >= (question?.max ?? Infinity);
                return (
                  <button key={opt} onClick={() => !atMax && toggleOption(opt)} disabled={atMax}
                    style={{ textAlign: 'left', padding: '12px 18px', border: `1px solid ${active ? C.borderAct : C.border}`, background: active ? 'rgba(139,115,85,0.06)' : C.surface, color: active ? C.text : atMax ? C.muted : C.sub, fontSize: 15, cursor: atMax ? 'not-allowed' : 'pointer', fontFamily: 'Georgia, serif', transition: 'all 0.2s', opacity: atMax ? 0.45 : 1 }}>
                    {active && <span style={{ color: C.gold, marginRight: 8 }}>✓</span>}{opt}
                  </button>
                );
              })}
            </div>
            {question.type === 'multiselect' && !question.max && (
              <p style={{ fontSize: 13, color: C.muted, marginTop: 4, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>Select 2–3 values</p>
            )}
            {question.type === 'multiselect' && question.max && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 15, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif', whiteSpace: 'nowrap' }}>Or add:</span>
                <input
                  type="text"
                  value={customPending}
                  onChange={e => setCustomPending(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customPending.trim() && selectedOptions.length < (question?.max ?? 3)) {
                      setSelectedOptions(prev => [...prev, customPending.trim()]);
                      setCustomPending('');
                    }
                  }}
                  placeholder="Custom occupation..."
                  style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid ${customPending.trim() ? C.borderAct : C.border}`, color: C.text, fontSize: 15, paddingBottom: 6, outline: 'none', fontFamily: 'Georgia, serif' }}
                />
                <button
                  onClick={() => {
                    if (customPending.trim() && selectedOptions.length < (question?.max ?? 3)) {
                      setSelectedOptions(prev => [...prev, customPending.trim()]);
                      setCustomPending('');
                    }
                  }}
                  disabled={!customPending.trim() || selectedOptions.length >= (question?.max ?? 3)}
                  style={{ padding: '6px 14px', border: `1px solid ${C.border}`, background: 'transparent', color: C.gold, fontSize: 13, letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', textTransform: 'uppercase' }}>
                  + Add
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p style={{ color: '#A0522D', fontSize: 13, marginTop: 16 }}>{error}</p>}

        {step > 0 && (
          <button onClick={() => { setStep(s => s - 1); setCurrentText(''); setSelectedOptions([]); setCustomInput(''); setCustomPending(''); }}
            style={{ marginTop: 24, marginRight: 16, padding: '10px 20px', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
            ← Back
          </button>
        )}

        <button onClick={handleNext} disabled={!canProceed}
          style={{ marginTop: 40, padding: '13px 36px', border: `1px solid ${canProceed ? C.gold : C.border}`, background: 'transparent', color: canProceed ? C.gold : C.muted, fontSize: 15, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: canProceed ? 'pointer' : 'not-allowed', fontFamily: 'Helvetica, Arial, sans-serif', transition: 'all 0.2s' }}
          onMouseEnter={e => { if (canProceed) { (e.target as HTMLButtonElement).style.background = C.gold; (e.target as HTMLButtonElement).style.color = C.bg; } }}
          onMouseLeave={e => { if (canProceed) { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = C.gold; } }}>
          {isLastStep ? 'Generate My Seal →' : 'Continue →'}
        </button>
      </div>
    </main>
  );
}
