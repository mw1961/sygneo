import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── System prompt for Claude ──────────────────────────────────────────────────

const CLAUDE_SYSTEM = `You are a Technical Production Engineer for Rubber Stamps and a Heritage Mark Designer.

The Goal: Generate 4 technical prompts for the Replicate API (Recraft V3) to produce a 30x30mm rubber stamp master — production-ready, bold, geometric.

Strict Manufacturing Rules:
- Color: 100% Monochrome. Pure Black on Pure White. ABSOLUTELY NO grey, no gradients, no shading, no textures, no anti-aliasing.
- Line Weight: Bold and thick lines only. Minimum 2mm visual thickness. Thin lines break during stamp production.
- Composition: Simple, clean, balanced geometry. 3-4 basic geometric shapes combined into one solid emblem.
- Shapes allowed: circles, rings, triangles, diamonds, polygons, straight lines, angular forms, interlocking geometric patterns.

Input Logic — translate heritage into abstract geometry, NEVER literal objects:
- "Watchmaker" → interlocking gear polygons, radial mechanical symmetry
- "Agriculture" → radial spoke geometry, parallel arc segments
- "Music" → concentric wave arcs, rhythmic geometric frequency
- "Poland" → angular folk-star polygon symmetry
- "Morocco" → geometric star tessellation pattern
- "Scholar" → mathematical grid chevron geometry

Strict Content Rules (Zero Tolerance):
- NO religious symbols: no Stars of David, no crosses, no crescents, no ankh, no om
- NO flags, NO national emblems, NO political symbols
- NO text, NO letters, NO numbers, NO monograms
- NO faces, NO animals, NO birds, NO plants, NO realistic objects
- NO gender symbols, NO offensive imagery of any kind
- NO thin/fine details that break during rubber stamp production

Output EXACTLY 4 prompts:
REPLICATE_PROMPT_1: [occupation/heritage as bold geometric form]
REPLICATE_PROMPT_2: [origin tradition as bold geometric pattern]
REPLICATE_PROMPT_3: [values expressed as bold angular geometry]
REPLICATE_PROMPT_4: [all elements combined, concentric layered composition, production-ready]`;

// ── Ask Claude to generate 4 prompts ─────────────────────────────────────────

async function generatePromptsWithClaude(profile: {
  origin: string[];
  occupation: string[];
  values: string[];
  style: string;
}): Promise<string[]> {
  const userMessage =
    `Generate 4 different stamp design prompts for a family with:\n` +
    `Origin: ${profile.origin.join(', ')}\n` +
    `Occupation/Heritage: ${profile.occupation.join(', ')}\n` +
    `Values: ${profile.values.join(', ')}\n` +
    `Visual style preference: ${profile.style}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: CLAUDE_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // Parse REPLICATE_PROMPT_1: ... through REPLICATE_PROMPT_4:
  const prompts: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const match = text.match(new RegExp(`REPLICATE_PROMPT_${i}:\\s*(.+)`));
    if (match) prompts.push(match[1].trim());
  }

  if (prompts.length === 0) throw new Error('Claude returned no parseable prompts');
  return prompts;
}

// ── Generate image via Replicate ──────────────────────────────────────────────

async function generateImage(prompt: string): Promise<string> {
  if (!REPLICATE_TOKEN) throw new Error('REPLICATE_API_TOKEN not configured');

  const createRes = await fetch('https://api.replicate.com/v1/models/recraft-ai/recraft-v3/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt,
        style: 'digital_illustration/2d_art_poster',
        aspect_ratio: '1:1',
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Replicate error ${createRes.status}: ${err}`);
  }

  let pred = await createRes.json() as {
    id: string; status: string; output?: unknown; error?: string; urls?: { get: string };
  };

  const deadline = Date.now() + 50_000;
  while (pred.status !== 'succeeded' && pred.status !== 'failed') {
    if (Date.now() > deadline) throw new Error('Timeout');
    await new Promise(r => setTimeout(r, 2500));
    const pollRes = await fetch(
      pred.urls?.get ?? `https://api.replicate.com/v1/predictions/${pred.id}`,
      { headers: { 'Authorization': `Token ${REPLICATE_TOKEN}` } }
    );
    pred = await pollRes.json() as typeof pred;
  }

  if (pred.status === 'failed') throw new Error(pred.error ?? 'Prediction failed');

  const output = pred.output;
  const url = Array.isArray(output) ? (output as string[])[0] : output as string;
  if (!url) throw new Error('No output URL');
  return url;
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { origin, occupation, values, style } = await request.json();

    const profile = {
      origin:     Array.isArray(origin)     ? origin     : [origin ?? ''],
      occupation: Array.isArray(occupation) ? occupation : [occupation ?? ''],
      values:     Array.isArray(values)     ? values     : [],
      style:      style ?? 'modern (clean, geometric)',
    };

    // Step 1: Claude generates 4 optimized prompts
    const prompts = await generatePromptsWithClaude(profile);

    // Step 2: Replicate generates images in parallel
    const results = await Promise.allSettled(prompts.map(p => generateImage(p)));

    const seals = results.map((r, i) => ({
      variant:  i,
      imageUrl: r.status === 'fulfilled' ? r.value : null,
      error:    r.status === 'rejected'  ? String(r.reason) : null,
    }));

    const succeeded = seals.filter(s => s.imageUrl !== null);
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
