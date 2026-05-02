import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SVG_SYSTEM, BATCH_VOCABULARY } from '@/app/lib/seal-prompt';

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Fallback SVGs — clean geometric, no banned elements ──────────────────────

function fallbackSvg(i: number): string {
  const mazePath = `M 48 48 L 48 80 L 80 80  M 115 42 L 115 74 L 147 74  M 178 48 L 210 48 L 210 80  M 245 48 L 245 80 L 213 80  M 42 110 L 74 110 L 74 142  M 115 108 L 115 140  M 178 108 L 210 108 L 210 140 L 178 140  M 245 110 L 213 110  M 48 175 L 48 207 L 80 207  M 115 175 L 147 175 L 147 207  M 178 178 L 178 210  M 242 175 L 242 207 L 210 207  M 52 242 L 84 242  M 115 240 L 115 255 L 147 255 L 147 240  M 180 242 L 212 242 L 212 255  M 245 240 L 245 255`;
  const defs = [
    {
      border: `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`,
      inner:  `<circle cx="150" cy="150" r="80" fill="none" stroke="black" stroke-width="9"/><rect x="110" y="110" width="80" height="80" fill="none" stroke="black" stroke-width="9" transform="rotate(45 150 150)"/>`,
    },
    {
      border: `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`,
      inner:  `<rect x="65" y="65" width="170" height="170" fill="none" stroke="black" stroke-width="9" transform="rotate(45 150 150)"/><circle cx="150" cy="150" r="45" fill="none" stroke="black" stroke-width="9"/>`,
    },
    {
      border: `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`,
      inner:  `<circle cx="150" cy="150" r="90" fill="none" stroke="black" stroke-width="9"/><rect x="100" y="100" width="100" height="100" fill="none" stroke="black" stroke-width="9" transform="rotate(45 150 150)"/>`,
    },
    {
      border: `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`,
      inner:  `<circle cx="150" cy="150" r="85" fill="none" stroke="black" stroke-width="9"/><rect x="115" y="115" width="70" height="70" fill="none" stroke="black" stroke-width="9"/>`,
    },
    {
      border: `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`,
      inner:  `<path d="${mazePath}" fill="none" stroke="black" stroke-width="11"/>`,
    },
    {
      border: `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`,
      inner:  `<path d="${mazePath}" fill="none" stroke="black" stroke-width="11"/>`,
    },
  ];
  const d = defs[i % defs.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="white"/>${d.border}${d.inner}</svg>`;
}

// Returns true if line segment (x1,y1)→(x2,y2) passes through (150,150) within 5px tolerance
function segmentPassesThroughCenter(x1: number, y1: number, x2: number, y2: number): boolean {
  const cx = 150, cy = 150, tol = 5;
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1) return false;
  const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
  const nearX = x1 + t * dx, nearY = y1 + t * dy;
  return Math.abs(nearX - cx) < tol && Math.abs(nearY - cy) < tol;
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { origin, occupation, values, variant = 0 } = await request.json();

    const batchInstruction = BATCH_VOCABULARY[variant % BATCH_VOCABULARY.length];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6144,
      system: SVG_SYSTEM,
      messages: [{
        role: 'user',
        content: `Origin: ${Array.isArray(origin) ? origin.join(', ') : origin}\nOccupation: ${Array.isArray(occupation) ? occupation.join(', ') : occupation}\nValues: ${Array.isArray(values) ? values.join(', ') : values}\n\n${batchInstruction}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*"svgs"[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as { svgs?: string[] };
    if (!parsed.svgs?.length) throw new Error('No SVGs');

    // Code-level validation: replace any SVG that violates production rules
    const validated = parsed.svgs.map((svg, i) => {
      // Banned elements
      if (/<polygon/i.test(svg) || /<polyline/i.test(svg)) {
        console.warn(`SVG ${i} banned polygon/polyline — fallback`);
        return fallbackSvg(i);
      }
      // Triangle paths: M ... L ... L ... Z (exactly 3 vertices)
      if (/M[\d\s.,]+L[\d\s.,]+L[\d\s.,]+Z/i.test(svg.replace(/\s+/g, ' '))) {
        console.warn(`SVG ${i} triangle path — fallback`);
        return fallbackSvg(i);
      }
      // Lines passing through center (150,150) — proper segment intersection check
      for (const [lineTag] of svg.matchAll(/<line[^>]+>/gi)) {
        const x1 = parseFloat(lineTag.match(/x1="([\d.]+)"/)?.[1] ?? '0');
        const y1 = parseFloat(lineTag.match(/y1="([\d.]+)"/)?.[1] ?? '0');
        const x2 = parseFloat(lineTag.match(/x2="([\d.]+)"/)?.[1] ?? '0');
        const y2 = parseFloat(lineTag.match(/y2="([\d.]+)"/)?.[1] ?? '0');
        if (segmentPassesThroughCenter(x1, y1, x2, y2)) {
          console.warn(`SVG ${i} line through center — fallback`);
          return fallbackSvg(i);
        }
      }
      // Off-center circles and filled dots
      for (const [circleTag] of svg.matchAll(/<circle[^>]+>/gi)) {
        const cx   = parseFloat(circleTag.match(/cx="([\d.]+)"/)?.[1] ?? '150');
        const cy   = parseFloat(circleTag.match(/cy="([\d.]+)"/)?.[1] ?? '150');
        const r    = parseFloat(circleTag.match(/\br="([\d.]+)"/)?.[1] ?? '150');
        const fill = circleTag.match(/fill="([^"]+)"/)?.[1] ?? 'none';
        const dist = Math.sqrt((cx - 150) ** 2 + (cy - 150) ** 2);
        // Medium circle far from center = lollipop
        if (dist > 35 && r > 15 && r < 80) {
          console.warn(`SVG ${i} off-center circle (lollipop) — fallback`);
          return fallbackSvg(i);
        }
        // Filled dot off-center = eye effect
        if (fill === 'black' && dist > 20 && r < 20) {
          console.warn(`SVG ${i} off-center filled dot (eye) — fallback`);
          return fallbackSvg(i);
        }
      }
      // Bullseye: 2+ concentric circles at center + a filled dot at center = weapon target
      const allCircles = [...svg.matchAll(/<circle[^>]+>/gi)].map(m => {
        const tag  = m[0];
        const cx   = parseFloat(tag.match(/cx="([\d.]+)"/)?.[1] ?? '150');
        const cy   = parseFloat(tag.match(/cy="([\d.]+)"/)?.[1] ?? '150');
        const r    = parseFloat(tag.match(/\br="([\d.]+)"/)?.[1] ?? '0');
        const fill = tag.match(/fill="([^"]+)"/)?.[1] ?? 'none';
        return { cx, cy, r, fill };
      });
      const centeredRings = allCircles.filter(c => Math.sqrt((c.cx-150)**2+(c.cy-150)**2) < 5 && c.fill !== 'black').length;
      const centeredDot   = allCircles.some(c => Math.sqrt((c.cx-150)**2+(c.cy-150)**2) < 5 && c.fill === 'black' && c.r < 25);
      if (centeredRings >= 2 && centeredDot) {
        console.warn(`SVG ${i} bullseye pattern — fallback`);
        return fallbackSvg(i);
      }
      // Overlapping rotated rects: if 3+ rects share the same center with different rotations → crossing
      const rects = [...svg.matchAll(/<rect[^>]+transform="rotate\((\d+)[^"]*\)"[^>]*>/gi)].map(m => {
        const angle = parseFloat(m[1]);
        const w = parseFloat(m[0].match(/width="([\d.]+)"/)?.[1] ?? '0');
        const h = parseFloat(m[0].match(/height="([\d.]+)"/)?.[1] ?? '0');
        return { angle, w, h };
      });
      if (rects.length >= 3) {
        console.warn(`SVG ${i} 3+ rotated rects (overlapping) — fallback`);
        return fallbackSvg(i);
      }
      // X shape: detect multi-segment paths where two segments cross center
      const pathSegs = [...svg.matchAll(/d="([^"]+)"/gi)];
      for (const [, d] of pathSegs) {
        const moves = [...d.matchAll(/M\s*([\d.]+)\s+([\d.]+)\s+L\s*([\d.]+)\s+([\d.]+)/gi)];
        if (moves.length >= 2) {
          const crosses = moves.filter(([,x1,y1,x2,y2]) =>
            segmentPassesThroughCenter(+x1, +y1, +x2, +y2)
          );
          if (crosses.length >= 2) {
            console.warn(`SVG ${i} X/cross path — fallback`);
            return fallbackSvg(i);
          }
        }
      }
      return svg;
    });

    const seals = validated.map((svg, i) => ({ variant: i, svg, imageUrl: null, error: null }));
    return NextResponse.json({ seals });

  } catch (err) {
    console.error('generate-seal:', err);
    const seals = [0, 1, 2, 3].map(i => ({ variant: i, imageUrl: null, error: null, svg: fallbackSvg(i) }));
    return NextResponse.json({ seals });
  }
}
