/**
 * Algorithmic pattern generator for Sygneo Heritage Seals.
 * Each family's SHA-256 hash seeds a deterministic RNG → unique, repeatable patterns.
 * Zero API cost — pure mathematics.
 */

// ── Seeded RNG (deterministic) ────────────────────────────────────────────────

function seedRNG(hash: string): () => number {
  let s = (parseInt(hash.slice(0, 8), 16) >>> 0) || 0x12345678;
  return function () {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) >>> 0;
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0x100000000;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

// ── Angular: Maze (recursive backtracker) ─────────────────────────────────────

function mazePattern(rng: () => number, ox: number, oy: number, w: number, h: number): string {
  const COLS = 8, ROWS = 8;
  const cw = w / COLS, ch = h / ROWS;

  // Walls: hWalls[r][c] = top horizontal wall of cell (r,c)
  const hW = Array.from({ length: ROWS + 1 }, () => Array(COLS).fill(true));
  const vW = Array.from({ length: ROWS }, () => Array(COLS + 1).fill(true));
  const vis = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  function carve(r: number, c: number) {
    vis[r][c] = true;
    for (const [dr, dc] of shuffle([[-1,0],[1,0],[0,-1],[0,1]], rng)) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !vis[nr][nc]) {
        if (dr === -1) hW[r][c]   = false;
        if (dr ===  1) hW[r+1][c] = false;
        if (dc === -1) vW[r][c]   = false;
        if (dc ===  1) vW[r][c+1] = false;
        carve(nr, nc);
      }
    }
  }
  carve(Math.floor(rng() * ROWS), Math.floor(rng() * COLS));

  const segs: string[] = [];
  // Horizontal walls
  for (let r = 0; r <= ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (hW[r][c]) {
        const x1 = ox + c * cw, x2 = ox + (c + 1) * cw, y = oy + r * ch;
        segs.push(`M${x1.toFixed(1)},${y.toFixed(1)} L${x2.toFixed(1)},${y.toFixed(1)}`);
      }
    }
  }
  // Vertical walls
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS; c++) {
      if (vW[r][c]) {
        const x = ox + c * cw, y1 = oy + r * ch, y2 = oy + (r + 1) * ch;
        segs.push(`M${x.toFixed(1)},${y1.toFixed(1)} L${x.toFixed(1)},${y2.toFixed(1)}`);
      }
    }
  }
  return segs.join(' ');
}

// ── Organic: Flowing curves (fingerprint / brain-fold texture) ────────────────

function organicPattern(rng: () => number, cx: number, cy: number, r: number): string {
  const strokes: string[] = [];
  const count = 22 + Math.floor(rng() * 8);

  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const dist  = rng() * r * 0.78;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const len = r * 0.12 + rng() * r * 0.22;
    const dir = angle + (rng() - 0.5) * Math.PI * 1.4;
    const ex = sx + Math.cos(dir) * len;
    const ey = sy + Math.sin(dir) * len;
    const bend = (rng() - 0.5) * 1.2;
    const cp1x = sx + Math.cos(dir + bend) * len * 0.35;
    const cp1y = sy + Math.sin(dir + bend) * len * 0.35;
    const cp2x = ex + Math.cos(dir - bend) * len * 0.35;
    const cp2y = ey + Math.sin(dir - bend) * len * 0.35;
    strokes.push(
      `M${sx.toFixed(1)},${sy.toFixed(1)} C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`
    );
  }
  return strokes.join(' ');
}

// ── Hybrid: Angular outer ring + Organic inner core ───────────────────────────

