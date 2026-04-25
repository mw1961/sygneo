'use client';

import { useState } from 'react';
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

type Phase = 'questionnaire' | 'generating' | 'results';

export default function HomePage() {
  const [step, setStep]                     = useState(0);
  const [answers, setAnswers]               = useState<Record<string, string | string[]>>({});
  const [currentText, setCurrentText]       = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [phase, setPhase]                   = useState<Phase>('questionnaire');
  const [seals, setSeals]                   = useState<string[]>([]);
  const [chosen, setChosen]                 = useState<number | null>(null);
  const [notes, setNotes]                   = useState('');
  const [error, setError]                   = useState('');
  const [batchStart, setBatchStart]         = useState(0);

  const question: ProfilerQuestion | undefined = PROFILER_QUESTIONS[step];
  const isLastStep = step === PROFILER_QUESTIONS.length - 1;

  const canProceed = question?.type === 'text'
    ? currentText.trim().length > 0
    : selectedOptions.length > 0 && (question?.type !== 'multiselect' || selectedOptions.length >= 2);

  function toggleOption(opt: string) {
    if (question?.type === 'select') {
      setSelectedOptions([opt]);
    } else {
      setSelectedOptions(prev =>
        prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
      );
    }
  }

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
      const profile = buildProfile(updated);
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
        setSeals(data.seals);
        setBatchStart(0);
        setChosen(null);
        setPhase('results');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Generation failed');
        setPhase('questionnaire');
        setStep(PROFILER_QUESTIONS.length - 1);
        setAnswers(updated);
      }
    } else {
      setStep(s => s + 1);
    }
  }

  async function handleMoreSeals() {
    if (seals.length >= 25) return;
    const profile = buildProfile(answers);
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
      setBatchStart(seals.length);
      setSeals(prev => [...prev, ...data.seals]);
      setPhase('results');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setPhase('results');
    }
  }

  function handleReset() {
    setStep(0); setAnswers({}); setCurrentText(''); setSelectedOptions([]);
    setPhase('questionnaire'); setSeals([]); setChosen(null); setNotes(''); setError(''); setBatchStart(0);
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
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, opacity: 0.4, animation: `pulse 1.2s ease-in-out ${i * 0.4}s infinite` }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.2} 50%{opacity:1} }`}</style>
      </main>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────────
  if (phase === 'results') {
    const currentBatch = seals.slice(batchStart);
    const allSeals = seals;

    return (
      <main style={{ minHeight: '100vh', background: C.bg, padding: '48px 24px', fontFamily: 'Georgia, serif', color: C.text }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{ fontSize: 30, fontWeight: 300, letterSpacing: '0.45em', margin: 0 }}>SYGNEO</h1>
            <div style={{ width: 40, height: 1, background: C.gold, margin: '10px auto 8px' }} />
            <p style={{ fontSize: 10, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>
              Choose your heritage mark
            </p>
          </div>

          {error && (
            <p style={{ color: '#A0522D', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>{error}</p>
          )}

          {/* Seal grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 40 }}>
            {allSeals.map((svg, idx) => {
              const isSelected = chosen === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setChosen(isSelected ? null : idx)}
                  style={{
                    border: `2px solid ${isSelected ? C.gold : C.border}`,
                    background: isSelected ? 'rgba(139,115,85,0.06)' : C.surface,
                    padding: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    style={{ width: 140, height: 140 }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  <span style={{ fontSize: 10, letterSpacing: '0.2em', color: isSelected ? C.gold : C.muted, textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif' }}>
                    {isSelected ? 'Selected' : `No. ${idx + 1}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Notes */}
          {chosen !== null && (
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.3em', color: C.muted, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'Helvetica, Arial, sans-serif' }}>
                Notes for the designer (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. I prefer the upper element more elongated, or shift motif to the right..."
                rows={3}
                style={{ width: '100%', background: 'transparent', border: `1px solid ${C.border}`, color: C.text, fontSize: 14, padding: '12px 14px', outline: 'none', fontFamily: 'Georgia, serif', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>

            {chosen !== null && (
              <button
                style={{ padding: '14px 32px', border: 'none', background: C.gold, color: '#fff', fontSize: 12, letterSpacing: '0.25em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500 }}
                onClick={() => alert(`Selection saved: Seal #${chosen + 1}${notes ? `\nNotes: ${notes}` : ''}`)}
              >
                Confirm Selection
              </button>
            )}

            {seals.length < 25 && (
              <button
                onClick={handleMoreSeals}
                style={{ padding: '14px 28px', border: `1px solid ${C.border}`, background: 'transparent', color: C.sub, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}
              >
                Show 5 More ({seals.length}/25)
              </button>
            )}

            <button
              onClick={handleReset}
              style={{ padding: '14px 28px', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}
            >
              Start Over
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 11, color: C.muted, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>
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

        <h2 style={{ fontSize: 26, fontWeight: 300, marginBottom: 8, lineHeight: 1.4, color: C.text }}>{question?.question}</h2>
        <p style={{ fontSize: 14, color: C.sub, marginBottom: 36, lineHeight: 1.6 }}>{question?.hint}</p>

        {question?.type === 'text' && (
          <input
            type="text"
            value={currentText}
            onChange={e => setCurrentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
            placeholder="Your answer..."
            autoFocus
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 18, paddingBottom: 12, outline: 'none', fontFamily: 'Georgia, serif', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderBottomColor = C.gold}
            onBlur={e => e.target.style.borderBottomColor = C.border}
          />
        )}

        {(question?.type === 'select' || question?.type === 'multiselect') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {question.options?.map(opt => {
              const active = selectedOptions.includes(opt);
              return (
                <button key={opt} onClick={() => toggleOption(opt)}
                  style={{ textAlign: 'left', padding: '14px 20px', border: `1px solid ${active ? C.borderAct : C.border}`, background: active ? 'rgba(139,115,85,0.06)' : C.surface, color: active ? C.text : C.sub, fontSize: 14, cursor: 'pointer', fontFamily: 'Georgia, serif', transition: 'all 0.2s', letterSpacing: '0.02em' }}>
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

        <button
          onClick={handleNext}
          disabled={!canProceed}
          style={{ marginTop: 40, padding: '13px 36px', border: `1px solid ${canProceed ? C.gold : C.border}`, background: 'transparent', color: canProceed ? C.gold : C.muted, fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: canProceed ? 'pointer' : 'not-allowed', fontFamily: 'Helvetica, Arial, sans-serif', transition: 'all 0.2s' }}
          onMouseEnter={e => { if (canProceed) { (e.target as HTMLButtonElement).style.background = C.gold; (e.target as HTMLButtonElement).style.color = C.bg; } }}
          onMouseLeave={e => { if (canProceed) { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = C.gold; } }}
        >
          {isLastStep ? 'Generate My Seal →' : 'Continue →'}
        </button>
      </div>
    </main>
  );
}
