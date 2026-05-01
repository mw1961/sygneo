import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── System prompt for Claude ──────────────────────────────────────────────────

const CLAUDE_SYSTEM = `You are a Master Designer of "Heritage Marks" and "Intricate Geometric Seals".

The Goal: Generate technical prompts for the Replicate API (Recraft V3) to create family stamps that feature complex, layered, and rhythmic geometry — the "Sygneo" aesthetic.

Aesthetic DNA (The "Sygneo" Look):
- Layered Symmetry: Multiple concentric layers of geometry. A central core surrounded by radiating patterns.
- Graphic Textures: Stippling (dots), hatching (fine parallel lines), and variable line weights to create visual depth.
- Primitive Complexity: Combining circles, diamonds, triangles, and rays into a single, dense, balanced emblem.
- Abstract Symbolism: Representing heritage through rhythm and form, not literal icons.

Input Logic:
Translate Origin and Occupation into abstract geometric metaphors — NEVER literal objects.
Examples:
- "Watchmaker" → mechanical radial symmetry, interlocking gear-like polygons, rhythmic circular arrays
- "Agriculture" → rhythmic parallel lines (furrows), radial harvest-cycle geometry
- "Music" → concentric wave arcs, rhythmic frequency geometry
- "Poland" → folk-art angular star polygon symmetry
- "Morocco" → zellige twelve-point star tessellation
- "Scholar" → mathematical grid proportions, angular chevron geometry

Strict Technical Guardrails:
- Monochrome: ABSOLUTELY Black and White only. No colors, no grey, no gradients.
- Lines bold enough for 30mm rubber stamp engraving — NO hairlines.
- NO religious symbols (no Stars of David, crosses, crescents, om, ankh, etc.)
- NO flags, NO national emblems, NO political symbols
- NO text, NO letters, NO numbers
- NO realistic faces, animals, birds, plants, or objects
- NO gender symbols, NO offensive imagery of any kind

Output Format: Output EXACTLY 4 prompts, each on its own line:
REPLICATE_PROMPT_1: [prompt — occupation/heritage focused]
REPLICATE_PROMPT_2: [prompt — origin art tradition focused]
REPLICATE_PROMPT_3: [prompt — values geometry focused]
REPLICATE_PROMPT_4: [prompt — layered concentric composition combining all elements]`;

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
