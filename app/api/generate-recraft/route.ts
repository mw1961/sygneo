import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, buildUserMessage } from '@/app/lib/seal-prompt';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fallbackSvg(shape: 'circle' | 'square', i: number): string {
  const defs = [
    { inner: `<circle cx="150" cy="150" r="80" fill="none" stroke="black" stroke-width="9"/>` },
    { inner: `<rect x="80" y="80" width="140" height="140" fill="none" stroke="black" stroke-width="9" transform="rotate(45 150 150)"/>` },
    { inner: `<circle cx="150" cy="150" r="70" fill="none" stroke="black" stroke-width="9"/><circle cx="150" cy="150" r="45" fill="none" stroke="black" stroke-width="9"/>` },
    { inner: `<rect x="90" y="90" width="120" height="120" fill="none" stroke="black" stroke-width="9"/>` },
  ];
  const d      = defs[i % defs.length];
  const border = shape === 'circle'
    ? `<circle cx="150" cy="150" r="132" fill="none" stroke="black" stroke-width="12"/>`
    : `<rect x="18" y="18" width="264" height="264" fill="none" stroke="black" stroke-width="12"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="white"/>${border}${d.inner}</svg>`;
}

function validateSvg(svg: string, shape: 'circle' | 'square', i: number): string {
  // Only allow <text> with a short initial (≤4 chars) — reject multi-word text
  const textContents = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/gi)].map(m => m[1].trim());
  if (textContents.some(t => t.length > 6)) { console.warn(`SVG ${shape}${i} long text`); return fallbackSvg(shape, i); }
  if (/<tspan/i.test(svg)) { console.warn(`SVG ${shape}${i} tspan`); return fallbackSvg(shape, i); }
  if (/<polygon/i.test(svg) || /<polyline/i.test(svg)) { console.warn(`SVG ${shape}${i} polygon`); return fallbackSvg(shape, i); }

  // Check wrong border type
  if (shape === 'circle' && !/<circle cx="150" cy="150" r="132"/.test(svg)) { console.warn(`SVG ${shape}${i} wrong border`); return fallbackSvg(shape, i); }
  if (shape === 'square' && !/<rect x="18" y="18" width="264" height="264"/.test(svg)) { console.warn(`SVG ${shape}${i} wrong border`); return fallbackSvg(shape, i); }

  // Thin strokes
  const swMatches = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(m => parseFloat(m[1]));
  if (swMatches.some(sw => sw < 6)) { console.warn(`SVG ${shape}${i} thin stroke`); return fallbackSvg(shape, i); }

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
      max_tokens: 12000,
      system:     buildSystemPrompt(shape, params.initial, params.language),
      messages:   [{ role: 'user', content: buildUserMessage(params) }],
    });

    const text       = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch  = text.match(/\{[\s\S]*"svgs"[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]) as { svgs?: string[] };
    if (!parsed.svgs?.length) throw new Error('No SVGs');

    return parsed.svgs
      .slice(0, 12)
      .map((svg, i) => validateSvg(svg, shape, i));
  } catch (err) {
    console.error(`generate-batch ${shape}:`, err);
    return Array.from({ length: 12 }, (_, i) => fallbackSvg(shape, i));
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

    const originStr     = Array.isArray(origin)     ? origin.join(', ')     : origin;
    const occupationStr = Array.isArray(occupation) ? occupation.join(', ') : occupation;
    const valuesStr     = Array.isArray(values)     ? (values as string[]).join(', ') : values;

    const params: Params = {
      origin: originStr, occupation: occupationStr, values: valuesStr,
      lineage, language, initial,
    };

    // Two parallel calls: 12 circle + 12 square = 24 total
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
