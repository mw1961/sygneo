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
  type: 'text' | 'select' | 'multiselect' | 'dropdown' | 'alphabet';
  options?: string[];
  min?: number;
  max?: number;
}

export type AlphabetKey = 'Latin' | 'Hebrew' | 'Arabic' | 'Cyrillic' | 'Greek' | 'Armenian' | 'Japanese' | 'Chinese' | 'Korean' | 'Georgian';

export const ALPHABETS: Record<AlphabetKey, string[]> = {
  Latin:    'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'.split(' '),
  Hebrew:   'א ב ג ד ה ו ז ח ט י כ ל מ נ ס ע פ צ ק ר ש ת'.split(' '),
  Arabic:   ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'],
  Cyrillic: 'А Б В Г Д Е Ж З И К Л М Н О П Р С Т У Ф Х Ц Ч Ш Э Ю Я'.split(' '),
  Greek:    'Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω'.split(' '),
  Armenian: 'Ա Բ Գ Դ Ե Զ Է Ը Թ Ժ Ի Լ Խ Ծ Կ Հ Ձ Ղ Ճ Մ Յ Ն Շ Ո Չ Պ Ջ Ռ Ս Վ Տ Ր Ց Փ Ք'.split(' '),
  Japanese: 'あ い う え お か き く け こ さ し す せ そ た ち つ て と な に ぬ ね の は ひ ふ へ ほ ま み む め も や ゆ よ ら り る れ ろ わ を ん'.split(' '),
  Chinese:  ['王','李','张','陈','刘','杨','黄','赵','吴','周','徐','孙','马','朱','胡','郭','何','高','林','郑','谢','韩','唐','冯','于','曹','程','袁','邓','许','傅','沈','曾','彭','吕','苏','卢','蒋','蔡','魏','丁'],
  Korean:   ['김','이','박','최','정','강','조','윤','장','임','오','한','신','서','권','황','안','송','홍','전','류','고','문','양','손','배','백','허','유','남'],
  Georgian: 'ა ბ გ დ ე ვ ზ თ ი კ ლ მ ნ ო პ ჟ რ ს ტ უ ფ ქ ღ ყ შ ჩ ც ძ წ ჭ ხ ჯ ჰ'.split(' '),
};

export function getAlphabetKey(language: string): AlphabetKey {
  if (language.includes('Hebrew'))   return 'Hebrew';
  if (language.includes('Arabic'))   return 'Arabic';
  if (language.includes('Cyrillic')) return 'Cyrillic';
  if (language.includes('Greek'))    return 'Greek';
  if (language.includes('Armenian')) return 'Armenian';
  if (language.includes('Japanese')) return 'Japanese';
  if (language.includes('Chinese'))  return 'Chinese';
  if (language.includes('Korean'))   return 'Korean';
  if (language.includes('Georgian')) return 'Georgian';
  return 'Latin';
}

export const PROFILER_QUESTIONS: ProfilerQuestion[] = [
  {
    id: 'lineageStart',
    step: 1,
    question: 'Your family story deserves a tangible symbol.',
    hint: 'Behind every family name lie generations of values, moments, and identity. This is your moment to transform your heritage into something physical and timeless — a centerpiece of pride to be passed down through generations. Create a lasting mark that bridges your roots with the future of your children, representing who you are, today and forever.',
    type: 'select',
    options: [
      'Honor the Past — Giving tangible form to our family\'s deep roots and traditions.',
      'Forge the Future — Starting a new lineage of pride and laying the foundation today.',
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
      'Citizen of the World',
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
      'Free Spirit / No defined profession',
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
      'Open — let the design speak freely',
    ],
  },
  {
    id: 'language',
    step: 5,
    question: 'In which script should your family initial appear?',
    hint: 'Choose the writing system. This letter will become part of your heritage mark.',
    type: 'select',
    options: [
      'Latin (English, French, Spanish, Italian, German, Portuguese...)',
      'Hebrew — עברית',
      'Arabic — العربية',
      'Cyrillic (Russian, Ukrainian, Serbian, Bulgarian...)',
      'Greek — Ελληνικά',
      'Armenian — Հայերեն',
      'Japanese — 日本語',
      'Chinese — 中文',
      'Korean — 한국어',
      'Georgian — ქართული',
    ],
  },
  {
    id: 'initial',
    step: 6,
    question: 'Choose the letter that will represent your family.',
    hint: 'This initial becomes the heart of your heritage seal.',
    type: 'alphabet',
  },
  {
    id: 'shape',
    step: 7,
    question: 'Choose the geometric form of your seal.',
    hint: 'Circle = continuity & unity · Square = stability & order · Triangle = strength & direction',
    type: 'select',
    options: ['Circle', 'Square', 'Triangle'],
  },
  {
    id: 'style',
    step: 8,
    question: 'Choose a visual style.',
    hint: 'This sets the overall aesthetic language.',
    type: 'select',
    options: ['Japanese (minimal, precise)', 'Modern (clean, geometric)', 'Ancient (classical, ornate)', 'Abstract (symbolic, open)'],
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
