import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireBearer } from '@/lib/auth';
import { RefundBodySchema } from '@/lib/validation';
import { createRefund } from '@/lib/locusClient';
import { signReceipt } from '@/lib/receiptSigner';
import { store } from '@/lib/memoryStore';

export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  console.log(`[${requestId}] POST /api/refund`);

  await store.initialize();

  const auth = requireBearer(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = RefundBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Create refund via Locus
    const refund = await createRefund({
      paymentId: data.paymentId,
      amount: data.amount,
      reason: data.reason,
      idempotencyKey: data.idempotencyKey || uuidv4(),
    });

    // Create and store receipt
    const receiptData = {
      receiptId: `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      refundId: refund.id,
      paymentId: data.paymentId,
      amount: refund.amount,
      reason: data.reason,
      timestamp: refund.createdAt,
    };

    const receipt = signReceipt(receiptData);
    store.storeReceipt(receiptData.receiptId, receipt);

    // Add refund transaction
    store.addRefund(data.paymentId, data.amount, data.reason, receiptData.receiptId);

    console.log(`[${requestId}] Refund created: ${refund.id} for $${refund.amount} USDC`);

    return NextResponse.json({
      ok: true,
      refund,
      receipt: receiptData,
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
