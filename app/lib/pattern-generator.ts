/**
 * Algorithmic pattern generator for Sygneo Heritage Seals.
 * Hash-seeded RNG → deterministic, unique patterns per family.
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

  const hW  = Array.from({ length: ROWS + 1 }, () => Array(COLS).fill(true));
  const vW  = Array.from({ length: ROWS },     () => Array(COLS + 1).fill(true));
  const vis = Array.from({ length: ROWS },     () => Array(COLS).fill(false));

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
  for (let r = 0; r <= ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (hW[r][c]) segs.push(`M${(ox+c*cw).toFixed(1)},${(oy+r*ch).toFixed(1)} L${(ox+(c+1)*cw).toFixed(1)},${(oy+r*ch).toFixed(1)}`);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS; c++)
      if (vW[r][c]) segs.push(`M${(ox+c*cw).toFixed(1)},${(oy+r*ch).toFixed(1)} L${(ox+c*cw).toFixed(1)},${(oy+(r+1)*ch).toFixed(1)}`);
  return segs.join(' ');
}

// ── Organic: Archimedean spiral (single bold continuous line) ─────────────────

function spiralPattern(rng: () => number, cx: number, cy: number, r: number): string {
  const turns     = 2.8 + rng() * 1.6;             // 2.8–4.4 turns
  const total     = turns * Math.PI * 2;
  const startR    = r * 0.06;
  const growth    = (r * 0.83 - startR) / total;
  const freq      = 3 + Math.floor(rng() * 4);      // perturbation frequency
  const amp       = r * 0.020;                       // gentle wobble
  const phase     = rng() * Math.PI * 2;

  const steps = Math.ceil(total / 0.035);
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a  = (i / steps) * total;
    const pr = startR + growth * a + Math.sin(a * freq + phase) * amp;
    pts.push(`${(cx + Math.cos(a) * pr).toFixed(1)},${(cy + Math.sin(a) * pr).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

// ── Hybrid: Mandala wheel (concentric rings + radial spokes) ──────────────────

function mandalaPattern(rng: () => number, cx: number, cy: number, r: number): string {
  const paths: string[] = [];
  const rings  = 3 + Math.floor(rng() * 2);         // 3–4 concentric rings
  const spokes = 6 + Math.floor(rng() * 6);          // 6–11 radial spokes
  const rot    = (rng() * Math.PI * 2) / spokes;

  const maxR = r * 0.82;
  const minR = maxR / (rings + 0.5);

  // Concentric circles
  for (let ring = 1; ring <= rings; ring++) {
    const rr = (ring / rings) * maxR;
    paths.push(
      `M${(cx + rr).toFixed(1)},${cy.toFixed(1)} ` +
      `A${rr.toFixed(1)},${rr.toFixed(1)} 0 1 1 ${(cx - rr).toFixed(1)},${cy.toFixed(1)} ` +
      `A${rr.toFixed(1)},${rr.toFixed(1)} 0 1 1 ${(cx + rr).toFixed(1)},${cy.toFixed(1)}`
    );
  }

  // Radial spokes (from innermost ring to outermost)
  for (let s = 0; s < spokes; s++) {
    const a = (s / spokes) * Math.PI * 2 + rot;
    paths.push(
      `M${(cx + Math.cos(a) * minR).toFixed(1)},${(cy + Math.sin(a) * minR).toFixed(1)} ` +
      `L${(cx + Math.cos(a) * maxR).toFixed(1)},${(cy + Math.sin(a) * maxR).toFixed(1)}`
    );
  }

  // Alternating arc fill in outermost ring sectors
  const outerR = maxR;
  const midR   = outerR * (1 - 1 / rings);
  for (let s = 0; s < spokes; s += 2) {
    const a1 = (s / spokes) * Math.PI * 2 + rot;
    const a2 = ((s + 1) / spokes) * Math.PI * 2 + rot;
    paths.push(
      `M${(cx + Math.cos(a1) * midR).toFixed(1)},${(cy + Math.sin(a1) * midR).toFixed(1)} ` +
      `A${midR.toFixed(1)},${midR.toFixed(1)} 0 0 1 ${(cx + Math.cos(a2) * midR).toFixed(1)},${(cy + Math.sin(a2) * midR).toFixed(1)}`
    );
  }

  // Center dot
  const cr = minR * 0.45;
  paths.push(
    `M${(cx + cr).toFixed(1)},${cy.toFixed(1)} ` +
    `A${cr.toFixed(1)},${cr.toFixed(1)} 0 1 1 ${(cx - cr).toFixed(1)},${cy.toFixed(1)} ` +
    `A${cr.toFixed(1)},${cr.toFixed(1)} 0 1 1 ${(cx + cr).toFixed(1)},${cy.toFixed(1)}`
  );

  return paths.join(' ');
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
    innerPaths = spiralPattern(rng, 100, 100, 78);
  } else {
    innerPaths = mandalaPattern(rng, 100, 100, 78);
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

export function renderAllFour(hash: string, color: string, variant = 0): {
  pattern: PatternType; shape: ShapeType; svg: string;
}[] {
  const patterns: PatternType[] = ['angular', 'organic'];
  const shapes:   ShapeType[]   = ['circle',  'square'];
  const results: { pattern: PatternType; shape: ShapeType; svg: string }[] = [];

  for (const shape of shapes) {
    for (const pattern of patterns) {
      results.push({ pattern, shape, svg: renderSeal(hash, pattern, shape, color, variant) });
    }
  }
  return results;
}
