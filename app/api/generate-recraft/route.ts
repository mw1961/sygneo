import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildUserMessage, fontSpec } from '@/app/lib/seal-prompt';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fallbackSvg(shape: 'circle' | 'square', i: number): string {
  const border = shape === 'circle'
    ? `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`
    : `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`;
  const inners = [
    `<circle cx="150" cy="150" r="78" fill="none" stroke="black" stroke-width="10"/>`,
    `<rect x="110" y="110" width="80" height="80" fill="none" stroke="black" stroke-width="10" transform="rotate(45 150 150)"/>`,
    `<circle cx="150" cy="150" r="90" fill="none" stroke="black" stroke-width="10"/><circle cx="150" cy="150" r="62" fill="none" stroke="black" stroke-width="10"/>`,
    `<rect x="36" y="36" width="228" height="228" fill="none" stroke="black" stroke-width="10"/>`,
    `<rect x="36" y="36" width="228" height="228" fill="none" stroke="black" stroke-width="10"/><rect x="68" y="68" width="164" height="164" fill="none" stroke="black" stroke-width="10"/>`,
    `<rect x="40" y="40" width="220" height="220" fill="none" stroke="black" stroke-width="10"/><circle cx="150" cy="150" r="78" fill="none" stroke="black" stroke-width="10"/>`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="white"/>${border}${inners[i % inners.length]}</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function injectInitial(svg: string, initial: string, language: string): string {
  if (!initial.trim()) return svg;
  const font    = fontSpec(language);
  const char    = initial.trim();
  const escaped = escapeXml(char);

  // Remove any prior text elements
  let s = svg.replace(/<text[\s\S]*?<\/text>/gi, '');

  const svgTagMatch = s.match(/^(<svg[^>]*>)/);
  if (!svgTagMatch) return svg;
  const svgTag = svgTagMatch[1];
  const bgRect = '<rect width="300" height="300" fill="white"/>';

  // SVG mask: white = show background, black letterform = cut background out
  // stroke-width="14" gives a 7px safety buffer around every pixel of the letter
  const defs =
    `<defs><mask id="lm">` +
    `<rect width="300" height="300" fill="white"/>` +
    `<text x="150" y="150" dy=".35em" font-family="${font}" font-size="56" text-anchor="middle"` +
    ` fill="black" stroke="black" stroke-width="14" stroke-linejoin="round">${escaped}</text>` +
    `</mask></defs>`;

  // Visible letter drawn on top of the masked group — clean, unobstructed
  const letter =
    `<text x="150" y="150" dy=".35em" font-family="${font}" font-size="56"` +
    ` text-anchor="middle" fill="black">${escaped}</text>`;

  // Extract inner content (strip svg tag, bg rect, closing tag)
  const inner = s.replace(svgTag, '').replace(bgRect, '').replace('</svg>', '').trim();

  // Reconstruct: svgTag + defs + bgRect + masked-group + letter + /svg
  return `${svgTag}${defs}${bgRect}<g mask="url(#lm)">${inner}</g>${letter}</svg>`;
}

// Returns true if all inner shapes are within the safe zone
function checkBounds(svg: string, shape: 'circle' | 'square'): boolean {
  // Check circle elements
  for (const [tag] of svg.matchAll(/<circle[^>]+>/gi)) {
    const cx = parseFloat(tag.match(/cx="([\d.]+)"/)?.[1] ?? '150');
    const cy = parseFloat(tag.match(/cy="([\d.]+)"/)?.[1] ?? '150');
    const r  = parseFloat(tag.match(/\br="([\d.]+)"/)?.[1] ?? '0');
    if (r >= 125) continue; // skip the border
    if (shape === 'circle') {
      if (Math.hypot(cx - 150, cy - 150) + r > 108) return false;
    } else {
      if (cx - r < 30 || cx + r > 270 || cy - r < 30 || cy + r > 270) return false;
    }
  }
  // Check rect elements (non-rotated — rotated rects are harder to validate exactly)
  for (const [tag] of svg.matchAll(/<rect[^>]+>/gi)) {
    const x = parseFloat(tag.match(/\bx="([\d.]+)"/)?.[1] ?? '0');
    const y = parseFloat(tag.match(/\by="([\d.]+)"/)?.[1] ?? '0');
    const w = parseFloat(tag.match(/width="([\d.]+)"/)?.[1] ?? '0');
    const h = parseFloat(tag.match(/height="([\d.]+)"/)?.[1] ?? '0');
    if (w >= 260) continue; // skip the border and background
    if (/transform="rotate/.test(tag)) {
      // For rotated rects: check corner distance from center
      const halfDiag = Math.hypot(w / 2, h / 2);
      const cx = x + w / 2, cy = y + h / 2;
      if (shape === 'circle' && Math.hypot(cx - 150, cy - 150) + halfDiag > 112) return false;
    } else {
      if (shape === 'square' && (x < 28 || y < 28 || x + w > 272 || y + h > 272)) return false;
      if (shape === 'circle') {
        // Approximate: check all four corners
        for (const [px, py] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]] as [number,number][]) {
          if (Math.hypot(px - 150, py - 150) > 112) return false;
        }
      }
    }
  }
  // Check line endpoints
  for (const [tag] of svg.matchAll(/<line[^>]+>/gi)) {
    const x1 = parseFloat(tag.match(/x1="([\d.]+)"/)?.[1] ?? '150');
    const y1 = parseFloat(tag.match(/y1="([\d.]+)"/)?.[1] ?? '150');
    const x2 = parseFloat(tag.match(/x2="([\d.]+)"/)?.[1] ?? '150');
    const y2 = parseFloat(tag.match(/y2="([\d.]+)"/)?.[1] ?? '150');
    if (shape === 'circle') {
      if (Math.hypot(x1 - 150, y1 - 150) > 112 || Math.hypot(x2 - 150, y2 - 150) > 112) return false;
    } else {
      if (x1 < 28 || x1 > 272 || y1 < 28 || y1 > 272) return false;
      if (x2 < 28 || x2 > 272 || y2 < 28 || y2 > 272) return false;
    }
  }
  return true;
}

