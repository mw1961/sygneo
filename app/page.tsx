'use client';

import { useState } from 'react';
import { PROFILER_QUESTIONS, buildProfile } from './lib/profiler-agent';
import type { ProfilerQuestion } from './lib/profiler-agent';

// Palette: ivory background, deep charcoal text, warm gold accent
const C = {
  bg:       '#F8F5F0',   // warm ivory
  surface:  '#FFFFFF',
  border:   '#DDD8D0',
  borderAct:'#8B7355',   // warm gold-brown (active)
  text:     '#1C1A17',   // near-black charcoal
  sub:      '#7A7060',   // warm grey
  muted:    '#B0A898',
  gold:     '#8B7355',   // accent gold
  goldHov:  '#6B5535',
};

export default function HomePage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentText, setCurrentText] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [profile, setProfile] = useState<ReturnType<typeof buildProfile> | null>(null);

  const question: ProfilerQuestion | undefined = PROFILER_QUESTIONS[step];
  const isComplete = step >= PROFILER_QUESTIONS.length;

  function handleNext() {
    if (!question) return;
    const value = question.type === 'multiselect' ? selectedOptions
                : question.type === 'select'      ? selectedOptions[0] ?? ''
                : currentText;

    const updated = { ...answers, [question.id]: value };
    setAnswers(updated);
    setCurrentText('');
    setSelectedOptions([]);

    if (step + 1 >= PROFILER_QUESTIONS.length) {
      setProfile(buildProfile(updated));
    }
    setStep(s => s + 1);
  }

  function toggleOption(opt: string) {
    if (question?.type === 'select') {
      setSelectedOptions([opt]);
    } else {
      setSelectedOptions(prev =>
        prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
      );
    }
  }

  const canProceed = question?.type === 'text'
    ? currentText.trim().length > 0
    : selectedOptions.length > 0 && (question?.type !== 'multiselect' || selectedOptions.length >= 2);

  return (
    <main style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', position: 'relative', fontFamily: 'Georgia, serif' }}>

      {/* Admin link */}
      <a href="/admin/login" style={{ position: 'absolute', top: 24, right: 32, fontSize: 11, letterSpacing: '0.25em', color: C.gold, textDecoration: 'none', textTransform: 'uppercase', fontFamily: 'Helvetica, Arial, sans-serif', border: `1px solid ${C.border}`, padding: '8px 18px' }}>Admin</a>

      {/* Logo */}
      <div style={{ marginBottom: 52, textAlign: 'center' }}>
        <h1 style={{ fontSize: 38, fontWeight: 300, letterSpacing: '0.45em', color: C.text, margin: 0 }}>SEAL</h1>
        <div style={{ width: 40, height: 1, background: C.gold, margin: '10px auto 8px' }} />
        <p style={{ fontSize: 10, letterSpacing: '0.32em', color: C.gold, textTransform: 'uppercase', margin: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>Heritage Seal System</p>
      </div>

      {!isComplete ? (
        <div style={{ width: '100%', maxWidth: 520 }}>

          {/* Progress */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
            {PROFILER_QUESTIONS.map((_, i) => (
              <div key={i} style={{ height: 1, flex: 1, background: i <= step ? C.gold : C.border, transition: 'background 0.4s' }} />
            ))}
          </div>

          {/* Step label */}
          <p style={{ fontSize: 10, letterSpacing: '0.3em', color: C.muted, textTransform: 'uppercase', marginBottom: 12, fontFamily: 'Helvetica, Arial, sans-serif' }}>
            Step {step + 1} of {PROFILER_QUESTIONS.length}
          </p>

          {/* Question */}
          <h2 style={{ fontSize: 26, fontWeight: 300, marginBottom: 8, lineHeight: 1.4, color: C.text }}>{question?.question}</h2>
          <p style={{ fontSize: 14, color: C.sub, marginBottom: 36, lineHeight: 1.6 }}>{question?.hint}</p>

          {/* Text input */}
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

          {/* Select / Multiselect */}
          {(question?.type === 'select' || question?.type === 'multiselect') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {question.options?.map(opt => {
                const active = selectedOptions.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    style={{
                      textAlign: 'left',
                      padding: '14px 20px',
                      border: `1px solid ${active ? C.borderAct : C.border}`,
                      background: active ? 'rgba(139,115,85,0.06)' : C.surface,
                      color: active ? C.text : C.sub,
                      fontSize: 14,
                      cursor: 'pointer',
                      fontFamily: 'Georgia, serif',
                      transition: 'all 0.2s',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
              {question.type === 'multiselect' && (
                <p style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: 'Helvetica, Arial, sans-serif', letterSpacing: '0.1em' }}>Select 2–3 values</p>
              )}
            </div>
          )}

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={!canProceed}
            style={{
              marginTop: 40,
              padding: '13px 36px',
              border: `1px solid ${canProceed ? C.gold : C.border}`,
              background: 'transparent',
              color: canProceed ? C.gold : C.muted,
              fontSize: 12,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              fontFamily: 'Helvetica, Arial, sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (canProceed) { (e.target as HTMLButtonElement).style.background = C.gold; (e.target as HTMLButtonElement).style.color = C.bg; } }}
            onMouseLeave={e => { if (canProceed) { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = C.gold; } }}
          >
            {step + 1 === PROFILER_QUESTIONS.length ? 'Generate Profile' : 'Continue →'}
          </button>
        </div>

      ) : (
        /* Profile Summary */
        <div style={{ width: '100%', maxWidth: 520 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.3em', color: C.gold, textTransform: 'uppercase', marginBottom: 20, fontFamily: 'Helvetica, Arial, sans-serif' }}>Seal Profile Complete</p>
          <h2 style={{ fontSize: 26, fontWeight: 300, marginBottom: 32, color: C.text }}>Your Visual DNA</h2>

          {profile && (
            <div style={{ border: `1px solid ${C.border}`, padding: 36, display: 'flex', flexDirection: 'column', gap: 20, background: C.surface }}>
              <Row label="Origin" value={profile.roots.origin} />
              <Row label="Historic Occupation" value={profile.roots.historicOccupation} />
              <Row label="Core Values" value={profile.values.join(' · ')} />
              <Row label="Shape" value={profile.visual.shape} />
              <Row label="Style" value={profile.visual.style} />
              <Row label="Ink Color" value={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: profile.visual.inkColor, border: `1px solid ${C.border}`, display: 'inline-block' }} />
                  {profile.visual.inkColor}
                </span>
              } />
            </div>
          )}

          <button
            onClick={() => { setStep(0); setAnswers({}); setProfile(null); }}
            style={{ marginTop: 28, padding: '12px 32px', border: `1px solid ${C.border}`, background: 'transparent', color: C.sub, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'Helvetica, Arial, sans-serif' }}
          >
            Start Over
          </button>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 14 }}>
      <span style={{ color: '#B0A898', textTransform: 'uppercase', letterSpacing: '0.15em', fontSize: 10, marginTop: 2, flexShrink: 0, fontFamily: 'Helvetica, Arial, sans-serif' }}>{label}</span>
      <span style={{ color: '#1C1A17', textAlign: 'right', textTransform: 'capitalize', fontFamily: 'Georgia, serif' }}>{value}</span>
    </div>
  );
}
