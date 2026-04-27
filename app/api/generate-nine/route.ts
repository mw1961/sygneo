import { NextRequest, NextResponse } from 'next/server';
import { hashProfile, renderAllNine } from '@/app/lib/pattern-generator';

export async function POST(request: NextRequest) {
  try {
    const { origin, occupation, values, familyName, color } = await request.json();

    const hash = await hashProfile(origin ?? '', occupation ?? '', values ?? [], familyName);
    const seals = renderAllNine(hash, color ?? '#000000');

    return NextResponse.json({ seals, hash });
  } catch (err) {
    console.error('generate-nine error:', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
