/**
 * SYGNEO — Legacy Stamp Design Architect
 * Claude generates 12 circle OR 12 square SVGs per call.
 * Two parallel calls per generation = 24 total designs.
 */

function fontSpec(language: string): string {
  if (language.includes('Hebrew'))   return "'Frank Ruhl Libre', 'David', serif";
  if (language.includes('Arabic'))   return "'Noto Naskh Arabic', 'Scheherazade New', serif";
  if (language.includes('Greek'))    return "'GFS Didot', 'Palatino', serif";
  if (language.includes('Armenian')) return "'Noto Serif Armenian', serif";
  if (language.includes('Georgian')) return "'Noto Serif Georgian', serif";
  if (language.includes('Japanese') || language.includes('Chinese') || language.includes('Korean'))
                                     return "'Noto Serif CJK JP', serif";
  if (language.includes('Cyrillic')) return "'Palatino Linotype', 'PT Serif', serif";
  return "'Palatino Linotype', 'Palatino', 'Georgia', serif";
}

export function buildSystemPrompt(
  shape: 'circle' | 'square',
  initial: string,
  language: string,
): string {
  const font      = fontSpec(language);
  const border    = shape === 'circle'
    ? `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`
    : `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`;
  const safeZone  = shape === 'circle'
    ? 'All inner shapes within radius 108 from center (150,150)'
    : 'All inner shapes within x:33–267, y:33–267';
  const shapeRule = shape === 'circle'
    ? 'EVERY svg MUST use circle border (radius 132). NO square borders.'
    : 'EVERY svg MUST use square border (264×264). NO circle borders.';

  return `You are a master heritage stamp designer and typographer.
Output ONLY valid JSON — no markdown, no explanation:
{"svgs":["<svg>...</svg>","<svg>...</svg>",...(12 items total)]}

${shapeRule}

MANDATORY in EVERY design:
1. viewBox="0 0 300 300"
2. First element: <rect width="300" height="300" fill="white"/>
3. Second element (border): ${border}
4. The family initial MUST appear in every design:
   <text x="150" y="168" font-family="${font}" font-size="76" text-anchor="middle" fill="black">${initial || '?'}</text>
   Adjust y between 155–175 for visual centering. The letter is the HEART of the design.
5. Minimum stroke-width="9" for all paths, lines, circles, rects
6. Only fill="black", fill="none", fill="white" — NO grays, NO gradients
7. Safe zone: ${safeZone}
8. Minimum 8px gap between any two strokes (prevent ink bleed)

GENERATE 12 UNIQUE DESIGNS with this variety breakdown:
Designs 1–4  (Minimalist): Letter dominant. 1–2 clean geometric rings or frame. Open negative space.
Designs 5–8  (Modern): Bold geometric border ornaments. Angular frames. Abstract value symbolism.
Designs 9–12 (Heritage/Ancient): Ornate ring patterns. Multiple concentric frames. Cultural geometry.

ALLOWED elements: <circle>, <rect>, <line>, <path>, <text> (for initial only)
BANNED: <polygon>, <polyline>, <ellipse>, <tspan>
BANNED content: religious symbols, crosses, stars, crescents, flags, faces, animals, text other than the initial

Each of the 12 designs MUST look visually distinct — vary ring count, spacing, path decorations, frame geometry.
Do NOT repeat the same composition twice.`;
}

export function buildUserMessage(params: {
  origin:     string;
  occupation: string;
  values:     string;
  lineage:    string;
  language:   string;
  initial:    string;
}): string {
  const culturalNote = params.origin
    ? `Draw geometric inspiration from the visual heritage of: ${params.origin}.`
    : '';

  return `Family Data:
Initial: "${params.initial}" — Script: ${params.language || 'Latin'}
Origins: ${params.origin || 'Universal'}
Occupation across generations: ${params.occupation || 'Artisan'}
Core values: ${params.values || 'Resilience, Wisdom'}
Lineage: ${params.lineage || 'From the past'}

${culturalNote}
Incorporate the VALUES symbolically through geometric pattern choice.
Generate all 12 designs now.`;
}
