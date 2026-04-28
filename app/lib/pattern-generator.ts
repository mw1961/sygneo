/**
 * Algorithmic pattern generator for Sygneo Heritage Seals.
 * Hash-seeded RNG → scattered disconnected fragments, unique per family.
 */

// ── Seeded RNG ────────────────────────────────────────────────────────────────

function seedRNG(hash: string): () => number {
  let s = (parseInt(hash.slice(0, 8), 16) >>> 0) || 0x12345678;
  return function () {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0x100000000;
  };
}

// ── Profile → Hash ────────────────────────────────────────────────────────────

export async function hashProfile(
  origin: string,
  occupation: string,
  values: string[],
  familyName?: string,
): Promise<string> {
  const input = [familyName ?? '', origin, occupation, ...values.sort()].join('|').toLowerCase();
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Fragment helpers ──────────────────────────────────────────────────────────

// Rotate & translate a local (x,y) point to world coords
function xfPoint(
  lx: number, ly: number,
  cx: number, cy: number,
  cos: number, sin: number,
): string {
  return `${(cx + lx * cos - ly * sin).toFixed(1)},${(cy + lx * sin + ly * cos).toFixed(1)}`;
}

// ── Angular fragments: L / C / Z / T / bracket — strict 90° with slight jitter

function angularFrag(rng: () => number, cx: number, cy: number, s: number): string {
  const type = Math.floor(rng() * 6);
  const rot  = Math.floor(rng() * 4) * (Math.PI / 2) + (rng() - 0.5) * 0.14; // ±8° jitter
  const cos  = Math.cos(rot), sin = Math.sin(rot);
  const p = (x: number, y: number) => xfPoint(x, y, cx, cy, cos, sin);
  const h = s * 0.5;

  switch (type) {
    case 0: // L corner
      return `M${p(-h, -h)} L${p(-h, h)} L${p(h, h)}`;
    case 1: // C bracket (3-sided open square)
      return `M${p(h, -h)} L${p(-h, -h)} L${p(-h, h)} L${p(h, h)}`;
    case 2: // Z / S shape (3 separate strokes)
      return `M${p(-h, -h)} L${p(h * 0.3, -h)} M${p(-h * 0.3, 0)} L${p(h * 0.3, 0)} M${p(-h * 0.3, h)} L${p(h, h)}`;
    case 3: // T shape
      return `M${p(-h, -h * 0.2)} L${p(h, -h * 0.2)} M${p(0, -h * 0.2)} L${p(0, h)}`;
    case 4: // double bracket (two parallel lines with end cap)
      return `M${p(-h, -h)} L${p(-h, h)} M${p(h * 0.2, -h)} L${p(h * 0.2, h)} M${p(-h, h)} L${p(h * 0.2, h)}`;
    case 5: // reverse-C (bracket facing other way)
      return `M${p(-h, -h)} L${p(h, -h)} L${p(h, h)} L${p(-h, h)}`.split('L').slice(0,3).join('L');
  }
  return `M${p(-h, 0)} L${p(h, 0)}`;
}

// ── Organic fragments: arcs, S-curves, spirals — any rotation ────────────────

function organicFrag(rng: () => number, cx: number, cy: number, s: number): string {
  const type = Math.floor(rng() * 5);
  const rot  = rng() * Math.PI * 2;
  const cos  = Math.cos(rot), sin = Math.sin(rot);
  const p  = (x: number, y: number) => xfPoint(x, y, cx, cy, cos, sin);
  const cp = (x: number, y: number) => `${(cx + x * cos - y * sin).toFixed(1)} ${(cy + x * sin + y * cos).toFixed(1)}`;
  const h = s * 0.5;

  switch (type) {
    case 0: // quarter-circle arc
      return `M${p(-h, 0)} A${s.toFixed(1)},${s.toFixed(1)} 0 0 1 ${p(0, -h)}`;
    case 1: // open arc — C-shaped curve
      return `M${p(h * 0.7, -h)} A${h.toFixed(1)},${h.toFixed(1)} 0 1 0 ${p(h * 0.7, h)}`;
    case 2: // S-curve
      return `M${p(-h, -h)} C${cp(-h * 0.2, 0)} ${cp(h * 0.2, 0)} ${p(h, h)}`;
    case 3: // spiral end (arc + curl)
      return `M${p(-h, 0)} C${cp(-h, -h)} ${cp(h, -h)} ${p(h, 0)} C${cp(h, h * 0.5)} ${cp(0, h * 0.5)} ${p(0, 0)}`;
    case 4: // wavy stroke
      return `M${p(-h, -h * 0.3)} C${cp(-h * 0.3, h * 0.5)} ${cp(h * 0.3, -h * 0.5)} ${p(h, h * 0.3)}`;
  }
  return `M${p(-h, 0)} A${h.toFixed(1)},${h.toFixed(1)} 0 0 1 ${p(0, -h)}`;
}

// ── Scatter engine: place fragments in a grid with gaps ───────────────────────

function scatterFragments(
  rng: () => number,
  ox: number, oy: number,
  w: number,  h: number,
  fragFn: (rng: () => number, cx: number, cy: number, s: number) => string,
  cols = 4, rows = 4,
  skipProb = 0.28,
): string {
  const cw = w / cols, ch = h / rows;
  const parts: string[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (rng() < skipProb) continue;
      const cx  = ox + (col + 0.12 + rng() * 0.76) * cw;
      const cy  = oy + (row + 0.12 + rng() * 0.76) * ch;
      const sz  = Math.min(cw, ch) * (0.38 + rng() * 0.38);
      parts.push(fragFn(rng, cx, cy, sz));
    }
  }
  return parts.join(' ');
}