function validateSvg(svg: string, shape: 'circle' | 'square', i: number): string {
  if (/<tspan/i.test(svg))                               { console.warn(`${shape}${i} tspan`);        return fallbackSvg(shape, i); }
  if (/<polygon/i.test(svg) || /<polyline/i.test(svg))   { console.warn(`${shape}${i} poly`);         return fallbackSvg(shape, i); }

  if (shape === 'circle' && !/<circle cx="150" cy="150" r="132"/.test(svg))      { console.warn(`${shape}${i} no circle border`); return fallbackSvg(shape, i); }
  if (shape === 'square' && !/<rect x="18" y="18" width="264" height="264"/.test(svg)) { console.warn(`${shape}${i} no square border`); return fallbackSvg(shape, i); }

  const swVals = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(m => parseFloat(m[1]));
  if (swVals.some(sw => sw < 6)) { console.warn(`${shape}${i} thin stroke`); return fallbackSvg(shape, i); }

  if (!checkBounds(svg, shape)) { console.warn(`${shape}${i} out of bounds`); return fallbackSvg(shape, i); }

  return svg;
}

interface Params {
  origin: string; occupation: string; values: string;
  lineage: string; language: string; initial: string;
}

async function generateBatch(shape: 'circle' | 'square', params: Params): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 5000,
      system:     buildSystemPrompt(shape),
      messages:   [{ role: 'user', content: buildUserMessage(params) }],
    });

    const text      = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*"svgs"[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON from ${shape} batch`);

    const parsed = JSON.parse(jsonMatch[0]) as { svgs?: string[] };
    if (!parsed.svgs?.length) throw new Error(`Empty SVGs from ${shape} batch`);

    return parsed.svgs
      .slice(0, 6)
      .map((svg, i) => injectInitial(validateSvg(svg, shape, i), params.initial, params.language));
  } catch (err) {
    console.error(`generate-batch ${shape}:`, err);
    return Array.from({ length: 6 }, (_, i) =>
      injectInitial(fallbackSvg(shape, i), params.initial, params.language)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      origin     = '',
      occupation = '',
      values     = '',
      lineage    = '',
      language   = '',
      initial    = '',
    } = await request.json();

    const originStr     = Array.isArray(origin)     ? (origin as string[]).join(', ')     : origin;
    const occupationStr = Array.isArray(occupation) ? (occupation as string[]).join(', ') : occupation;
    const valuesArr     = Array.isArray(values)     ? values as string[] : [values as string];

    const params: Params = {
      origin: originStr, occupation: occupationStr,
      values: valuesArr.join(', '), lineage, language, initial,
    };

    const [circleSvgs, squareSvgs] = await Promise.all([
      generateBatch('circle', params),
      generateBatch('square', params),
    ]);

    const seals = [
      ...circleSvgs.map((svg, i) => ({ variant: i,     shape: 'circle', svg, imageUrl: null, error: null })),
      ...squareSvgs.map((svg, i) => ({ variant: 6 + i, shape: 'square', svg, imageUrl: null, error: null })),
    ];

    return NextResponse.json({ seals });

  } catch (err) {
    console.error('generate-seal:', err);
    const params = { initial: '', language: '' } as Params;
    const seals = [
      ...Array.from({ length: 6 }, (_, i) => ({ variant: i,     shape: 'circle', svg: injectInitial(fallbackSvg('circle', i), params.initial, params.language), imageUrl: null, error: null })),
      ...Array.from({ length: 6 }, (_, i) => ({ variant: 6 + i, shape: 'square', svg: injectInitial(fallbackSvg('square', i), params.initial, params.language), imageUrl: null, error: null })),
    ];
    return NextResponse.json({ seals });
  }
}
