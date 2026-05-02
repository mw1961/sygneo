'use client';

import { useState, useCallback } from 'react';
import { PROFILER_QUESTIONS, buildProfile } from './lib/profiler-agent';
import type { ProfilerQuestion } from './lib/profiler-agent';

const C = {
  bg:        '#F8F5F0',
  surface:   '#FFFFFF',
  border:    '#DDD8D0',
  borderAct: '#8B7355',
  text:      '#1C1A17',
  sub:       '#7A7060',
  muted:     '#B0A898',
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

type Phase = 'questionnaire' | 'generating' | 'results' | 'confirmed';

interface SealOption {
  pattern:  string;
  shape:    string;
  svg:      string;
  imageUrl?: string;
}

// Questions excluding shape (no longer needed)
const QUESTIONS = PROFILER_QUESTIONS.filter(q => q.id !== 'shape');

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
      const res = await fetch('/api/generate-recraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin:     Array.isArray(currentAnswers.origin) ? currentAnswers.origin : [profile.roots.origin],
          occupation: Array.isArray(currentAnswers.occupation) ? currentAnswers.occupation : [profile.roots.historicOccupation],
          values:     profile.values,
          style:      currentAnswers.style ?? 'modern (clean, geometric)',
          variant:    v,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      const newSeals = (data.seals as {variant: number; svg?: string; imageUrl?: string | null; error: string | null}[])
        .filter(s => s.svg || s.imageUrl)
        .map(s => ({ pattern: `variant-${s.variant}`, shape: 'circle', svg: s.svg || '', imageUrl: s.imageUrl || undefined }));
      setAllSeals(prev => isFirst ? newSeals : [...prev, ...newSeals]);
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
    const value = question.type === 'multiselect'                    ? selectedOptions
                : question.type === 'dropdown' && (question.max ?? 1) > 1 ? selectedOptions
                : question.type === 'dropdown'                            ? (customInput.trim() || selectedOptions[0] || '')
                : question.type === 'select'                              ? selectedOptions[0] ?? ''
                : currentText;

    const updated = { ...answers, [question.id]: value };
    setAnswers(updated);
    setCurrentText('');
    setSelectedOptions([]);
    setCustomInput('');
    setCustomPending('');

    if (isLastStep) {
      setVariant(0);
      setAllSeals([]);
      setChosen(null);
      await fetchMoreSeals(updated, 0, true);
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

  async function handleConfirm() {
    if (chosen === null) return;
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
          sealIndex:  chosen,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSavedId(data.id);
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
    setCustomInput(''); setCustomPending(''); setVariant(0);
  }

  // ── Generating ──────────────────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <main style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: C.text }}>
        <h1 style={{ fontSize: 34, fontWeight: 300, letterSpacing: '0.45em', margin: 0 }}>SYGNEO</h1>
        <div style={{ width: 40, height: 1, background: C.gold, margin: '12px auto 32px' }} />
        <p style={{ fontSize: 12, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Crafting your heritage marks...
        </p>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 12, fontFamily: 'Helvetica, Arial, sans-serif' }}>
          This takes about 30 seconds
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
        <h1 style={{ fontSize: 34, fontWeight: 300, letterSpacing: '0.45em', margin: 0 }}>SYGNEO</h1>
        <div style={{ width: 40, height: 1, background: C.gold, margin: '12px auto 40px' }} />
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <p style={{ fontSize: 10, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', marginBottom: 20, fontFamily: 'Helvetica, Arial, sans-serif' }}>Selection Confirmed</p>
          <h2 style={{ fontSize: 24, fontWeight: 300, marginBottom: 16 }}>Your mark has been received.</h2>
          <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, marginBottom: 40 }}>
            Our team will review your selection and reach out to begin crafting your heritage seal.
          </p>
          {chosen !== null && (
            <div style={{ width: 160, height: 160, margin: '0 auto 40px', border: `1px solid ${C.border}`, padding: 16, background: C.surface }}
              dangerouslySetInnerHTML={{ __html: seals[chosen].svg }} />
          )}
          <p style={{ fontSize: 10, letterSpacing: '0.2em', color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Reference: {savedId}
          </p>
        </div>
      </main>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <main style={{ minHeight: '100vh', background: C.bg, padding: '40px 24px', fontFamily: 'Georgia, serif', color: C.text }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: '0.45em', margin: 0 }}>SYGNEO</h1>
            <div style={{ width: 40, height: 1, background: C.gold, margin: '8px auto 6px' }} />
            <p style={{ fontSize: 10, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Choose your heritage mark
            </p>
          </div>

          {/* Ink color picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}>Ink Color</span>
            {COLORS.map(c => (
              <button key={c.value} onClick={() => handleColorChange(c.value)} title={c.label}
                style={{ width: 28, height: 28, borderRadius: '50%', background: c.hex, border: color === c.value ? `3px solid ${C.gold}` : `2px solid ${C.border}`, cursor: 'pointer', outline: 'none', transition: 'border 0.2s' }} />
            ))}
          </div>

          {/* Seal grid — accumulates all generated sets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
            {seals.map((seal, idx) => {
              const isSelected = chosen === idx;
              return (
                <button key={idx} onClick={() => setChosen(isSelected ? null : idx)}
                  style={{ border: `2px solid ${isSelected ? C.gold : C.border}`, background: isSelected ? 'rgba(139,115,85,0.06)' : C.surface, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
                  {seal.imageUrl
                    ? <img src={seal.imageUrl} alt={`Option ${idx + 1}`} style={{ width: 200, height: 200, objectFit: 'contain' }} />
                    : <div style={{ width: 200, height: 200 }} dangerouslySetInnerHTML={{ __html: seal.svg }} />
                  }
                  <span style={{ fontSize: 9, color: isSelected ? C.gold : C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                    {isSelected ? '✓ Selected' : `Option ${idx + 1}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Notes + Confirm */}
          {chosen !== null && (
            <div style={{ border: `1px solid ${C.border}`, background: C.surface, padding: '24px', marginTop: 24 }}>
              <p style={{ fontSize: 10, letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase', margin: '0 0 12px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                Notes for the designer (optional)
              </p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any preferences or refinements you'd like..."
                rows={2}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 14, padding: '0 0 10px', outline: 'none', fontFamily: 'Georgia, serif', resize: 'none', boxSizing: 'border-box' }} />
              <button onClick={handleConfirm} disabled={saving}
                style={{ marginTop: 18, padding: '13px 36px', border: 'none', background: saving ? C.muted : C.gold, color: '#fff', fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500 }}>
                {saving ? 'Saving...' : 'Confirm & Lock Selection'}
              </button>
            </div>
          )}

          {error && <p style={{ color: '#A0522D', fontSize: 13, marginTop: 16 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, marginTop: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleGenerateMore} disabled={generating}
              style={{ padding: '10px 24px', border: `1px solid ${C.gold}`, background: 'transparent', color: generating ? C.muted : C.gold, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              {generating ? 'Generating...' : '↻ Generate 4 More'}
            </button>
            <button onClick={handleReset}
              style={{ padding: '10px 24px', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Start Over
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Questionnaire ────────────────────────────────────────────────────────────
  return (
    <main style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', position: 'relative', fontFamily: 'Georgia, serif' }}>
      <a href="/admin/login" style={{ position: 'absolute', top: 24, right: 32, fontSize: 11, letterSpacing: '0.25em', color: C.gold, textDecoration: 'none', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif', border: `1px solid ${C.border}`, padding: '8px 18px' }}>Admin</a>

      <div style={{ marginBottom: 52, textAlign: 'center' }}>
        <h1 style={{ fontSize: 38, fontWeight: 300, letterSpacing: '0.45em', color: C.text, margin: 0 }}>SYGNEO</h1>
        <div style={{ width: 40, height: 1, background: C.gold, margin: '10px auto 8px' }} />
        <p style={{ fontSize: 10, letterSpacing: '0.32em', color: C.gold, textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>Heritage · Legacy · Trust</p>
      </div>

      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{ height: 1, flex: 1, background: i <= step ? C.gold : C.border, transition: 'background 0.4s' }} />
          ))}
        </div>

        <p style={{ fontSize: 10, letterSpacing: '0.3em', color: C.muted, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Step {step + 1} of {QUESTIONS.length}
        </p>
        <h2 style={{ fontSize: 26, fontWeight: 300, marginBottom: 8, lineHeight: 1.4 }}>{question?.question}</h2>
        <p style={{ fontSize: 14, color: C.sub, marginBottom: 36, lineHeight: 1.6 }}>{question?.hint}</p>

        {question?.type === 'text' && (
          <input type="text" value={currentText} onChange={e => setCurrentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
            placeholder="Your answer..." autoFocus
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 18, paddingBottom: 12, outline: 'none', fontFamily: 'Georgia, serif', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderBottomColor = C.gold}
            onBlur={e => e.target.style.borderBottomColor = C.border} />
        )}

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
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              {/* Counter */}
              {max > 1 && (
                <p style={{ fontSize: 10, color: atMax ? C.gold : C.muted, margin: 0, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>
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
                  <span style={{ fontSize: 10, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif', whiteSpace: 'nowrap' }}>Or type:</span>
                  <input type="text" value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && customInput.trim()) { addCountry(customInput); setCustomInput(''); } }}
                    placeholder="e.g. Catalonia, Yemen 1800s..."
                    style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid ${customInput.trim() ? C.borderAct : C.border}`, color: C.text, fontSize: 15, paddingBottom: 8, outline: 'none', fontFamily: 'Georgia, serif' }} />
                  <button onClick={() => { addCountry(customInput); setCustomInput(''); }}
                    disabled={!customInput.trim()}
                    style={{ padding: '6px 14px', border: `1px solid ${C.border}`, background: 'transparent', color: C.gold, fontSize: 11, letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', textTransform: 'uppercase' }}>
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
              <p style={{ fontSize: 11, color: selectedOptions.length >= (question.max ?? 3) ? C.gold : C.muted, marginBottom: 4, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>
                {selectedOptions.length} / {question.max} selected
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: question.options && question.options.length > 8 ? 320 : 'none', overflowY: question.options && question.options.length > 8 ? 'auto' : 'visible', paddingRight: question.options && question.options.length > 8 ? 4 : 0 }}>
              {question.options?.map(opt => {
                const active   = selectedOptions.includes(opt);
                const atMax    = !active && selectedOptions.length >= (question?.max ?? Infinity);
                return (
                  <button key={opt} onClick={() => !atMax && toggleOption(opt)} disabled={atMax}
                    style={{ textAlign: 'left', padding: '12px 18px', border: `1px solid ${active ? C.borderAct : C.border}`, background: active ? 'rgba(139,115,85,0.06)' : C.surface, color: active ? C.text : atMax ? C.muted : C.sub, fontSize: 14, cursor: atMax ? 'not-allowed' : 'pointer', fontFamily: 'Georgia, serif', transition: 'all 0.2s', opacity: atMax ? 0.45 : 1 }}>
                    {active && <span style={{ color: C.gold, marginRight: 8 }}>✓</span>}{opt}
                  </button>
                );
              })}
            </div>
            {question.type === 'multiselect' && !question.max && (
              <p style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>Select 2–3 values</p>
            )}
            {question.type === 'multiselect' && question.max && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: C.muted, letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif', whiteSpace: 'nowrap' }}>Or add:</span>
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
                  style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: `1px solid ${customPending.trim() ? C.borderAct : C.border}`, color: C.text, fontSize: 14, paddingBottom: 6, outline: 'none', fontFamily: 'Georgia, serif' }}
                />
                <button
                  onClick={() => {
                    if (customPending.trim() && selectedOptions.length < (question?.max ?? 3)) {
                      setSelectedOptions(prev => [...prev, customPending.trim()]);
                      setCustomPending('');
                    }
                  }}
                  disabled={!customPending.trim() || selectedOptions.length >= (question?.max ?? 3)}
                  style={{ padding: '6px 14px', border: `1px solid ${C.border}`, background: 'transparent', color: C.gold, fontSize: 11, letterSpacing: '0.15em', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', textTransform: 'uppercase' }}>
                  + Add
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p style={{ color: '#A0522D', fontSize: 13, marginTop: 16 }}>{error}</p>}

        {step > 0 && (
          <button onClick={() => { setStep(s => s - 1); setCurrentText(''); setSelectedOptions([]); setCustomInput(''); setCustomPending(''); }}
            style={{ marginTop: 24, marginRight: 16, padding: '10px 20px', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
            ← Back
          </button>
        )}

        <button onClick={handleNext} disabled={!canProceed}
          style={{ marginTop: 40, padding: '13px 36px', border: `1px solid ${canProceed ? C.gold : C.border}`, background: 'transparent', color: canProceed ? C.gold : C.muted, fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: canProceed ? 'pointer' : 'not-allowed', fontFamily: 'Helvetica, Arial, sans-serif', transition: 'all 0.2s' }}
          onMouseEnter={e => { if (canProceed) { (e.target as HTMLButtonElement).style.background = C.gold; (e.target as HTMLButtonElement).style.color = C.bg; } }}
          onMouseLeave={e => { if (canProceed) { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = C.gold; } }}>
          {isLastStep ? 'Generate My Seal →' : 'Continue →'}
        </button>
      </div>
    </main>
  );
}
