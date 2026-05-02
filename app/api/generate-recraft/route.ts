import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SVG_SYSTEM, BATCH_VOCABULARY } from '@/app/lib/seal-prompt';

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Fallback SVGs — clean geometric, no banned elements ──────────────────────

function fallbackSvg(i: number): string {
  const defs = [
    {
      border: `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`,
      inner:  `<circle cx="150" cy="150" r="80" fill="none" stroke="black" stroke-width="9"/><circle cx="150" cy="150" r="40" fill="none" stroke="black" stroke-width="9"/><circle cx="150" cy="150" r="12" fill="black"/>`,
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
      inner:  `<circle cx="150" cy="150" r="75" fill="none" stroke="black" stroke-width="9"/><circle cx="150" cy="150" r="40" fill="none" stroke="black" stroke-width="9"/><circle cx="150" cy="150" r="12" fill="black"/>`,
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
    const { origin, occupation, values, style, variant = 0 } = await request.json();

    const batchInstruction = BATCH_VOCABULARY[variant % BATCH_VOCABULARY.length];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SVG_SYSTEM,
      messages: [{
        role: 'user',
        content: `Origin: ${Array.isArray(origin) ? origin.join(', ') : origin}\nOccupation: ${Array.isArray(occupation) ? occupation.join(', ') : occupation}\nValues: ${Array.isArray(values) ? values.join(', ') : values}\nStyle: ${style}\n\n${batchInstruction}`,
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
      // Off-center isolated circles (lollipop / balloon shapes)
      for (const [circleTag] of svg.matchAll(/<circle[^>]+>/gi)) {
        const cx = parseFloat(circleTag.match(/cx="([\d.]+)"/)?.[1] ?? '150');
        const cy = parseFloat(circleTag.match(/cy="([\d.]+)"/)?.[1] ?? '150');
        const r  = parseFloat(circleTag.match(/\br="([\d.]+)"/)?.[1] ?? '150');
        const distFromCenter = Math.sqrt((cx - 150) ** 2 + (cy - 150) ** 2);
        // Small circle far from center = decoration dot is fine, but medium circle = lollipop
        if (distFromCenter > 35 && r > 15 && r < 80) {
          console.warn(`SVG ${i} off-center isolated circle (lollipop) — fallback`);
          return fallbackSvg(i);
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
