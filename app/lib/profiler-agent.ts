/**
 * SEAL Profiler Agent
 * Extracts visual DNA from client responses to build a SealProfile.
 */

import type { SealProfile, SealShape, SealStyle } from './root-library';

export interface ProfilerQuestion {
  id: string;
  step: number;
  question: string;
  hint: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
}

export const PROFILER_QUESTIONS: ProfilerQuestion[] = [
  {
    id: 'lineageStart',
    step: 1,
    question: 'Where does your lineage begin?',
    hint: 'Choose how you want to root your seal — in history, or from this moment forward.',
    type: 'select',
    options: [
      'From the past — my family has roots I want to honour',
      'From now — I am starting a new lineage today',
    ],
  },
  {
    id: 'origin',
    step: 2,
    question: 'Where does your family come from?',
    hint: 'If rooting in history: name a country, region, or era (e.g. "Eastern Europe, 400 years ago"). If starting fresh: describe where you are now — a city, a country, a place that matters.',
    type: 'text',
  },
  {
    id: 'occupation',
    step: 3,
    question: 'What defines this lineage\'s work or purpose?',
    hint: 'Historic roots: an ancestral craft or trade (farmer, merchant, craftsman). New lineage: the pursuit or profession you want this seal to represent.',
    type: 'text',
  },
  {
    id: 'values',
    step: 4,
    question: 'Choose 2–3 values that define your family.',
    hint: 'These become the soul of the seal.',
    type: 'multiselect',
    options: [
      'Resilience', 'Freedom', 'Harmony', 'Loyalty',
      'Wisdom', 'Courage', 'Creativity', 'Justice',
      'Prosperity', 'Community', 'Honor', 'Truth',
    ],
  },
  {
    id: 'shape',
    step: 5,
    question: 'Choose the geometric form of your seal.',
    hint: 'Circle = continuity & unity · Square = stability & order · Triangle = strength & direction',
    type: 'select',
    options: ['Circle', 'Square', 'Triangle'],
  },
  {
    id: 'style',
    step: 6,
    question: 'Choose a visual style.',
    hint: 'This sets the overall aesthetic language.',
    type: 'select',
    options: ['Japanese (minimal, precise)', 'Modern (clean, geometric)', 'Ancient (classical, ornate)', 'Abstract (symbolic, open)'],
  },
  {
    id: 'inkColor',
    step: 7,
    question: 'Choose your ink color.',
    hint: 'The seal will be produced in a single solid color.',
    type: 'select',
    options: ['Black (#000000)', 'Deep Navy (#191970)', 'Crimson (#8B0000)', 'Forest Green (#1B4332)', 'Custom'],
  },
];

export function buildProfile(answers: Record<string, string | string[]>): Omit<SealProfile, 'id' | 'createdAt'> {
  const styleMap: Record<string, SealStyle> = {
    'Japanese (minimal, precise)': 'japanese',
    'Modern (clean, geometric)': 'modern',
    'Ancient (classical, ornate)': 'ancient',
    'Abstract (symbolic, open)': 'abstract',
  };
  const shapeMap: Record<string, SealShape> = {
    'Circle': 'circle',
    'Square': 'square',
    'Triangle': 'triangle',
  };
  const colorMap: Record<string, string> = {
    'Black (#000000)': '#000000',
    'Deep Navy (#191970)': '#191970',
    'Crimson (#8B0000)': '#8B0000',
    'Forest Green (#1B4332)': '#1B4332',
  };

  return {
    roots: {
      origin: answers.origin as string ?? '',
      historicOccupation: answers.occupation as string ?? '',
    },
    values: (answers.values as string[]) ?? [],
    visual: {
      shape: shapeMap[answers.shape as string] ?? 'circle',
      style: styleMap[answers.style as string] ?? 'modern',
      inkColor: colorMap[answers.inkColor as string] ?? (answers.inkColor as string) ?? '#000000',
    },
  };
}
