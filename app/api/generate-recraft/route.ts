import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SVG_SYSTEM, VARIETY_HINTS } from '@/app/lib/seal-prompt';
import { generateMazeSvg } from '@/app/lib/maze-generator';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fallbackSvg(i: number): string {
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
  ];
  const d = defs[i % defs.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="white"/>${d.border}${d.inner}</svg>`;
}

function segmentPassesThroughCenter(x1: number, y1: number, x2: number, y2: number): boolean {
  const cx = 150, cy = 150, tol = 5;
  const dx = x2-x1, dy = y2-y1, lenSq = dx*dx+dy*dy;
  if (lenSq < 1) return false;
  const t = Math.max(0, Math.min(1, ((cx-x1)*dx+(cy-y1)*dy)/lenSq));
  return Math.abs(x1+t*dx-cx) < tol && Math.abs(y1+t*dy-cy) < tol;
}

function validateSvg(svg: string, i: number): string {
  // Text elements — absolutely forbidden
  if (/<text[\s>]/i.test(svg) || /<tspan/i.test(svg) || /font-/i.test(svg)) { console.warn(`SVG ${i} text element`); return fallbackSvg(i); }
  if (/<polygon/i.test(svg) || /<polyline/i.test(svg)) { console.warn(`SVG ${i} polygon`); return fallbackSvg(i); }
  if (/M[\d\s.,]+L[\d\s.,]+L[\d\s.,]+Z/i.test(svg.replace(/\s+/g, ' '))) { console.warn(`SVG ${i} triangle`); return fallbackSvg(i); }

  for (const [tag] of svg.matchAll(/<line[^>]+>/gi)) {
    const x1 = parseFloat(tag.match(/x1="([\d.]+)"/)?.[1] ?? '0');
    const y1 = parseFloat(tag.match(/y1="([\d.]+)"/)?.[1] ?? '0');
    const x2 = parseFloat(tag.match(/x2="([\d.]+)"/)?.[1] ?? '0');
    const y2 = parseFloat(tag.match(/y2="([\d.]+)"/)?.[1] ?? '0');
    if (segmentPassesThroughCenter(x1, y1, x2, y2)) { console.warn(`SVG ${i} crosshair`); return fallbackSvg(i); }
  }

  const circles = [...svg.matchAll(/<circle[^>]+>/gi)].map(m => {
    const tag = m[0];
    return { cx: parseFloat(tag.match(/cx="([\d.]+)"/)?.[1] ?? '150'), cy: parseFloat(tag.match(/cy="([\d.]+)"/)?.[1] ?? '150'), r: parseFloat(tag.match(/\br="([\d.]+)"/)?.[1] ?? '0'), fill: tag.match(/fill="([^"]+)"/)?.[1] ?? 'none' };
  });
  const centeredRings = circles.filter(c => Math.hypot(c.cx-150, c.cy-150) < 5 && c.fill !== 'black').length;
  if (centeredRings >= 2 && circles.some(c => Math.hypot(c.cx-150, c.cy-150) < 5 && c.fill === 'black' && c.r < 25)) { console.warn(`SVG ${i} bullseye`); return fallbackSvg(i); }

  for (const [tag] of svg.matchAll(/<circle[^>]+>/gi)) {
    const cx = parseFloat(tag.match(/cx="([\d.]+)"/)?.[1] ?? '150');
    const cy = parseFloat(tag.match(/cy="([\d.]+)"/)?.[1] ?? '150');
    const r  = parseFloat(tag.match(/\br="([\d.]+)"/)?.[1] ?? '0');
    const fill = tag.match(/fill="([^"]+)"/)?.[1] ?? 'none';
    const dist = Math.hypot(cx-150, cy-150);
    if (dist > 35 && r > 15 && r < 80) { console.warn(`SVG ${i} lollipop`); return fallbackSvg(i); }
    if (fill === 'black' && dist > 20 && r < 20) { console.warn(`SVG ${i} off-center dot`); return fallbackSvg(i); }
  }

  for (const [tag] of svg.matchAll(/<rect[^>]+>/gi)) {
    const w = parseFloat(tag.match(/width="([\d.]+)"/)?.[1] ?? '0');
    const h = parseFloat(tag.match(/height="([\d.]+)"/)?.[1] ?? '0');
    const x = parseFloat(tag.match(/\bx="([\d.]+)"/)?.[1] ?? '150');
    const y = parseFloat(tag.match(/\by="([\d.]+)"/)?.[1] ?? '150');
    if (/transform="rotate/.test(tag) && w > 0 && h > 0) {
      const cx = x+w/2, cy = y+h/2;
      if (Math.hypot(cx-150, cy-150) + Math.hypot(w/2, h/2) > 120) { console.warn(`SVG ${i} rect out of bounds`); return fallbackSvg(i); }
    } else if (w > 0 && h > 0 && (x < 30 || y < 30 || x+w > 270 || y+h > 270)) { console.warn(`SVG ${i} rect oob`); return fallbackSvg(i); }
  }

  const rects3 = [...svg.matchAll(/<rect[^>]+transform="rotate/gi)].length;
  if (rects3 >= 3) { console.warn(`SVG ${i} 3+ rotated rects`); return fallbackSvg(i); }

  // Thin-only
  const circleCount = [...svg.matchAll(/<circle/gi)].length;
  const pathCount   = [...svg.matchAll(/<path/gi)].length;
  const rectCount   = [...svg.matchAll(/<rect/gi)].length;
  if (circleCount >= 3 && rectCount === 0) {
    const paths = [...svg.matchAll(/d="([^"]+)"/gi)];
    if (!paths.some(([,d]) => d.length > 60)) { console.warn(`SVG ${i} thin-only`); return fallbackSvg(i); }
  }

  return svg;
}

const VARIETY_HINTS = [
  `For SVGs 1-4: SVG1=bold arcs or Celtic spiral, SVG2=nested rotated squares, SVG3=radial tick marks, SVG4=synthesis ring+rect.`,
  `For SVGs 1-4: SVG1=concentric rings varied spacing, SVG2=cultural octagon path, SVG3=bold crescent arc, SVG4=synthesis.`,
  `For SVGs 1-4: SVG1=Celtic triple arc, SVG2=double rotated squares, SVG3=radial spokes, SVG4=synthesis.`,
  `For SVGs 1-4: SVG1=single bold arc 240°, SVG2=nested squares 0° and 45°, SVG3=8 tick marks in ring, SVG4=synthesis.`,
];

export async function POST(request: NextRequest) {
  try {
    const { origin, occupation, values, variant = 0, usedShapes = '' } = await request.json();

    const originStr     = Array.isArray(origin)     ? origin.join(', ')     : origin;
    const occupationStr = Array.isArray(occupation) ? occupation.join(', ') : occupation;
    const valuesStr     = Array.isArray(values)     ? values.join(', ')     : values;

    const varietyHint = VARIETY_HINTS[variant % VARIETY_HINTS.length];

    const messages: { role: 'user' | 'assistant'; content: string }[] = [];

    if (usedShapes) {
      // Multi-turn: show Claude what was already generated, then ask for different designs
      messages.push({ role: 'user', content: `Origin: ${originStr}\nOccupation: ${occupationStr}\nValues: ${valuesStr}\n\n${varietyHint}` });
      messages.push({ role: 'assistant', content: `I already generated these designs (shapes used: ${usedShapes}). Now I will create 4 completely different compositions using different shape families.` });
      messages.push({ role: 'user', content: `Correct. Now generate 4 new SVGs using DIFFERENT shapes from what was already shown. ${varietyHint}` });
    } else {
      messages.push({ role: 'user', content: `Origin: ${originStr}\nOccupation: ${occupationStr}\nValues: ${valuesStr}\n\n${varietyHint}` });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 7000,
      system: SVG_SYSTEM,
      messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*"svgs"[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]) as { svgs?: string[] };
    if (!parsed.svgs?.length) throw new Error('No SVGs');

    // Validate SVGs 1-4 from Claude
    const claudeSvgs = parsed.svgs.slice(0, 4).map((svg, i) => validateSvg(svg, i));

    // SVGs 5-6: programmatic maze (deterministic, always valid, always different per batch)
    const maze1 = generateMazeSvg(variant * 100 + 5);
    const maze2 = generateMazeSvg(variant * 100 + 99);

    const allSvgs = [...claudeSvgs, maze1, maze2];
    const seals = allSvgs.map((svg, i) => ({ variant: i, svg, imageUrl: null, error: null }));
    return NextResponse.json({ seals });

  } catch (err) {
    console.error('generate-seal:', err);
    const seals = [0,1,2,3].map(i => ({ variant: i, imageUrl: null, error: null, svg: fallbackSvg(i) }));
    const maze1 = generateMazeSvg(5);
    const maze2 = generateMazeSvg(99);
    return NextResponse.json({ seals: [...seals, { variant: 4, svg: maze1, imageUrl: null, error: null }, { variant: 5, svg: maze2, imageUrl: null, error: null }] });
  }
}
