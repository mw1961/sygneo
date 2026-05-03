/**
 * SYGNEO — Legacy Stamp Design Architect · Final Production Version
 * 6 circle + 6 square per Claude call (12 total per batch).
 * Initial letter injected programmatically with SVG mask knockout.
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

// dy offset for optical vertical centering per script family.
// Formula: dy = cap_height/2 relative to em, so letter visual center sits at y=150.
// Latin/Hebrew/Cyrillic/Greek cap-height ≈ 0.70em → dy = 0.35em
// CJK characters fill the full em square and extend below baseline → dy = 0.38em
export function dyOffset(language: string): string {
  if (language.includes('Japanese') || language.includes('Chinese') || language.includes('Korean')) return '.38em';
  return '.35em';
}

// ── Circle templates — 4 named themes, 6 distinct layouts ─────────────────────
const CIRCLE_TEMPLATES = `
Each design uses ONE of four approved production themes. Follow each template EXACTLY.

#1 — THE MINIMALIST RING
A single bold ring. The letter IS the design.
<circle cx="150" cy="150" r="80" fill="none" stroke="black" stroke-width="11"/>
(one ring, nothing else — maximum openness)

#2 — THE DOUBLE HERITAGE RING
Two concentric rings with a generous breathing gap.
<circle cx="150" cy="150" r="92" fill="none" stroke="black" stroke-width="11"/>
<circle cx="150" cy="150" r="66" fill="none" stroke="black" stroke-width="11"/>
(gap between rings = 26px minimum — do not reduce)

#3 — THE SUNBURST
Eight bold radial spokes. No rings. No rects.
<line x1="150" y1="62" x2="150" y2="96" stroke="black" stroke-width="10"/>   (N)
<line x1="214" y1="86" x2="193" y2="107" stroke="black" stroke-width="10"/>  (NE)
<line x1="238" y1="150" x2="204" y2="150" stroke="black" stroke-width="10"/> (E)
<line x1="214" y1="214" x2="193" y2="193" stroke="black" stroke-width="10"/> (SE)
<line x1="150" y1="238" x2="150" y2="204" stroke="black" stroke-width="10"/> (S)
<line x1="86" y1="214" x2="107" y2="193" stroke="black" stroke-width="10"/>  (SW)
<line x1="62" y1="150" x2="96" y2="150" stroke="black" stroke-width="10"/>   (W)
<line x1="86" y1="86" x2="107" y2="107" stroke="black" stroke-width="10"/>   (NW)

#4 — THE MODERN SHIELD
A bold ring combined with a rotated square frame inside.
<circle cx="150" cy="150" r="84" fill="none" stroke="black" stroke-width="11"/>
<rect x="112" y="112" width="76" height="76" fill="none" stroke="black" stroke-width="10" transform="rotate(45 150 150)"/>
(rotated rect corners must stay inside r=84)

#5 — THE HERITAGE BAND
A ring with 8 bold, evenly-spaced arc segments as a decorative band. NO petals, NO floral shapes, NO sharp angles.
<circle cx="150" cy="150" r="84" fill="none" stroke="black" stroke-width="11"/>
The 8 arc segments are short convex arcs (A command, radius 18, sweep 1) placed around the ring at 45° intervals. Each arc starts and ends outside r=65.

#6 — THE WEIGHTED FRAME
A very thick outer ring paired with a small inner ring — bold and dramatic.
<circle cx="150" cy="150" r="96" fill="none" stroke="black" stroke-width="13"/>
<circle cx="150" cy="150" r="64" fill="none" stroke="black" stroke-width="11"/>
(gap between rings = 32px)`;

// ── Square templates — 4 named themes, 6 distinct layouts ─────────────────────
const SQUARE_TEMPLATES = `
Each design uses ONE of four approved production themes. Follow each template EXACTLY.

#1 — THE WEIGHTED SQUARE
A single bold inner square. The letter IS the hero.
<rect x="40" y="40" width="220" height="220" fill="none" stroke="black" stroke-width="11"/>
(one square, nothing else — maximum openness)

#2 — THE MODERN DIAMOND
A bold rotated square (diamond orientation). No other shapes.
<rect x="100" y="100" width="100" height="100" fill="none" stroke="black" stroke-width="11" transform="rotate(45 150 150)"/>
(rotated square only — check that all corners are inside the safe zone)

#3 — THE DOUBLE HERITAGE SQUARE
Two nested squares with a bold generous gap.
<rect x="40" y="40" width="220" height="220" fill="none" stroke="black" stroke-width="11"/>
<rect x="92" y="92" width="116" height="116" fill="none" stroke="black" stroke-width="11"/>
(42px gap between the squares — do NOT add a third square)

#4 — THE SUNBURST
Eight bold radial spokes. No squares. No rings.
(use the exact same 8 lines as circle #3 above)

#5 — THE MODERN SHIELD
A square combined with a bold inner ring.
<rect x="40" y="40" width="220" height="220" fill="none" stroke="black" stroke-width="11"/>
<circle cx="150" cy="150" r="76" fill="none" stroke="black" stroke-width="11"/>

#6 — THE HERITAGE FRAME
A square with bold L-bracket ornaments at all four corners. No additional rings or rects.
<rect x="40" y="40" width="220" height="220" fill="none" stroke="black" stroke-width="11"/>
Corner L-brackets: 4 paths, each 28px long on each arm, placed at the inner corners (approx 52px from center on each axis).
Example top-left bracket: <path d="M 80 108 L 80 80 L 108 80" fill="none" stroke="black" stroke-width="10" stroke-linecap="round"/>`;

export function buildSystemPrompt(shape: 'circle' | 'square'): string {
  const border    = shape === 'circle'
    ? `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`
    : `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`;
  const safeZone  = shape === 'circle'
    ? 'All inner shapes within radius 105 from center (150,150). No element touches the outer border ring.'
    : 'All inner shapes within x:33–267, y:33–267. No element touches the outer border rect.';
  const shapeRule = shape === 'circle'
    ? 'ALL 6 SVGs MUST use the circle border (r=132). No square borders.'
    : 'ALL 6 SVGs MUST use the square border (264×264 at x=18 y=18). No circle borders for the outer frame.';
  const templates = shape === 'circle' ? CIRCLE_TEMPLATES : SQUARE_TEMPLATES;

  return `You are a master heritage stamp engineer specializing in premium rubber stamp production.
Output ONLY valid JSON — no markdown:
{"svgs":["<svg>...</svg>","<svg>...</svg>","<svg>...</svg>","<svg>...</svg>","<svg>...</svg>","<svg>...</svg>"]}

${shapeRule}

EVERY SVG must contain elements in this order:
1. <rect width="300" height="300" fill="white"/>
2. The outer border
3. The inner design (from the numbered template)
DO NOT add text or any unlisted elements.

RUBBER STAMP PRODUCTION RULES — non-negotiable:
- viewBox="0 0 300 300"
- Minimum stroke-width="10" for all decorative elements (thinner lines collapse in engraving)
- Only fill="none", fill="white", fill="black" — no grays, no gradients
- ${safeZone}
- CLEAR ZONE: no decorative element may have any point closer than r=62 from center (150,150) — the initial letter occupies this zone
- Minimum 20px gap between any two parallel decorative strokes (breathing room for ink)

ABSOLUTELY BANNED — these cause ink traps or fail in production:
- Scalloped borders, petal shapes, floral patterns, sharp inner angles (ink traps)
- Three or more concentric frames of the same type
- Dense lattices, cross-hatching, or complex internal grids
- <polygon> <polyline> <ellipse> <text> <tspan>
- Any element violating the safe zone or clear zone rules
- Religious, military, nationalist, racist, gender or hate symbols
- Stars, crosses, crescents, eyes, triangles, flags, animals, faces

${templates}

CRITICAL: Match each numbered template exactly. Do NOT substitute or combine templates. Do NOT generate the same layout for two different numbers.`;
}

export function buildUserMessage(params: {
  origin:     string;
  occupation: string;
  values:     string;
  lineage:    string;
}): string {
  return `Family heritage profile:
Origins: ${params.origin || 'Universal'}
Occupation: ${params.occupation || 'Artisan'}
Values: ${params.values || 'Wisdom, Resilience'}
Lineage: ${params.lineage || 'From the past'}

For templates #5 and #6: draw subtle geometric inspiration from the visual heritage of "${params.origin}" (abstract patterns only — no symbols).
Generate all 6 numbered designs now.`;
}
