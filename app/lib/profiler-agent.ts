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
  type: 'text' | 'select' | 'multiselect' | 'dropdown';
  options?: string[];
  min?: number;
  max?: number;
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
    hint: 'Choose up to 3 countries — your lineage may span multiple lands across generations.',
    type: 'dropdown',
    min: 1,
    max: 3,
    options: [
      'Afghanistan','Algeria','Angola','Argentina','Armenia','Australia','Austria',
      'Azerbaijan','Belarus','Belgium','Bolivia','Bosnia','Brazil','Bulgaria',
      'Cambodia','Canada','Chile','China','Colombia','Croatia','Cuba',
      'Czech Republic','Denmark','Ecuador','Egypt','Ethiopia','Finland','France',
      'Georgia','Germany','Ghana','Greece','Guatemala','Hungary',
      'India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
      'Japan','Jordan','Kazakhstan','Kenya','Kuwait','Latvia','Lebanon',
      'Libya','Lithuania','Malaysia','Mexico','Moldova','Morocco',
      'Netherlands','New Zealand','Nigeria','Norway',
      'Pakistan','Peru','Philippines','Poland','Portugal',
      'Romania','Russia','Saudi Arabia','Serbia','Slovakia',
      'South Africa','South Korea','Spain','Sweden','Switzerland',
      'Syria','Thailand','Tunisia','Turkey','Uganda',
      'Ukraine','United Kingdom','United States','Uruguay',
      'Uzbekistan','Venezuela','Vietnam','Yemen',
    ],
  },
  {
    id: 'occupation',
    step: 3,
    question: 'What work defined your family across generations?',
    hint: 'Select up to 3 crafts, trades or professions that best represent your lineage.',
    type: 'multiselect',
    min: 1,
    max: 3,
    options: [
      'Farmer / Agriculture',
      'Shepherd / Herder',
      'Fisherman / Sailor',
      'Merchant / Trader',
      'Banker / Financier',
      'Craftsman / Artisan',
      'Blacksmith / Metalworker',
      'Carpenter / Builder',
      'Weaver / Tailor',
      'Potter / Ceramicist',
      'Jeweler / Goldsmith',
      'Baker / Miller',
      'Miner',
      'Physician / Healer',
      'Scholar / Teacher',
      'Priest / Religious Leader',
      'Soldier / Warrior',
      'Judge / Lawyer',
      'Artist / Painter',
      'Musician',
      'Architect',
      'Engineer',
      'Writer / Scribe',
      'Diplomat / Statesman',
      'Hunter / Tracker',
      'Gardener / Botanist',
      'Inventor / Scientist',
    ],
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

  const origin = Array.isArray(answers.origin)
    ? (answers.origin as string[]).join(', ')
    : (answers.origin as string) ?? '';

  const occupation = Array.isArray(answers.occupation)
    ? (answers.occupation as string[]).join(', ')
    : (answers.occupation as string) ?? '';

  return {
    roots: {
      origin,
      historicOccupation: occupation,
    },
    values: (answers.values as string[]) ?? [],
    visual: {
      shape: shapeMap[answers.shape as string] ?? 'circle',
      style: styleMap[answers.style as string] ?? 'modern',
      inkColor: colorMap[answers.inkColor as string] ?? (answers.inkColor as string) ?? '#000000',
    },
  };
}
