import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireBearer } from '@/lib/auth';
import { ConfirmBodySchema } from '@/lib/validation';
import { createPayment } from '@/lib/locusClient';
import { signReceipt } from '@/lib/receiptSigner';
import { store } from '@/lib/memoryStore';

export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  console.log(`[${requestId}] POST /api/confirm`);

  await store.initialize();

  const auth = requireBearer(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = ConfirmBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const thread = store.getThread(data.threadId);
    if (!thread) {
      return NextResponse.json({ ok: false, error: 'Thread not found' }, { status: 404 });
    }

    if (thread.locked) {
      return NextResponse.json({ ok: false, error: 'Thread already locked' }, { status: 409 });
    }

    if (!thread.wtp_usdc || data.acceptedPrice > thread.wtp_usdc) {
      return NextResponse.json(
        { ok: false, error: 'Accepted price exceeds WTP' },
        { status: 400 }
      );
    }

    // Lock thread
    thread.locked = true;
    store.upsertThread(thread);

    // Create payment with idempotency
    const payment = await createPayment({
      from: thread.buyer,
      to: thread.seller,
      amount: data.acceptedPrice,
      description: `Crawl payment for thread ${data.threadId}`,
      idempotencyKey: data.idempotencyKey || uuidv4(),
    });

    thread.paymentId = payment.id;
    store.upsertThread(thread);

    // Create and store receipt
    const receiptData = {
      receiptId: `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentId: payment.id,
      threadId: data.threadId,
      amount: payment.amount,
      from: payment.from,
      to: payment.to,
      timestamp: payment.createdAt,
    };

    const receipt = signReceipt(receiptData);
    thread.receiptId = receiptData.receiptId;
    store.storeReceipt(receiptData.receiptId, receipt);
    store.upsertThread(thread);

    // Add transaction
    const tx = store.addTx({
      from: thread.buyer,
      to: thread.seller,
      amount: data.acceptedPrice,
      description: `Payment for thread ${data.threadId}`,
      status: 'confirmed',
      receiptId: receiptData.receiptId,
    });

    console.log(`[${requestId}] Payment confirmed: ${payment.id}`);

    return NextResponse.json({
      ok: true,
      payment,
      receipt: receiptData,
      transaction: tx,
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