function hybridPattern(rng: () => number, cx: number, cy: number, r: number): string {
  // Outer ring: concentric angular segments
  const outerParts: string[] = [];
  const segments = 12 + Math.floor(rng() * 6);
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 0.7 + rng() * 0.25) / segments) * Math.PI * 2;
    const r1 = r * 0.55 + rng() * r * 0.1;
    const r2 = r * 0.78 + rng() * r * 0.06;
    outerParts.push(
      `M${(cx + Math.cos(a1) * r1).toFixed(1)},${(cy + Math.sin(a1) * r1).toFixed(1)} ` +
      `L${(cx + Math.cos(a1) * r2).toFixed(1)},${(cy + Math.sin(a1) * r2).toFixed(1)} ` +
      `L${(cx + Math.cos(a2) * r2).toFixed(1)},${(cy + Math.sin(a2) * r2).toFixed(1)} ` +
      `L${(cx + Math.cos(a2) * r1).toFixed(1)},${(cy + Math.sin(a2) * r1).toFixed(1)} Z`
    );
  }

  // Inner core: organic swirls
  const innerCount = 14 + Math.floor(rng() * 6);
  const innerParts: string[] = [];
  for (let i = 0; i < innerCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist  = rng() * r * 0.45;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const len = r * 0.1 + rng() * r * 0.16;
    const dir = angle + (rng() - 0.5) * Math.PI;
    const ex = sx + Math.cos(dir) * len;
    const ey = sy + Math.sin(dir) * len;
    const b = (rng() - 0.5) * 0.9;
    innerParts.push(
      `M${sx.toFixed(1)},${sy.toFixed(1)} ` +
      `C${(sx + Math.cos(dir+b)*len*0.4).toFixed(1)},${(sy + Math.sin(dir+b)*len*0.4).toFixed(1)} ` +
      `${(ex + Math.cos(dir-b)*len*0.3).toFixed(1)},${(ey + Math.sin(dir-b)*len*0.3).toFixed(1)} ` +
      `${ex.toFixed(1)},${ey.toFixed(1)}`
    );
  }
  return [...outerParts, ...innerParts].join(' ');
}

// ── Shape clips and borders ───────────────────────────────────────────────────

const CLIPS: Record<string, string> = {
  circle:   '<clipPath id="c"><circle cx="100" cy="100" r="82"/></clipPath>',
  square:   '<clipPath id="c"><rect x="18" y="18" width="164" height="164"/></clipPath>',
  triangle: '<clipPath id="c"><polygon points="100,20 182,168 18,168"/></clipPath>',
};

const BORDERS: Record<string, (color: string) => string> = {
  circle:   c => `<circle cx="100" cy="100" r="82" fill="none" stroke="${c}" stroke-width="4.5"/>`,
  square:   c => `<rect x="18" y="18" width="164" height="164" fill="none" stroke="${c}" stroke-width="4.5"/>`,
  triangle: c => `<polygon points="100,20 182,168 18,168" fill="none" stroke="${c}" stroke-width="4.5"/>`,
};

// ── Main render ───────────────────────────────────────────────────────────────

export type PatternType = 'angular' | 'organic' | 'hybrid';
export type ShapeType   = 'circle'  | 'square'  | 'triangle';

export function renderSeal(
  hash:    string,
  pattern: PatternType,
  shape:   ShapeType,
  color:   string,
): string {
  // Use different hash slices per pattern to ensure variation across the 3 types
  const offset = pattern === 'angular' ? 0 : pattern === 'organic' ? 16 : 32;
  const rng = seedRNG(hash.slice(offset, offset + 8) + hash.slice(0, offset));

  let innerPaths = '';

  if (pattern === 'angular') {
    // Clip the maze to a square region centered at 100,100
    const m = 24; // margin inside shape
    innerPaths = mazePattern(rng, m + 4, m + 4, 200 - m * 2 - 8, 200 - m * 2 - 8);
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
    <path d="${innerPaths}" stroke="${color}" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

// ── Generate all 9 ────────────────────────────────────────────────────────────

export function renderAllNine(hash: string, color: string): {
  pattern: PatternType; shape: ShapeType; svg: string;
}[] {
  const patterns: PatternType[] = ['angular', 'organic', 'hybrid'];
  const shapes:   ShapeType[]   = ['circle',  'square',  'triangle'];
  const results: { pattern: PatternType; shape: ShapeType; svg: string }[] = [];

  for (const shape of shapes) {
    for (const pattern of patterns) {
      results.push({ pattern, shape, svg: renderSeal(hash, pattern, shape, color) });
    }
  }
  return results;
}
