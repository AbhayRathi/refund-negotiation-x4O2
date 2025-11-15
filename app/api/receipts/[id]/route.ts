import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/memoryStore';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await store.initialize();

  try {
    const receiptId = params.id;
    const receipt = store.getReceipt(receiptId);

    if (!receipt) {
      return NextResponse.json(
        { ok: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      receipt,
    });
  } catch (error: any) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
