'use client';

import { useState } from 'react';
import { PROFILER_QUESTIONS, buildProfile } from './lib/profiler-agent';
import type { ProfilerQuestion } from './lib/profiler-agent';

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
    <main className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center px-6 py-16 relative">
      <a href="/admin/login" className="absolute bottom-5 right-6 text-[10px] tracking-[0.2em] text-[#2a2a2a] hover:text-[#555] transition-colors uppercase">Admin</a>

      {/* Logo */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-thin tracking-[0.4em] text-white">SEAL</h1>
        <p className="mt-2 text-xs tracking-[0.3em] text-[#888] uppercase">Heritage Seal System</p>
      </div>

      {!isComplete ? (
        <div className="w-full max-w-lg">

          {/* Progress */}
          <div className="flex gap-1.5 mb-10">
            {PROFILER_QUESTIONS.map((_, i) => (
              <div key={i} className={`h-0.5 flex-1 transition-all duration-500 ${i <= step ? 'bg-white' : 'bg-[#333]'}`} />
            ))}
          </div>

          {/* Step label */}
          <p className="text-[10px] tracking-[0.3em] text-[#555] uppercase mb-3">
            Step {step + 1} of {PROFILER_QUESTIONS.length}
          </p>

          {/* Question */}
          <h2 className="text-2xl font-light mb-2 leading-snug">{question?.question}</h2>
          <p className="text-sm text-[#666] mb-8">{question?.hint}</p>

          {/* Text input */}
          {question?.type === 'text' && (
            <input
              type="text"
              value={currentText}
              onChange={e => setCurrentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canProceed && handleNext()}
              placeholder="Your answer..."
              className="w-full bg-transparent border-b border-[#333] text-white text-lg pb-3 outline-none placeholder:text-[#444] focus:border-white transition-colors"
              autoFocus
            />
          )}

          {/* Select / Multiselect */}
          {(question?.type === 'select' || question?.type === 'multiselect') && (
            <div className="flex flex-col gap-3">
              {question.options?.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className={`text-left px-5 py-3.5 border text-sm transition-all ${
                    selectedOptions.includes(opt)
                      ? 'border-white text-white bg-white/5'
                      : 'border-[#333] text-[#888] hover:border-[#666]'
                  }`}
                >
                  {opt}
                </button>
              ))}
              {question.type === 'multiselect' && (
                <p className="text-[11px] text-[#555] mt-1">Select 2–3 values</p>
              )}
            </div>
          )}

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="mt-10 px-8 py-3 border border-white text-sm tracking-[0.2em] uppercase disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white hover:text-black transition-all"
          >
            {step + 1 === PROFILER_QUESTIONS.length ? 'Generate Profile' : 'Next →'}
          </button>
        </div>

      ) : (
        /* Profile Summary */
        <div className="w-full max-w-lg">
          <p className="text-[10px] tracking-[0.3em] text-[#555] uppercase mb-6">Seal Profile Complete</p>
          <h2 className="text-2xl font-light mb-8">Your Visual DNA</h2>

          {profile && (
            <div className="space-y-6 border border-[#222] p-8">
              <Row label="Origin" value={profile.roots.origin} />
              <Row label="Historic Occupation" value={profile.roots.historicOccupation} />
              <Row label="Core Values" value={profile.values.join(' · ')} />
              <Row label="Shape" value={profile.visual.shape} />
              <Row label="Style" value={profile.visual.style} />
              <Row label="Ink Color" value={
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full border border-[#444]" style={{ background: profile.visual.inkColor }} />
                  {profile.visual.inkColor}
                </span>
              } />
            </div>
          )}

          <button
            onClick={() => { setStep(0); setAnswers({}); setProfile(null); }}
            className="mt-8 px-8 py-3 border border-[#444] text-sm tracking-[0.2em] uppercase text-[#888] hover:border-white hover:text-white transition-all"
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
    <div className="flex justify-between text-sm gap-4">
      <span className="text-[#555] uppercase tracking-[0.15em] text-[10px] mt-0.5 shrink-0">{label}</span>
      <span className="text-white text-right capitalize">{value}</span>
    </div>
  );
}
