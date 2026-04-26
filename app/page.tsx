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

const SHAPES  = ['Circle', 'Square', 'Triangle'];
const STYLES  = ['Japanese (minimal, precise)', 'Modern (clean, geometric)', 'Ancient (classical, ornate)', 'Abstract (symbolic, open)'];
const COLORS  = [
  { label: 'Black',        value: 'Black (#000000)',        hex: '#000000' },
  { label: 'Deep Navy',    value: 'Deep Navy (#191970)',    hex: '#191970' },
  { label: 'Crimson',      value: 'Crimson (#8B0000)',      hex: '#8B0000' },
  { label: 'Forest Green', value: 'Forest Green (#1B4332)', hex: '#1B4332' },
];

type Phase = 'questionnaire' | 'generating' | 'results' | 'confirmed';

export default function HomePage() {
  const [step, setStep]                       = useState(0);
  const [answers, setAnswers]                 = useState<Record<string, string | string[]>>({});
  const [currentText, setCurrentText]         = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [phase, setPhase]                     = useState<Phase>('questionnaire');
  const [seals, setSeals]                     = useState<string[]>([]);
  const [chosen, setChosen]                   = useState<number | null>(null);
  const [notes, setNotes]                     = useState('');
  const [error, setError]                     = useState('');
  const [saving, setSaving]                   = useState(false);
  const [savedId, setSavedId]                 = useState('');

  // Quick-change panel state
  const [quickShape, setQuickShape]   = useState('Circle');
  const [quickStyle, setQuickStyle]   = useState('Modern (clean, geometric)');
  const [quickColor, setQuickColor]   = useState('Black (#000000)');
  const [paramsChanged, setParamsChanged] = useState(false);

  const question: ProfilerQuestion | undefined = PROFILER_QUESTIONS[step];
  const isLastStep = step === PROFILER_QUESTIONS.length - 1;

  const canProceed = question?.type === 'text'
    ? currentText.trim().length > 0
    : selectedOptions.length > 0 && (question?.type !== 'multiselect' || selectedOptions.length >= 2);

  function toggleOption(opt: string) {
    if (question?.type === 'select') setSelectedOptions([opt]);
    else setSelectedOptions(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  }

  const generateSeals = useCallback(async (currentAnswers: Record<string, string | string[]>, replace = true) => {
    const profile = buildProfile(currentAnswers);
    setPhase('generating');
    setError('');
    try {
      const res = await fetch('/api/generate-seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      if (replace) {
        setSeals(data.seals);
        setChosen(null);
      } else {
        setSeals(prev => [...prev, ...data.seals]);
      }
      setParamsChanged(false);
      setPhase('results');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setPhase('results');
    }
  }, []);

  async function handleNext() {
    if (!question) return;
    const value = question.type === 'multiselect' ? selectedOptions
                : question.type === 'select'      ? selectedOptions[0] ?? ''
                : currentText;

    const updated = { ...answers, [question.id]: value };
    setAnswers(updated);
    setCurrentText('');
    setSelectedOptions([]);

    if (isLastStep) {
      setQuickShape(updated.shape as string || 'Circle');
      setQuickStyle(updated.style as string || 'Modern (clean, geometric)');
      setQuickColor(updated.inkColor as string || 'Black (#000000)');
      await generateSeals(updated, true);
    } else {
      setStep(s => s + 1);
    }
  }

  async function handleRefine() {
    const updated = { ...answers, shape: quickShape, style: quickStyle, inkColor: quickColor };
    setAnswers(updated);
    setSeals([]);
    await generateSeals(updated, true);
  }

  async function handleMoreSeals() {
    if (seals.length >= 25) return;
    const current = { ...answers, shape: quickShape, style: quickStyle, inkColor: quickColor };
    const profile = buildProfile(current);
    setError('');
    try {
      const res = await fetch('/api/generate-seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Generation failed');
      setSeals(prev => [...prev, ...data.seals]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    }
  }

  async function handleConfirm() {
    if (chosen === null) return;
    setSaving(true);
    setError('');
    try {
      const profile = buildProfile({ ...answers, shape: quickShape, style: quickStyle, inkColor: quickColor });
      const res = await fetch('/api/save-selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            origin: profile.roots.origin,
            occupation: profile.roots.historicOccupation,
            values: profile.values,
            shape: profile.visual.shape,
            style: profile.visual.style,
            inkColor: profile.visual.inkColor,
          },
          sealSvg: seals[chosen],
          sealIndex: chosen,
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
    setPhase('questionnaire'); setSeals([]); setChosen(null); setNotes('');
    setError(''); setSavedId(''); setParamsChanged(false);
  }

  // ── Generating ──────────────────────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <main style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', color: C.text }}>
        <h1 style={{ fontSize: 34, fontWeight: 300, letterSpacing: '0.45em', margin: 0 }}>SYGNEO</h1>
        <div style={{ width: 40, height: 1, background: C.gold, margin: '12px auto 32px' }} />
        <p style={{ fontSize: 12, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Crafting your heritage mark...
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
            Our team will review your selection and reach out to discuss the next steps in crafting your heritage seal.
          </p>
          {chosen !== null && (
            <div style={{ width: 160, height: 160, margin: '0 auto 40px', border: `1px solid ${C.border}`, padding: 16, background: C.surface }}
              dangerouslySetInnerHTML={{ __html: seals[chosen] }} />
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
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: '0.45em', margin: 0 }}>SYGNEO</h1>
            <div style={{ width: 40, height: 1, background: C.gold, margin: '8px auto 6px' }} />
            <p style={{ fontSize: 10, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Choose your heritage mark
            </p>
          </div>

          {/* Quick-change panel */}
          <div style={{ border: `1px solid ${C.border}`, background: C.surface, padding: '20px 24px', marginBottom: 28 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase', margin: '0 0 16px', fontFamily: 'Helvetica, Arial, sans-serif' }}>Refine Parameters</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>

              {/* Shape */}
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'Helvetica, Arial, sans-serif' }}>Shape</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {SHAPES.map(s => (
                    <button key={s} onClick={() => { setQuickShape(s); setParamsChanged(true); }}
                      style={{ padding: '7px 14px', border: `1px solid ${quickShape === s ? C.gold : C.border}`, background: quickShape === s ? 'rgba(139,115,85,0.08)' : 'transparent', color: quickShape === s ? C.text : C.sub, fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                      {s === 'Circle' ? '○' : s === 'Square' ? '□' : '△'} {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'Helvetica, Arial, sans-serif' }}>Style</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STYLES.map(s => {
                    const label = s.split(' ')[0];
                    return (
                      <button key={s} onClick={() => { setQuickStyle(s); setParamsChanged(true); }}
                        style={{ padding: '7px 14px', border: `1px solid ${quickStyle === s ? C.gold : C.border}`, background: quickStyle === s ? 'rgba(139,115,85,0.08)' : 'transparent', color: quickStyle === s ? C.text : C.sub, fontSize: 12, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'Helvetica, Arial, sans-serif' }}>Ink Color</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => (
                    <button key={c.value} onClick={() => { setQuickColor(c.value); setParamsChanged(true); }}
                      title={c.label}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c.hex, border: `2px solid ${quickColor === c.value ? C.gold : 'transparent'}`, cursor: 'pointer', outline: quickColor === c.value ? `1px solid ${C.gold}` : 'none', outlineOffset: 2 }} />
                  ))}
                </div>
              </div>

            </div>

            {/* Regenerate button */}
            {paramsChanged && (
              <button onClick={handleRefine}
                style={{ marginTop: 16, padding: '10px 28px', border: 'none', background: C.gold, color: '#fff', fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                ↻ Generate New Marks
              </button>
            )}
          </div>

          {error && <p style={{ color: '#A0522D', fontSize: 13, marginBottom: 16 }}>{error}</p>}

          {/* Seal grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 32 }}>
            {seals.map((svg, idx) => {
              const isSelected = chosen === idx;
              return (
                <button key={idx} onClick={() => setChosen(isSelected ? null : idx)}
                  style={{ border: `2px solid ${isSelected ? C.gold : C.border}`, background: isSelected ? 'rgba(139,115,85,0.06)' : C.surface, padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transition: 'all 0.2s' }}>
                  <div style={{ width: 130, height: 130 }} dangerouslySetInnerHTML={{ __html: svg }} />
                  <span style={{ fontSize: 10, letterSpacing: '0.2em', color: isSelected ? C.gold : C.muted, textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                    {isSelected ? '✓ Selected' : `No. ${idx + 1}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Notes + Confirm */}
          {chosen !== null && (
            <div style={{ border: `1px solid ${C.border}`, background: C.surface, padding: '24px', marginBottom: 24 }}>
              <p style={{ fontSize: 10, letterSpacing: '0.25em', color: C.muted, textTransform: 'uppercase', margin: '0 0 12px', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                Notes for the designer (optional)
              </p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. I'd prefer the inner element slightly larger, or shift the motif upward..."
                rows={3}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 14, padding: '0 0 12px', outline: 'none', fontFamily: 'Georgia, serif', resize: 'none', boxSizing: 'border-box' }} />
              <button onClick={handleConfirm} disabled={saving}
                style={{ marginTop: 20, padding: '14px 36px', border: 'none', background: saving ? C.muted : C.gold, color: '#fff', fontSize: 12, letterSpacing: '0.28em', textTransform: 'uppercase', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500 }}>
                {saving ? 'Saving...' : 'Confirm & Lock Selection'}
              </button>
            </div>
          )}

          {/* Bottom actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {seals.length < 25 && (
              <button onClick={handleMoreSeals}
                style={{ padding: '12px 24px', border: `1px solid ${C.border}`, background: 'transparent', color: C.sub, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                Show 5 More ({seals.length}/25)
              </button>
            )}
            <button onClick={handleReset}
              style={{ padding: '12px 24px', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Start Over
            </button>
          </div>
          <p style={{ marginTop: 16, fontSize: 11, color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>
            {seals.length < 25 ? `${25 - seals.length} more options available` : 'Maximum 25 options reached'}
          </p>
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
          {PROFILER_QUESTIONS.map((_, i) => (
            <div key={i} style={{ height: 1, flex: 1, background: i <= step ? C.gold : C.border, transition: 'background 0.4s' }} />
          ))}
        </div>

        <p style={{ fontSize: 10, letterSpacing: '0.3em', color: C.muted, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Helvetica, Arial, sans-serif' }}>
          Step {step + 1} of {PROFILER_QUESTIONS.length}
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

        {(question?.type === 'select' || question?.type === 'multiselect') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {question.options?.map(opt => {
              const active = selectedOptions.includes(opt);
              return (
                <button key={opt} onClick={() => toggleOption(opt)}
                  style={{ textAlign: 'left', padding: '14px 20px', border: `1px solid ${active ? C.borderAct : C.border}`, background: active ? 'rgba(139,115,85,0.06)' : C.surface, color: active ? C.text : C.sub, fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia, serif', transition: 'all 0.2s' }}>
                  {opt}
                </button>
              );
            })}
            {question.type === 'multiselect' && (
              <p style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>Select 2–3 values</p>
            )}
          </div>
        )}

        {error && <p style={{ color: '#A0522D', fontSize: 13, marginTop: 16 }}>{error}</p>}

        {step > 0 && (
          <button onClick={() => { setStep(s => s - 1); setCurrentText(''); setSelectedOptions([]); }}
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
