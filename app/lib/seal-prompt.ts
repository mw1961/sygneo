/**
 * SYGNEO — Legacy Stamp Design Architect
 * Generates 12 circle OR 12 square SVGs per Claude call.
 * The initial letter is injected programmatically by route.ts (not relied on Claude).
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

const CIRCLE_TEMPLATES = `
NUMBERED DESIGN TEMPLATES — follow each layout EXACTLY, vary details based on family data:
#1  border + 1 ring r=75 (leave center open for initial)
#2  border + 1 rotated rect 70×70 at 45° (centered) — NO inner circles
#3  border + 2 rings r=88 r=62 (spaced 26px apart)
#4  border + 1 open arc path 270° sweep at r=75 — NO full circles inside
#5  border + bold ring r=88 sw=11 + 4 short tick lines at N/S/E/W between r=100 and r=112
#6  border + ring r=80 + rotated rect 90×90 at 45°
#7  border + 8 radial <line> elements from r=52 to r=88 (evenly spaced at 45°)
#8  border + 2 opposing arcs: one arc top 180° at r=72, one arc bottom 180° at r=72
#9  border + 3 concentric rings r=100 r=76 r=52 (spaced 24px)
#10 border + ring r=90 + ring r=55 + 8 short tick marks between them
#11 border + ring r=85 + 6 arc segments forming a rosette (A path commands)
#12 border + ring r=95 + ring r=52 + 12 short radial lines between them`;

const SQUARE_TEMPLATES = `
NUMBERED DESIGN TEMPLATES — follow each layout EXACTLY, vary details based on family data:
#1  border + inner square 230×230 centered (x=35 y=35) — leave center open
#2  border + rotated rect 170×170 at 45° centered on 150,150 — NO inner squares
#3  border + 2 nested squares: 240×240 (x=30) and 180×180 (x=60)
#4  border + square 210×210 (x=45) + 4 corner L-shaped path marks
#5  border + rotated rect 200×200 at 45° + ring r=62
#6  border + square 220×220 (x=40) + 4 diagonal lines from corners inward (not through center)
#7  border + 8 radial <line> elements from r=52 to r=90 (evenly spaced)
#8  border + 3 nested squares at 0° 15° 30° (260×260, 200×200, 150×150)
#9  border + square 240×240 (x=30) + ring r=88 + inner square 140×140 (x=80)
#10 border + triple nested squares (260×260, 200×200, 150×150) + 8 tick marks
#11 border + 4 quadrant small squares (each 80×80, at corners) + ring r=52
#12 border + square 220×220 + ring r=85 + rotated rect 120×120 at 45°`;

export function buildSystemPrompt(
  shape: 'circle' | 'square',
): string {
  const border    = shape === 'circle'
    ? `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`
    : `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`;
  const safeZone  = shape === 'circle'
    ? 'All inner shapes within radius 108. No element center more than 108px from (150,150).'
    : 'All inner shapes within x:33–267, y:33–267.';
  const shapeRule = shape === 'circle'
    ? 'ALL 12 SVGs MUST have circle border r=132. NO square borders anywhere.'
    : 'ALL 12 SVGs MUST have square border 264×264. NO circle borders for the outer frame.';
  const templates = shape === 'circle' ? CIRCLE_TEMPLATES : SQUARE_TEMPLATES;

  return `You are a master heritage stamp designer. Generate exactly 12 unique SVG stamp designs.
Output ONLY valid JSON — no markdown, no explanation:
{"svgs":["<svg>...</svg>","<svg>...</svg>",...(12 items)]}

${shapeRule}

MANDATORY for EVERY SVG:
1. viewBox="0 0 300 300"
2. First: <rect width="300" height="300" fill="white"/>
3. Second: ${border}
4. Minimum stroke-width="9" for all shapes
5. Only fill="black" fill="none" fill="white" — NO grays NO gradients
6. ${safeZone}
7. Minimum 8px gap between any two strokes

${templates}

Note: A family initial letter will be centered over each design. Leave the visual center OPEN — do not fill x:110–190 y:110–190 with black shapes.

BANNED: <polygon> <polyline> <ellipse> <text> <tspan> — do NOT output any text elements.
BANNED CONTENT: religious symbols, stars, crosses, crescents, flags, animals, faces.

CRITICAL: Each of the 12 designs must match its numbered template. Do NOT generate the same layout for two different numbers.`;
}

export function buildUserMessage(params: {
  origin:     string;
  occupation: string;
  values:     string;
  lineage:    string;
  language:   string;
  initial:    string;
}): string {
  return `Family Profile:
Origins: ${params.origin || 'Universal'}
Occupation: ${params.occupation || 'Artisan'}
Values: ${params.values || 'Wisdom, Resilience'}
Lineage: ${params.lineage || 'From the past'}

Apply cultural geometry from "${params.origin}" as ornamental motifs within each template's structure.
Let "${params.values}" influence the symbolic weight of each design.
Generate all 12 numbered designs now.`;
}
