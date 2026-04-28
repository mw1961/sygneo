/**
 * Algorithmic pattern generator for Sygneo Heritage Seals.
 * Each family's SHA-256 hash seeds a deterministic RNG → unique, repeatable patterns.
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

// ── Angular: Maze (recursive backtracker 8×8) ─────────────────────────────────

function mazePattern(rng: () => number, ox: number, oy: number, w: number, h: number): string {
  const COLS = 8, ROWS = 8;
  const cw = w / COLS, ch = h / ROWS;

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
  for (let r = 0; r <= ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (hW[r][c]) {
        const x1 = ox + c * cw, x2 = ox + (c + 1) * cw, y = oy + r * ch;
        segs.push(`M${x1.toFixed(1)},${y.toFixed(1)} L${x2.toFixed(1)},${y.toFixed(1)}`);
      }
    }
  }
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

// ── Organic: N-petal flower (chrysanthemum / kamon) ───────────────────────────

function organicPattern(rng: () => number, cx: number, cy: number, r: number): string {
  const N        = 6 + Math.floor(rng() * 7);        // 6–12 petals
  const petalR   = r * (0.68 + rng() * 0.16);        // tip distance
  const halfW    = petalR * (0.18 + rng() * 0.16);   // petal half-width
  const tension  = 0.48 + rng() * 0.16;              // bezier pull along axis
  const rotation = rng() * (Math.PI * 2 / N);
  const paths: string[] = [];

  for (let i = 0; i < N; i++) {
    const a    = (i / N) * Math.PI * 2 + rotation;
    const tipX = cx + Math.cos(a) * petalR;
    const tipY = cy + Math.sin(a) * petalR;
    const perp = a + Math.PI / 2;
    const axDist = petalR * tension;

    const cp1x = cx + Math.cos(a) * axDist + Math.cos(perp) * halfW;
    const cp1y = cy + Math.sin(a) * axDist + Math.sin(perp) * halfW;
    const cp2x = tipX + Math.cos(perp) * halfW * 0.28;
    const cp2y = tipY + Math.sin(perp) * halfW * 0.28;
    const cp3x = tipX - Math.cos(perp) * halfW * 0.28;
    const cp3y = tipY - Math.sin(perp) * halfW * 0.28;
    const cp4x = cx + Math.cos(a) * axDist - Math.cos(perp) * halfW;
    const cp4y = cy + Math.sin(a) * axDist - Math.sin(perp) * halfW;

    paths.push(
      `M${cx.toFixed(1)},${cy.toFixed(1)} ` +
      `C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} ` +
      `C${cp3x.toFixed(1)},${cp3y.toFixed(1)} ${cp4x.toFixed(1)},${cp4y.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)} Z`
    );
  }

  // Center circle
  const cr = r * 0.10;
  paths.push(
    `M${(cx + cr).toFixed(1)},${cy.toFixed(1)} ` +
    `A${cr.toFixed(1)},${cr.toFixed(1)} 0 1 1 ${(cx - cr).toFixed(1)},${cy.toFixed(1)} ` +
    `A${cr.toFixed(1)},${cr.toFixed(1)} 0 1 1 ${(cx + cr).toFixed(1)},${cy.toFixed(1)}`
  );

  return paths.join(' ');
}

// ── Hybrid: Gear outer ring + nested rotating polygons ────────────────────────

function hybridPattern(rng: () => number, cx: number, cy: number, r: number): string {
  // Outer gear ring
  const outerParts: string[] = [];
  const segments = 12 + Math.floor(rng() * 7);
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 0.68 + rng() * 0.22) / segments) * Math.PI * 2;
    const r1 = r * 0.56 + rng() * r * 0.08;
    const r2 = r * 0.80 + rng() * r * 0.05;
    outerParts.push(
      `M${(cx + Math.cos(a1) * r1).toFixed(1)},${(cy + Math.sin(a1) * r1).toFixed(1)} ` +
      `L${(cx + Math.cos(a1) * r2).toFixed(1)},${(cy + Math.sin(a1) * r2).toFixed(1)} ` +
      `L${(cx + Math.cos(a2) * r2).toFixed(1)},${(cy + Math.sin(a2) * r2).toFixed(1)} ` +
      `L${(cx + Math.cos(a2) * r1).toFixed(1)},${(cy + Math.sin(a2) * r1).toFixed(1)} Z`
    );
  }

  // Inner nested polygons — each ring rotated progressively
  const N       = 4 + Math.floor(rng() * 4);         // 4–7 sides
  const rings   = 3 + Math.floor(rng() * 2);          // 3–4 rings
  const baseRot = rng() * (Math.PI * 2 / N);
  const rotStep = (Math.PI / N) * (0.28 + rng() * 0.44);
  const innerParts: string[] = [];

  for (let ring = 1; ring <= rings; ring++) {
    const ringR = (ring / (rings + 0.6)) * r * 0.50;
    const rot   = baseRot + ring * rotStep;
    const pts: string[] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + rot;
      pts.push(`${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * ringR).toFixed(1)},${(cy + Math.sin(a) * ringR).toFixed(1)}`);
    }
    innerParts.push(pts.join(' ') + ' Z');
  }

  // Small center dot
  const cr = r * 0.07;
  innerParts.push(
    `M${(cx + cr).toFixed(1)},${cy.toFixed(1)} ` +
    `A${cr.toFixed(1)},${cr.toFixed(1)} 0 1 1 ${(cx - cr).toFixed(1)},${cy.toFixed(1)} ` +
    `A${cr.toFixed(1)},${cr.toFixed(1)} 0 1 1 ${(cx + cr).toFixed(1)},${cy.toFixed(1)}`
  );

  return [...outerParts, ...innerParts].join(' ');
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
  // variant rotates the hash to produce a completely different seed
  const shift = (variant * 7) % (hash.length - 8);
  const rotated = hash.slice(shift) + hash.slice(0, shift);
  const offset = pattern === 'angular' ? 0 : pattern === 'organic' ? 16 : 32;
  const rng = seedRNG(rotated.slice(offset, offset + 8) + rotated.slice(0, offset));

  let innerPaths = '';

  if (pattern === 'angular') {
    const m = 24;
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
    <path d="${innerPaths}" stroke="${color}" fill="none" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
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
