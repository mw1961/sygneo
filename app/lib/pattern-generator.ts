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

// ── Organic: Tilted elliptical topographic rings (no two rings identical) ────

function organicPattern(rng: () => number, cx: number, cy: number, r: number): string {
  const paths: string[] = [];
  const rings = 5 + Math.floor(rng() * 3);
  const PTS   = 72;
  const gap   = (r * 0.92) / (rings + 1);

  // Whole pattern shifts slightly off-center — outer rings drift less
  const driftX = (rng() - 0.5) * r * 0.18;
  const driftY = (rng() - 0.5) * r * 0.18;

  for (let ring = 1; ring <= rings; ring++) {
    const t      = ring / (rings + 1);
    const baseR  = t * r * 0.92;
    const amp    = gap * (0.22 + rng() * 0.28);
    const freq1  = 2 + Math.floor(rng() * 4);
    const freq2  = 1 + Math.floor(rng() * 3);
    const ph1    = rng() * Math.PI * 2;
    const ph2    = rng() * Math.PI * 2;
    // Each ring: unique ellipse aspect + tilt
    const aspect = 0.72 + rng() * 0.56;   // 0.72–1.28
    const tilt   = rng() * Math.PI;
    // Center drifts inward as rings shrink
    const rcx = cx + driftX * (1 - t);
    const rcy = cy + driftY * (1 - t);

    const pts: [number, number][] = [];
    for (let i = 0; i < PTS; i++) {
      const a    = (i / PTS) * Math.PI * 2;
      const wave = Math.sin(a * freq1 + ph1) * amp * 0.65
                 + Math.sin(a * freq2 + ph2) * amp * 0.35;
      const pr   = baseR + wave;
      // Ellipse + tilt
      const ex   =  Math.cos(a) * pr;
      const ey   =  Math.sin(a) * pr * aspect;
      pts.push([
        rcx + ex * Math.cos(tilt) - ey * Math.sin(tilt),
        rcy + ex * Math.sin(tilt) + ey * Math.cos(tilt),
      ]);
    }

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
    paths.push(d + ' Z');
  }
  return paths.join(' ');
}

// ── Hybrid: Gear outer ring + radial spokes inner (compass / lantern) ────────

function hybridPattern(rng: () => number, cx: number, cy: number, r: number): string {
  // Outer gear segments
  const outerParts: string[] = [];
  const segments = 12 + Math.floor(rng() * 6);
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2;
    const a2 = ((i + 0.72 + rng() * 0.2) / segments) * Math.PI * 2;
    const r1 = r * 0.56 + rng() * r * 0.08;
    const r2 = r * 0.80 + rng() * r * 0.05;
    outerParts.push(
      `M${(cx + Math.cos(a1) * r1).toFixed(1)},${(cy + Math.sin(a1) * r1).toFixed(1)} ` +
      `L${(cx + Math.cos(a1) * r2).toFixed(1)},${(cy + Math.sin(a1) * r2).toFixed(1)} ` +
      `L${(cx + Math.cos(a2) * r2).toFixed(1)},${(cy + Math.sin(a2) * r2).toFixed(1)} ` +
      `L${(cx + Math.cos(a2) * r1).toFixed(1)},${(cy + Math.sin(a2) * r1).toFixed(1)} Z`
    );
  }

  // Inner radial spokes — alternating long/short, slight curve
  const innerParts: string[] = [];
  const spokes = 16 + Math.floor(rng() * 9); // 16–24 spokes
  const innerStart = r * 0.08;
  const longR  = r * 0.48;
  const shortR = r * 0.30 + rng() * r * 0.08;
  const curveMag = r * 0.07;

  for (let i = 0; i < spokes; i++) {
    const a    = (i / spokes) * Math.PI * 2;
    const tipR = i % 2 === 0 ? longR : shortR;
    const sx   = cx + Math.cos(a) * innerStart;
    const sy   = cy + Math.sin(a) * innerStart;
    const ex   = cx + Math.cos(a) * tipR;
    const ey   = cy + Math.sin(a) * tipR;
    // Slight perpendicular curve — direction alternates per spoke
    const perp = a + Math.PI / 2;
    const side = (rng() - 0.5) * 2 > 0 ? 1 : -1;
    const mid  = tipR * 0.55;
    const cpx  = cx + Math.cos(a) * mid + Math.cos(perp) * curveMag * side;
    const cpy  = cy + Math.sin(a) * mid + Math.sin(perp) * curveMag * side;
    innerParts.push(
      `M${sx.toFixed(1)},${sy.toFixed(1)} Q${cpx.toFixed(1)},${cpy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`
    );
  }

  // Small center circle
  innerParts.push(`M${(cx + r * 0.08).toFixed(1)},${cy.toFixed(1)} A${(r * 0.08).toFixed(1)},${(r * 0.08).toFixed(1)} 0 1 1 ${(cx - r * 0.08).toFixed(1)},${cy.toFixed(1)} A${(r * 0.08).toFixed(1)},${(r * 0.08).toFixed(1)} 0 1 1 ${(cx + r * 0.08).toFixed(1)},${cy.toFixed(1)}`);

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
