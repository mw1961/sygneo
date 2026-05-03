import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildUserMessage, fontSpec } from '@/app/lib/seal-prompt';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fallbackSvg(shape: 'circle' | 'square', i: number): string {
  const defs = [
    `<circle cx="150" cy="150" r="80" fill="none" stroke="black" stroke-width="9"/>`,
    `<rect x="90" y="90" width="120" height="120" fill="none" stroke="black" stroke-width="9" transform="rotate(45 150 150)"/>`,
    `<circle cx="150" cy="150" r="88" fill="none" stroke="black" stroke-width="9"/><circle cx="150" cy="150" r="60" fill="none" stroke="black" stroke-width="9"/>`,
    `<rect x="55" y="55" width="190" height="190" fill="none" stroke="black" stroke-width="9"/>`,
  ];
  const inner  = defs[i % defs.length];
  const border = shape === 'circle'
    ? `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`
    : `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="white"/>${border}${inner}</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Always inject the initial programmatically — never rely on Claude for this
function injectInitial(svg: string, initial: string, language: string): string {
  if (!initial.trim()) return svg;
  const font = fontSpec(language);
  const char = initial.trim();
  // Remove any text elements Claude may have generated
  const cleaned = svg.replace(/<text[\s\S]*?<\/text>/gi, '');
  const textEl  = `<text x="150" y="150" dy=".35em" font-family="${font}" font-size="68" text-anchor="middle" fill="black">${escapeXml(char)}</text>`;
  return cleaned.replace('</svg>', `${textEl}</svg>`);
}

function validateSvg(svg: string, shape: 'circle' | 'square', i: number): string {
  if (/<tspan/i.test(svg))                     { console.warn(`SVG ${shape}${i} tspan`);        return fallbackSvg(shape, i); }
  if (/<polygon/i.test(svg) || /<polyline/i.test(svg)) { console.warn(`SVG ${shape}${i} poly`); return fallbackSvg(shape, i); }

  // Wrong border type
  if (shape === 'circle' && !/<circle cx="150" cy="150" r="132"/.test(svg)) {
    console.warn(`SVG ${shape}${i} wrong border`);
    return fallbackSvg(shape, i);
  }
  if (shape === 'square' && !/<rect x="18" y="18" width="264" height="264"/.test(svg)) {
    console.warn(`SVG ${shape}${i} wrong border`);
    return fallbackSvg(shape, i);
  }

  // Thin strokes (allow 6+ to give Claude some flexibility)
  const swVals = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(m => parseFloat(m[1]));
  if (swVals.some(sw => sw < 6)) { console.warn(`SVG ${shape}${i} thin stroke`); return fallbackSvg(shape, i); }

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
      max_tokens: 8000,
      system:     buildSystemPrompt(shape),
      messages:   [{ role: 'user', content: buildUserMessage(params) }],
    });

    const text      = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*"svgs"[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON from ${shape} batch`);

    const parsed = JSON.parse(jsonMatch[0]) as { svgs?: string[] };
    if (!parsed.svgs?.length) throw new Error(`Empty SVGs from ${shape} batch`);

    return parsed.svgs
      .slice(0, 12)
      .map((svg, i) => {
        const validated = validateSvg(svg, shape, i);
        return injectInitial(validated, params.initial, params.language);
      });
  } catch (err) {
    console.error(`generate-batch ${shape}:`, err);
    return Array.from({ length: 12 }, (_, i) => {
      const fb = fallbackSvg(shape, i);
      return injectInitial(fb, params.initial, params.language);
    });
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
    const valuesStr     = valuesArr.join(', ');

    const params: Params = {
      origin: originStr, occupation: occupationStr, values: valuesStr,
      lineage, language, initial,
    };

    // Two parallel calls: 12 circle + 12 square
    const [circleSvgs, squareSvgs] = await Promise.all([
      generateBatch('circle', params),
      generateBatch('square', params),
    ]);

    const seals = [
      ...circleSvgs.map((svg, i) => ({ variant: i,      shape: 'circle', svg, imageUrl: null, error: null })),
      ...squareSvgs.map((svg, i) => ({ variant: 12 + i, shape: 'square', svg, imageUrl: null, error: null })),
    ];

    return NextResponse.json({ seals });

  } catch (err) {
    console.error('generate-seal:', err);
    const seals = [
      ...Array.from({ length: 12 }, (_, i) => ({ variant: i,      shape: 'circle', svg: fallbackSvg('circle', i), imageUrl: null, error: null })),
      ...Array.from({ length: 12 }, (_, i) => ({ variant: 12 + i, shape: 'square', svg: fallbackSvg('square', i), imageUrl: null, error: null })),
    ];
    return NextResponse.json({ seals });
  }
}
