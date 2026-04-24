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
    id: 'origin',
    step: 1,
    question: 'Where does your family come from?',
    hint: 'Country, region, or city — as specific as you like.',
    type: 'text',
  },
  {
    id: 'occupation',
    step: 2,
    question: 'What did your ancestors do?',
    hint: 'Farmer, merchant, craftsman, sailor, scholar — any historical occupation.',
    type: 'text',
  },
  {
    id: 'values',
    step: 3,
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
    step: 4,
    question: 'Choose the geometric form of your seal.',
    hint: 'Circle = continuity & unity · Square = stability & order · Triangle = strength & direction',
    type: 'select',
    options: ['Circle', 'Square', 'Triangle'],
  },
  {
    id: 'style',
    step: 5,
    question: 'Choose a visual style.',
    hint: 'This sets the overall aesthetic language.',
    type: 'select',
    options: ['Japanese (minimal, precise)', 'Modern (clean, geometric)', 'Ancient (classical, ornate)', 'Abstract (symbolic, open)'],
  },
  {
    id: 'inkColor',
    step: 6,
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
