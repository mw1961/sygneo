import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/app/lib/db';
import type { SealSelection, ProductionStatus } from '@/app/lib/db';
import { isAdminAuthenticated } from '@/app/lib/admin-auth';

export async function PATCH(request: NextRequest) {
  const auth = await isAdminAuthenticated();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, status, productionNotes, manufacturerRef, trackingNumber, productionSvg } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const raw = await redis.get(`sygneo:selection:${id}`);
    if (!raw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const selection = (typeof raw === 'string' ? JSON.parse(raw) : raw) as SealSelection;

    const now = new Date().toISOString();

    if (status && status !== selection.status) {
      selection.status = status as ProductionStatus;
      selection.history = [
        ...(selection.history ?? []),
        { status: status as ProductionStatus, at: now, note: productionNotes ?? undefined },
      ];
    }

    if (productionNotes !== undefined) selection.productionNotes = productionNotes;
    if (manufacturerRef  !== undefined) selection.manufacturerRef  = manufacturerRef;
    if (trackingNumber   !== undefined) selection.trackingNumber   = trackingNumber;
    if (productionSvg    !== undefined) selection.productionSvg    = productionSvg;

    await redis.set(`sygneo:selection:${id}`, JSON.stringify(selection));

    return NextResponse.json({ ok: true, selection });
  } catch (err) {
    console.error('production PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
