/**
 * SYGNEO — Legacy Stamp Design Architect
 * 6 circle + 6 square per Claude call (12 total per batch).
 * Initial letter injected programmatically by route.ts.
 */

export function fontSpec(language: string): string {
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

// ── Circle templates (6 visually distinct layouts) ────────────────────────────
const CIRCLE_TEMPLATES = `
MANDATORY LAYOUT — each number is a DIFFERENT design. Follow exactly:

#1 SINGLE RING
  <circle cx="150" cy="150" r="78" fill="none" stroke="black" stroke-width="10"/>
  (one ring only — clean and open)

#2 DIAMOND FRAME
  <rect x="110" y="110" width="80" height="80" fill="none" stroke="black" stroke-width="10" transform="rotate(45 150 150)"/>
  (one rotated square only — NO circles inside)

#3 DOUBLE RING
  <circle cx="150" cy="150" r="90" fill="none" stroke="black" stroke-width="10"/>
  <circle cx="150" cy="150" r="62" fill="none" stroke="black" stroke-width="10"/>
  (two rings, 28px apart — nothing else)

#4 RADIAL SPOKES
  8 <line> elements: each from r=48 to r=90 at 0° 45° 90° 135° 180° 225° 270° 315°
  Example: <line x1="150" y1="60" x2="150" y2="102" .../>  (north spoke)
  (spokes only — no rings, no rects)

#5 RING + CULTURAL PATH
  <circle cx="150" cy="150" r="82" fill="none" stroke="black" stroke-width="10"/>
  Plus ONE <path> of 4–5 arc segments inside r=82. ALL path points MUST be outside r=60 from center (150,150).
  Use the family's origin culture as inspiration for the ornament shape.

#6 RING + TICKS
  <circle cx="150" cy="150" r="88" fill="none" stroke="black" stroke-width="10"/>
  8 short <line> tick marks: each from r=50 to r=72, evenly spaced at 45° (N/NE/E/SE/S/SW/W/NW).
  Example north tick: <line x1="150" y1="78" x2="150" y2="100" stroke="black" stroke-width="9"/>
  (2 elements only — ring + 8 ticks. No additional rings.)`;

// ── Square templates (6 visually distinct layouts) ────────────────────────────
const SQUARE_TEMPLATES = `
MANDATORY LAYOUT — each number is a DIFFERENT design. Follow exactly:

#1 INNER SQUARE
  <rect x="36" y="36" width="228" height="228" fill="none" stroke="black" stroke-width="10"/>
  (one inner square only — clean and open)

#2 DIAMOND FRAME
  <rect x="95" y="95" width="110" height="110" fill="none" stroke="black" stroke-width="10" transform="rotate(45 150 150)"/>
  (one rotated rect only — NO other shapes)

#3 DOUBLE SQUARE
  <rect x="36" y="36" width="228" height="228" fill="none" stroke="black" stroke-width="10"/>
  <rect x="68" y="68" width="164" height="164" fill="none" stroke="black" stroke-width="10"/>
  (two nested squares, 32px apart — nothing else)

#4 RADIAL SPOKES
  8 <line> elements: each from r=48 to r=90 at 0° 45° 90° 135° 180° 225° 270° 315°
  (same spoke pattern as circle #4 — works for square too)

#5 DOUBLE SQUARE BOLD
  <rect x="40" y="40" width="220" height="220" fill="none" stroke="black" stroke-width="10"/>
  <rect x="92" y="92" width="116" height="116" fill="none" stroke="black" stroke-width="10"/>
  (TWO nested squares only — 42px gap between them. Do NOT add a third square.)

#6 SQUARE + RING
  <rect x="40" y="40" width="220" height="220" fill="none" stroke="black" stroke-width="10"/>
  <circle cx="150" cy="150" r="80" fill="none" stroke="black" stroke-width="10"/>
  (two elements only — clean and bold, no third shape)`;

export function buildSystemPrompt(shape: 'circle' | 'square'): string {
  const border    = shape === 'circle'
    ? `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`
    : `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`;
  const safeNote  = shape === 'circle'
    ? 'SAFE ZONE: all inner shapes must fit within radius 105 from center (150,150). No element may cross or touch the border ring.'
    : 'SAFE ZONE: all inner shapes within x:33–267, y:33–267. No element may touch or cross the border rect.';
  const shapeRule = shape === 'circle'
    ? 'ALL 6 SVGs MUST use circle border r=132. No square borders.'
    : 'ALL 6 SVGs MUST use square border 264×264 at x=18 y=18. No circle borders for the outer frame.';
  const templates = shape === 'circle' ? CIRCLE_TEMPLATES : SQUARE_TEMPLATES;

  return `You are a master heritage stamp designer for rubber stamp production.
Output ONLY valid JSON — no markdown:
{"svgs":["<svg>...</svg>","<svg>...</svg>","<svg>...</svg>","<svg>...</svg>","<svg>...</svg>","<svg>...</svg>"]}

${shapeRule}

EVERY SVG must contain exactly these elements in order:
1. <rect width="300" height="300" fill="white"/>
2. The border (as above)
3. The inner design shapes (from the template)
DO NOT add text, labels, or any other elements.

STAMP PRODUCTION RULES:
- viewBox="0 0 300 300"
- Minimum stroke-width="9" — thinner lines collapse in rubber engraving
- Only fill="none", fill="white", fill="black" — no grays, no gradients
- ${safeNote}
- Minimum 10px gap between any two parallel strokes
- CLEAR ZONE: no decorative element may have any point closer than r=58 from center (150,150). The letter sits in this zone.

${templates}

STRICTLY FORBIDDEN:
- Religious, military, nationalist, racist, gender or hate symbols
- Crosshair, gun sight, stars, crosses, crescents, triangles, eyes
- <polygon> <polyline> <ellipse> <text> <tspan>
- Any element outside the safe zone
- Repeating the same template for two different numbers`;
}

export function buildUserMessage(params: {
  origin:     string;
  occupation: string;
  values:     string;
  lineage:    string;
}): string {
  return `Family profile:
Origins: ${params.origin || 'Universal'}
Occupation: ${params.occupation || 'Artisan'}
Values: ${params.values || 'Wisdom, Resilience'}
Lineage: ${params.lineage || 'From the past'}

Use the geometric heritage of "${params.origin}" as inspiration for ornamental motifs in templates #5 and #6.
Generate all 6 designs now, following each numbered template.`;
}
