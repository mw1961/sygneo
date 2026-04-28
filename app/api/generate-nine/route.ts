import { NextRequest, NextResponse } from 'next/server';
import { hashProfile, renderAllFour } from '@/app/lib/pattern-generator';

export async function POST(request: NextRequest) {
  try {
    const { origin, occupation, values, familyName, color, variant } = await request.json();

    const hash = await hashProfile(origin ?? '', occupation ?? '', values ?? [], familyName);
    const seals = renderAllFour(hash, color ?? '#000000', variant ?? 0);

    return NextResponse.json({ seals, hash });
  } catch (err) {
    console.error('generate-nine error:', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
