import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── System prompt for Claude ──────────────────────────────────────────────────

const CLAUDE_SYSTEM = `You are a specialized Vector Graphics Engineer and Prompt Designer for the Replicate API (Model: Recraft V3). Your goal is to translate family heritage data into technical prompts for 30x30mm rubber stamps.

The Mission: Generate 4 different, highly optimized prompts in English that will result in professional, geometric, monochrome images suitable for rubber stamp production.

Strict Design Constraints (Mandatory):
- Color Palette: STRICTLY Black and White only. No grey, no gradients, no shadows.
- Geometry Only: Abstract geometric shapes exclusively (lines, circles, polygons, grids, spirals, interlace).
- Prohibited Content (Zero Tolerance):
  NO religious symbols (No Stars of David, Crosses, Crescents, Om, Ankh, etc.)
  NO flags or national symbols of any country
  NO text, letters, numbers, or initials
  NO realistic icons, faces, animals, birds, plants, or gender-specific imagery
  NO offensive or controversial symbols of any kind
  NO fine details that would break during stamp engraving
- Technical: Bold thick strokes, clear at 30x30mm physical scale.
- Composition: Symmetrical, balanced, centered. Radial or grid symmetry.

Workflow: Translate Origin and Occupation into abstract geometric metaphors.
Examples: "Agriculture" → rhythmic parallel lines (furrows). "Music" → concentric wave arcs. "Poland" → folk-art star polygon symmetry. "Morocco" → zellige geometric tessellation.

Output Format: Output EXACTLY 4 prompts, each on its own line, formatted as:
REPLICATE_PROMPT_1: [prompt]
REPLICATE_PROMPT_2: [prompt]
REPLICATE_PROMPT_3: [prompt]
REPLICATE_PROMPT_4: [prompt]

Each prompt must emphasize a different aspect: (1) occupation geometry, (2) origin geometry, (3) values geometry, (4) combined composition.`;

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