// ── Three pattern types ───────────────────────────────────────────────────────

function mazePattern(rng: () => number, ox: number, oy: number, w: number, h: number): string {
  return scatterFragments(rng, ox, oy, w, h, angularFrag, 4, 4, 0.26);
}

function organicPattern(rng: () => number, cx: number, cy: number, r: number): string {
  const s = r * 1.62;
  return scatterFragments(rng, cx - s / 2, cy - s / 2, s, s, organicFrag, 4, 4, 0.26);
}

function hybridPattern(rng: () => number, cx: number, cy: number, r: number): string {
  // Outer gear ring (angular identity frame)
  const outerParts: string[] = [];
  const segments = 10 + Math.floor(rng() * 6);
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 0.65 + rng() * 0.25) / segments) * Math.PI * 2;
    const r1 = r * 0.58 + rng() * r * 0.07;
    const r2 = r * 0.80 + rng() * r * 0.05;
    outerParts.push(
      `M${(cx + Math.cos(a1) * r1).toFixed(1)},${(cy + Math.sin(a1) * r1).toFixed(1)} ` +
      `L${(cx + Math.cos(a1) * r2).toFixed(1)},${(cy + Math.sin(a1) * r2).toFixed(1)} ` +
      `L${(cx + Math.cos(a2) * r2).toFixed(1)},${(cy + Math.sin(a2) * r2).toFixed(1)} ` +
      `L${(cx + Math.cos(a2) * r1).toFixed(1)},${(cy + Math.sin(a2) * r1).toFixed(1)} Z`
    );
  }

  // Inner: scattered angular fragments (smaller grid)
  const s = r * 0.94;
  const inner = scatterFragments(rng, cx - s / 2, cy - s / 2, s, s, angularFrag, 3, 3, 0.22);

  return outerParts.join(' ') + ' ' + inner;
}

// ── Shape clips and borders ───────────────────────────────────────────────────

const CLIPS: Record<string, string> = {
  circle:   '<clipPath id="c"><circle cx="100" cy="100" r="82"/></clipPath>',
  square:   '<clipPath id="c"><rect x="18" y="18" width="164" height="164"/></clipPath>',
  triangle: '<clipPath id="c"><polygon points="100,20 182,168 18,168"/></clipPath>',
};

const BORDERS: Record<string, (color: string) => string> = {
  circle:   c => `<circle cx="100" cy="100" r="82" fill="none" stroke="${c}" stroke-width="6"/>`,
  square:   c => `<rect x="18" y="18" width="164" height="164" fill="none" stroke="${c}" stroke-width="6"/>`,
  triangle: c => `<polygon points="100,20 182,168 18,168" fill="none" stroke="${c}" stroke-width="6"/>`,
};

// ── Main render ───────────────────────────────────────────────────────────────

export type PatternType = 'angular' | 'organic' | 'hybrid';
export type ShapeType   = 'circle'  | 'square'  | 'triangle';

export function renderSeal(
  hash:    string,
  pattern: PatternType,
  shape:   ShapeType,
  color:   string,
  variant = 0,
): string {
  const shift   = (variant * 7) % (hash.length - 8);
  const rotated = hash.slice(shift) + hash.slice(0, shift);
  const offset  = pattern === 'angular' ? 0 : pattern === 'organic' ? 16 : 32;
  const rng     = seedRNG(rotated.slice(offset, offset + 8) + rotated.slice(0, offset));

  let innerPaths = '';
  if (pattern === 'angular') {
    const m = 22;
    innerPaths = mazePattern(rng, m, m, 200 - m * 2, 200 - m * 2);
  } else if (pattern === 'organic') {
    innerPaths = organicPattern(rng, 100, 100, 78);
  } else {
    innerPaths = hybridPattern(rng, 100, 100, 78);
  }

  const clip   = CLIPS[shape]   ?? CLIPS.circle;
  const border = (BORDERS[shape] ?? BORDERS.circle)(color);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>${clip}</defs>
  ${border}
  <g clip-path="url(#c)">
    <path d="${innerPaths}" stroke="${color}" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

// ── Generate all 9 ────────────────────────────────────────────────────────────

export function renderAllNine(hash: string, color: string, variant = 0): {
  pattern: PatternType; shape: ShapeType; svg: string;
}[] {
  const patterns: PatternType[] = ['angular', 'organic', 'hybrid'];
  const shapes:   ShapeType[]   = ['circle',  'square',  'triangle'];
  const results: { pattern: PatternType; shape: ShapeType; svg: string }[] = [];

  for (const shape of shapes) {
    for (const pattern of patterns) {
      results.push({ pattern, shape, svg: renderSeal(hash, pattern, shape, color, variant) });
    }
  }
  return results;
}
