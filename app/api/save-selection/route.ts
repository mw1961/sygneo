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
    const selection: SealSelection = {
      id,
      createdAt: new Date().toISOString(),
      profile,
      sealSvg,
      sealIndex,
      notes: notes ?? '',
      status: 'pending',
    };

    await redis.set(`selection:${id}`, JSON.stringify(selection));
    await redis.lpush('selections', id);

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error('save-selection error:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const ids = await redis.lrange('selections', 0, 49);
    if (!ids || ids.length === 0) return NextResponse.json({ selections: [] });

    const raw = await Promise.all(ids.map(id => redis.get(`selection:${id}`)));
    const selections = raw
      .filter(Boolean)
      .map(s => (typeof s === 'string' ? JSON.parse(s) : s) as SealSelection);

    return NextResponse.json({ selections });
  } catch (err) {
    console.error('get-selections error:', err);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();
    const raw = await redis.get(`selection:${id}`);
    if (!raw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const selection = (typeof raw === 'string' ? JSON.parse(raw) : raw) as SealSelection;
    selection.status = status;
    await redis.set(`selection:${id}`, JSON.stringify(selection));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('patch-selection error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
