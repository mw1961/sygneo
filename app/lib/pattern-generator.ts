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

// ── Organic: Concentric wavy rings (fingerprint / topographic) ───────────────

function wavyRings(rng: () => number, cx: number, cy: number, maxR: number, ringCount: number): string {
  const paths: string[] = [];
  const PTS = 64;

  for (let ring = 1; ring <= ringCount; ring++) {
    const baseR = (ring / ringCount) * maxR;
    const scale = baseR * (0.07 + rng() * 0.06);
    const freq1 = 2 + Math.floor(rng() * 5);
    const freq2 = 1 + Math.floor(rng() * 3);
    const ph1   = rng() * Math.PI * 2;
    const ph2   = rng() * Math.PI * 2;

    const pts: [number, number][] = [];
    for (let i = 0; i < PTS; i++) {
      const a = (i / PTS) * Math.PI * 2;
      const pr = baseR + Math.sin(a * freq1 + ph1) * scale * 0.6
                       + Math.sin(a * freq2 + ph2) * scale * 0.4;
      pts.push([cx + Math.cos(a) * pr, cy + Math.sin(a) * pr]);
    }

    // Catmull-Rom → Cubic Bezier closed path
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < PTS; i++) {
      const p0 = pts[(i - 1 + PTS) % PTS];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % PTS];
      const p3 = pts[(i + 2) % PTS];
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    d += ' Z';
    paths.push(d);
  }
  return paths.join(' ');
}

function organicPattern(rng: () => number, cx: number, cy: number, r: number): string {
  const rings = 12 + Math.floor(rng() * 5);
  return wavyRings(rng, cx, cy, r * 0.90, rings);
}

// ── Hybrid: Angular outer segments + fingerprint inner rings ─────────────────

function hybridPattern(rng: () => number, cx: number, cy: number, r: number): string {
  const outerParts: string[] = [];
  const segments = 12 + Math.floor(rng() * 6);
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 0.7 + rng() * 0.25) / segments) * Math.PI * 2;
    const r1 = r * 0.55 + rng() * r * 0.1;
    const r2 = r * 0.80 + rng() * r * 0.06;
    outerParts.push(
      `M${(cx + Math.cos(a1) * r1).toFixed(1)},${(cy + Math.sin(a1) * r1).toFixed(1)} ` +
      `L${(cx + Math.cos(a1) * r2).toFixed(1)},${(cy + Math.sin(a1) * r2).toFixed(1)} ` +
      `L${(cx + Math.cos(a2) * r2).toFixed(1)},${(cy + Math.sin(a2) * r2).toFixed(1)} ` +
      `L${(cx + Math.cos(a2) * r1).toFixed(1)},${(cy + Math.sin(a2) * r1).toFixed(1)} Z`
    );
  }

  const innerRings = 7 + Math.floor(rng() * 4);
  const inner = wavyRings(rng, cx, cy, r * 0.46, innerRings);

  return outerParts.join(' ') + ' ' + inner;
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
