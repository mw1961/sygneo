import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SVG_SYSTEM = `You are an SVG code generator for rubber stamp seals.

Output ONLY valid JSON in this exact format — no markdown, no explanation:
{"svgs":["<svg>...</svg>","<svg>...</svg>","<svg>...</svg>","<svg>...</svg>"]}

Each SVG must follow these STRICT rules:
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
- Background: <rect width="300" height="300" fill="white"/>
- Outer border: <circle cx="150" cy="150" r="130" fill="none" stroke="black" stroke-width="10"/>
- Maximum 4 additional shapes inside the circle
- Only these elements: circle, polygon, line, rect, path
- Only these attributes: fill="black" OR fill="none" stroke="black" stroke-width="8" to "14"
- NO text, NO images, NO gradients, NO filters, NO colors
- All shapes centered around (150,150)
- Shapes must be BOLD and SIMPLE — visible at small sizes

Translate the family data into ONE dominant geometric motif per SVG:
- SVG 1: single large polygon (5-8 sides) based on origin tradition
- SVG 2: concentric circles with radial lines based on occupation
- SVG 3: bold star polygon based on values
- SVG 4: layered composition of 2-3 shapes combining all elements`;

export async function POST(request: NextRequest) {
  try {
    const { origin, occupation, values, style } = await request.json();

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SVG_SYSTEM,
      messages: [{
        role: 'user',
        content: `Origin: ${Array.isArray(origin) ? origin.join(', ') : origin}\nOccupation: ${Array.isArray(occupation) ? occupation.join(', ') : occupation}\nValues: ${Array.isArray(values) ? values.join(', ') : values}\nStyle: ${style}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*"svgs"[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as { svgs?: string[] };
    if (!parsed.svgs?.length) throw new Error('No SVGs');

    const seals = parsed.svgs.map((svg, i) => ({ variant: i, svg, imageUrl: null, error: null }));
    return NextResponse.json({ seals });

  } catch (err) {
    console.error('generate-seal:', err);
    // Fallback: simple geometric seals
    const seals = [
      { n: 6, r1: 110, r2: 55 },
      { n: 8, r1: 110, r2: 45 },
      { n: 5, r1: 115, r2: 50 },
      { n: 4, r1: 100, r2: 60 },
    ].map(({ n, r1, r2 }, i) => {
      const pts = Array.from({ length: n * 2 }, (_, j) => {
        const r = j % 2 === 0 ? r1 : r2;
        const a = (j / (n * 2)) * Math.PI * 2 - Math.PI / 2;
        return `${(150 + r * Math.cos(a)).toFixed(1)},${(150 + r * Math.sin(a)).toFixed(1)}`;
      }).join(' ');
      return {
        variant: i, imageUrl: null, error: null,
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="white"/><circle cx="150" cy="150" r="130" fill="none" stroke="black" stroke-width="10"/><polygon points="${pts}" fill="none" stroke="black" stroke-width="8"/><circle cx="150" cy="150" r="18" fill="black"/></svg>`,
      };
    });
    return NextResponse.json({ seals });
  }
}
