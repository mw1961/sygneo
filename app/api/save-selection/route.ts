import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/app/lib/db';
import type { SealSelection } from '@/app/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile, sealSvg, sealIndex, notes } = body;

    if (!profile || !sealSvg) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = `sel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const selection: SealSelection = {
      id,
      createdAt: now,
      profile,
      sealSvg,
      productionSvg: sealSvg, // initially same as customer selection
      sealIndex,
      notes: notes ?? '',
      status: 'vector_ready',  // SVG is already a vector — ready immediately
      history: [
        { status: 'pending',      at: now },
        { status: 'vector_ready', at: now, note: 'SVG auto-saved on customer confirmation' },
      ],
    };

    await redis.set(`sygneo:selection:${id}`, JSON.stringify(selection));
    await redis.lpush('sygneo:selections', id);

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error('save-selection error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const ids = await redis.lrange('sygneo:selections', 0, 99);
    if (!ids || ids.length === 0) return NextResponse.json({ selections: [] });

    const raw = await Promise.all(ids.map(id => redis.get(`sygneo:selection:${id}`)));
    const selections = raw
      .filter(Boolean)
      .map(s => (typeof s === 'string' ? JSON.parse(s) : s) as SealSelection);

    return NextResponse.json({ selections });
  } catch (err) {
    console.error('get-selections error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
