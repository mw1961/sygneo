import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSealPrompts } from '@/app/lib/prompt-builder';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Claude: generate 4 prompts ────────────────────────────────────────────────

const CLAUDE_SYSTEM = `You are a specialized prompt engineer for industrial engraving design. Your task is to transform user profile data into 4 distinct, precise image generation prompts.

THE GOAL: Create a 30x30mm geometric seal design that is production-ready for metal/laser engraving.

STRICT DESIGN RULES (MUST BE IN EVERY PROMPT):
1. Color: Strictly solid black on a pure white background. No gray, no shading, no gradients.
2. Composition: Perfect centered symmetry. The design must be contained within a circular or square boundary, with clear safe margins (not touching the edges).
3. Line Weight: Very thick, bold solid lines (minimum 2mm thickness equivalent). No fine details or hairlines.
4. Content: Strictly geometric and abstract.
5. Forbidden: No text, no letters, no human figures, no animals, no religious symbols, no national flags, no colors.

TRANSLATION RULES — convert all input data to abstract geometry:
- Country/Origin → abstract cultural geometric pattern (e.g., Morocco → interlocking polygon star grid; Japan → radial circular mon symmetry)
- Profession → symbolic geometric metaphor (e.g., Carpenter → interlocking angular joints; Musician → concentric arc waves)
- Values → pure geometric forms (e.g., Resilience → nested triangle in concentric rings; Loyalty → two interlocked rings)
- Style → aesthetic language (Japanese → extreme negative space, single motif; Ancient → interlaced knotwork; Modern → grid precision)

OUTPUT FORMAT — exactly 4 prompts:
- Prompt 1: Focus on Origin/Roots
- Prompt 2: Focus on Profession/Values
- Prompt 3: Minimalist Style-first
- Prompt 4: Hybrid synthesis of all elements

PROMPT TEMPLATE:
"A bold geometric seal, [Style] aesthetic. [Abstract shape description]. Perfect circular symmetry, centered composition. Solid black thick lines on white background. Stencil-ready, high contrast, no anti-aliasing. --no shading, thin lines, text, letters, animals, faces, religious symbols, flags, colors, gradients"

Output exactly 4 lines:
REPLICATE_PROMPT_1: [prompt]
REPLICATE_PROMPT_2: [prompt]
REPLICATE_PROMPT_3: [prompt]
REPLICATE_PROMPT_4: [prompt]`;

async function getPromptsFromClaude(profile: {
  origin: string[]; occupation: string[]; values: string[]; style: string;
}): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: CLAUDE_SYSTEM,
    messages: [{
      role: 'user',
      content: `Generate 4 seal prompts for:\nOrigin: ${profile.origin.join(', ')}\nOccupation: ${profile.occupation.join(', ')}\nValues: ${profile.values.join(', ')}\nStyle: ${profile.style}`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('Claude:', text.slice(0, 400));

  const prompts: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const m = text.match(new RegExp(`REPLICATE_PROMPT_${i}:\\s*([^\\n]+)`));
    if (m) prompts.push(m[1].trim());
  }
  if (prompts.length === 0) {
    const lines = text.split('\n').map(l => l.replace(/^[\d\.\-\*]+\s*/, '').trim()).filter(l => l.length > 40);
    prompts.push(...lines.slice(0, 4));
  }
  if (prompts.length === 0) throw new Error('Claude returned no prompts');
  return prompts;
}

// ── Leonardo: generate PNG ────────────────────────────────────────────────────

async function callLeonardoAPI(prompt: string): Promise<string> {
  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) throw new Error('LEONARDO_API_KEY not configured');

  const createRes = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      negative_prompt: 'realistic, photo, texture, noise, blur, gradients, shading, grey, color, animals, faces, text, letters, complex details, messy, chaotic, organic, photorealistic',
      width: 1024,
      height: 1024,
      num_images: 1,
      contrast: 3.5,
      presetStyle: 'GRAPHIC_DESIGN',
    }),
  });

  if (!createRes.ok) throw new Error(`Leonardo create failed ${createRes.status}: ${await createRes.text()}`);

  const data = await createRes.json() as { sdGenerationJob?: { generationId?: string } };
  const generationId = data?.sdGenerationJob?.generationId;
  if (!generationId) throw new Error('No generationId from Leonardo');

  const deadline = Date.now() + 50_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    const poll = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const pollData = await poll.json() as { generations_by_pk?: { status?: string; generated_images?: { url: string }[] } };
    const gen = pollData?.generations_by_pk;
    if (gen?.status === 'COMPLETE' && gen.generated_images?.[0]?.url) return gen.generated_images[0].url;
    if (gen?.status === 'FAILED') throw new Error('Leonardo generation failed');
  }
  throw new Error('Leonardo timeout');
}

// ── POST handler — returns PNG URLs only ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { origin, occupation, values, style } = await request.json();

    const profile = {
      origin:     Array.isArray(origin)     ? origin     : [origin ?? ''],
      occupation: Array.isArray(occupation) ? occupation : [occupation ?? ''],
      values:     Array.isArray(values)     ? values     : [],
      style:      style ?? 'modern (clean, geometric)',
    };

    let prompts: string[];
    try {
      prompts = await getPromptsFromClaude(profile);
    } catch (err) {
      console.warn('Claude fallback:', err);
      prompts = buildSealPrompts(profile);
    }

    const results = await Promise.allSettled(prompts.map(p => callLeonardoAPI(p)));

    const seals = results.map((r, i) => ({
      variant:  i,
      imageUrl: r.status === 'fulfilled' ? r.value : null,
      error:    r.status === 'rejected'  ? String(r.reason) : null,
    }));

    if (seals.every(s => s.imageUrl === null)) {
      return NextResponse.json({ error: seals.map(s => s.error).join(' | ') }, { status: 500 });
    }

    return NextResponse.json({ seals });
  } catch (err) {
    console.error('generate:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
