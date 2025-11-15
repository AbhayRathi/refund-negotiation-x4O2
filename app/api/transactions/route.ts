import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/memoryStore';

export async function GET(req: NextRequest) {
  await store.initialize();

  try {
    const snapshot = store.snapshot();

    return NextResponse.json({
      ok: true,
      ...snapshot,
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
