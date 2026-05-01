import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSealPrompts } from '@/app/lib/prompt-builder';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Claude system prompt ──────────────────────────────────────────────────────

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

OUTPUT FORMAT — exactly 4 prompts numbered 1-4:
- Prompt 1: Focus on Origin/Roots — abstract cultural geometric patterns from the family origins.
- Prompt 2: Focus on Profession/Values — symbolic geometric shapes representing work and values.
- Prompt 3: Minimalist Style-first — pure aesthetic geometry.
- Prompt 4: Hybrid synthesis — concentric layered composition combining all elements.

PROMPT TEMPLATE — use this exact structure for each:
"A bold geometric seal, [Style] aesthetic. [Visual description of abstract shapes]. Perfect circular symmetry, centered composition. Solid black thick lines on white background. Stencil-ready, high contrast, no anti-aliasing. --no shading, thin lines, text, letters, animals, faces, religious symbols, flags, colors, gradients"

Output exactly 4 lines:
REPLICATE_PROMPT_1: [prompt]
REPLICATE_PROMPT_2: [prompt]
REPLICATE_PROMPT_3: [prompt]
REPLICATE_PROMPT_4: [prompt]`;

// ── Step A: Claude generates 4 prompts ───────────────────────────────────────

async function getPromptsFromClaude(profile: {
  origin: string[]; occupation: string[]; values: string[]; style: string;
}): Promise<string[]> {
  const userMessage =
    `Generate 4 seal design prompts for a family with:\n` +
    `Origin: ${profile.origin.join(', ')}\n` +
    `Occupation/Heritage: ${profile.occupation.join(', ')}\n` +
    `Values: ${profile.values.join(', ')}\n` +
    `Visual style: ${profile.style}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: CLAUDE_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('Claude output:', text.slice(0, 600));

  const prompts: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const match = text.match(new RegExp(`REPLICATE_PROMPT_${i}:\\s*([^\\n]+)`));
    if (match) prompts.push(match[1].trim());
  }

  // Fallbacks
  if (prompts.length === 0) {
    const single = text.match(/REPLICATE_PROMPT:\s*([^\n]+)/);
    if (single) prompts.push(single[1].trim());
  }
  if (prompts.length === 0) {
    const lines = text.split('\n')
      .map(l => l.replace(/^[\d\.\-\*]+\s*/, '').trim())
      .filter(l => l.length > 40 && !l.startsWith('REPLICATE') && !l.startsWith('Output'));
    prompts.push(...lines.slice(0, 4));
  }

  if (prompts.length === 0) throw new Error('Claude returned no parseable prompts');
  return prompts;
}

// ── Step B: Leonardo generates PNG ───────────────────────────────────────────

async function callLeonardoAPI(prompt: string): Promise<string> {
  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) throw new Error('LEONARDO_API_KEY not configured');

  // Create generation
  const createRes = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      modelId: 'b24e16ff-06e3-43eb-8d33-4416c2d75876', // Leonardo Kino XL — good for vector-style
      width: 1024,
      height: 1024,
      num_images: 1,
      contrast: 3.5,
      alchemy: true,
      styleUUID: '111dc692-d470-4eec-b791-3475abac4315', // None style
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Leonardo create failed ${createRes.status}: ${err}`);
  }

  const createData = await createRes.json() as { sdGenerationJob?: { generationId?: string } };
  const generationId = createData?.sdGenerationJob?.generationId;
  if (!generationId) throw new Error('No generationId from Leonardo');

  // Poll until complete
  const deadline = Date.now() + 50_000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const pollData = await pollRes.json() as {
      generations_by_pk?: { status?: string; generated_images?: { url: string }[] }
    };
    const gen = pollData?.generations_by_pk;
    if (gen?.status === 'COMPLETE' && gen.generated_images?.[0]?.url) {
      return gen.generated_images[0].url;
    }
    if (gen?.status === 'FAILED') throw new Error('Leonardo generation failed');
  }
  throw new Error('Leonardo timeout');
}

// ── Step C: Vectorizer.ai converts PNG → SVG ──────────────────────────────────

async function callVectorizerAPI(imageUrl: string): Promise<string> {
  const apiId     = process.env.VECTORIZER_API_ID;
  const apiSecret = process.env.VECTORIZER_API_SECRET;
  if (!apiId || !apiSecret) throw new Error('VECTORIZER_API_ID/SECRET not configured');

  const formData = new FormData();
  formData.append('image.url', imageUrl);
  formData.append('output.file_format', 'svg');
  formData.append('processing.max_colors', '2'); // strict black + white
  formData.append('output.group_by', 'none');

  const credentials = Buffer.from(`${apiId}:${apiSecret}`).toString('base64');
  const res = await fetch('https://vectorizer.ai/api/v1/vectorize', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vectorizer failed ${res.status}: ${err}`);
  }

  return res.text(); // SVG content
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

async function generateSygneoSeal(profile: {
  origin: string[]; occupation: string[]; values: string[]; style: string;
}): Promise<{ variant: number; svg: string | null; error: string | null }[]> {
  // Step A: Claude → 4 prompts
  let prompts: string[];
  try {
    prompts = await getPromptsFromClaude(profile);
  } catch (err) {
    console.warn('Claude failed, using static builder:', err);
    prompts = buildSealPrompts(profile);
  }

  // Steps B+C in parallel: Leonardo PNG → Vectorizer SVG
  const results = await Promise.allSettled(
    prompts.map(async (prompt, i) => {
      const pngUrl = await callLeonardoAPI(prompt);
      const svg    = await callVectorizerAPI(pngUrl);
      console.log(`Seal ${i + 1} done`);
      return svg;
    })
  );

  return results.map((r, i) => ({
    variant: i,
    svg:     r.status === 'fulfilled' ? r.value : null,
    error:   r.status === 'rejected'  ? String(r.reason) : null,
  }));
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

    const seals = await generateSygneoSeal(profile);

    const succeeded = seals.filter(s => s.svg !== null);
    if (succeeded.length === 0) {
      const errors = seals.map(s => s.error).join(' | ');
      return NextResponse.json({ error: `All generations failed: ${errors}` }, { status: 500 });
    }

    return NextResponse.json({ seals });
  } catch (err) {
    console.error('generate-seal:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
