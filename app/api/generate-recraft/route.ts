import { NextRequest, NextResponse } from 'next/server';
import { buildSealPrompts } from '@/app/lib/prompt-builder';

export const maxDuration = 60; // Vercel: extend timeout to 60s

const TOKEN = process.env.REPLICATE_API_TOKEN;

async function generateSVG(prompt: string): Promise<string> {
  if (!TOKEN) throw new Error('REPLICATE_API_TOKEN not configured');

  // Create prediction
  const createRes = await fetch('https://api.replicate.com/v1/models/recraft-ai/recraft-v3-svg/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      input: { prompt, size: '1024x1024', style: 'engraving' },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate error ${createRes.status}: ${err}`);
  }

  let pred = await createRes.json() as {
    id: string; status: string; output?: unknown; error?: string; urls?: { get: string };
  };

  // Poll until done (max 50s)
  const deadline = Date.now() + 50_000;
  while (pred.status !== 'succeeded' && pred.status !== 'failed') {
    if (Date.now() > deadline) throw new Error('Timeout waiting for generation');
    await new Promise(r => setTimeout(r, 2500));
    const pollRes = await fetch(pred.urls?.get ?? `https://api.replicate.com/v1/predictions/${pred.id}`, {
      headers: { 'Authorization': `Token ${TOKEN}` },
    });
    pred = await pollRes.json() as typeof pred;
  }

  if (pred.status === 'failed') throw new Error(pred.error ?? 'Prediction failed');

  const output = pred.output;
  const svgUrl = Array.isArray(output) ? (output as string[])[0] : output as string;
  if (!svgUrl) throw new Error('No output URL returned');

  const svgRes = await fetch(svgUrl);
  if (!svgRes.ok) throw new Error(`Failed to fetch SVG: ${svgRes.status}`);
  let svg = await svgRes.text();

  // Normalize SVG: force square viewBox and responsive size
  svg = svg.replace(/<svg([^>]*)>/, (_match, attrs: string) => {
    // Remove existing width/height attrs, add responsive ones
    const cleaned = attrs
      .replace(/\s+width="[^"]*"/g, '')
      .replace(/\s+height="[^"]*"/g, '')
      .replace(/\s+viewBox="[^"]*"/g, '');
    return `<svg${cleaned} width="100%" height="100%" viewBox="0 0 1024 1024" preserveAspectRatio="xMidYMid meet">`;
  });

  return svg;
}

export async function POST(request: NextRequest) {
  try {
    const { origin, occupation, values, style } = await request.json();

    const prompts = buildSealPrompts({
      origin:     Array.isArray(origin)     ? origin     : [origin ?? ''],
      occupation: Array.isArray(occupation) ? occupation : [occupation ?? ''],
      values:     Array.isArray(values)     ? values     : [],
      style:      style ?? 'modern (clean, geometric)',
    });

    // Generate 4 in parallel (within 60s timeout)
    const results = await Promise.allSettled(prompts.map(p => generateSVG(p)));

    const seals = results.map((r, i) => ({
      variant: i,
      svg:   r.status === 'fulfilled' ? r.value : null,
      error: r.status === 'rejected'  ? String(r.reason) : null,
    }));

    const succeeded = seals.filter(s => s.svg !== null);
    if (succeeded.length === 0) {
      const errors = seals.map(s => s.error).join(' | ');
      return NextResponse.json({ error: `All generations failed: ${errors}` }, { status: 500 });
    }

    return NextResponse.json({ seals });
  } catch (err) {
    console.error('generate-recraft:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
