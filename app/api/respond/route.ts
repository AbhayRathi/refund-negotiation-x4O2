import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireBearer } from '@/lib/auth';
import { RespondBodySchema } from '@/lib/validation';
import { decide } from '@/lib/negotiator';
import { store } from '@/lib/memoryStore';

export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  console.log(`[${requestId}] POST /api/respond`);

  await store.initialize();

  const auth = requireBearer(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = RespondBodySchema.safeParse(body);
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

    if (!thread.wtp_usdc) {
      return NextResponse.json({ ok: false, error: 'Thread missing WTP data' }, { status: 400 });
    }

    store.addTurn(thread.threadId, {
      from: 'seller',
      offer: data.sellerOffer,
      message: `Seller offers $${data.sellerOffer.toFixed(4)} USDC with ${(data.sellerRefund * 100).toFixed(0)}% refund`,
    });

    const bmin_usdc = thread.wtp_usdc * 0.5;
    const decision = decide({
      wtp_usdc: thread.wtp_usdc,
      bmin_usdc,
      sellerOffer: data.sellerOffer,
      sellerRefund: data.sellerRefund,
      sla: data.sla,
      t: data.t,
      T: data.T,
    });

    console.log(`[${requestId}] Decision: ${decision.decision}, ${decision.message}`);

    if (decision.decision === 'accept') {
      store.addTurn(thread.threadId, {
        from: 'buyer',
        accept: data.sellerOffer,
        message: decision.message,
      });
      thread.acceptedPrice = data.sellerOffer;
      store.upsertThread(thread);
    } else if (decision.decision === 'counter') {
      store.addTurn(thread.threadId, {
        from: 'buyer',
        counter: decision.counterOffer,
        message: decision.message,
      });
    } else {
      store.addTurn(thread.threadId, {
        from: 'buyer',
        message: `Rejected: ${decision.message}`,
      });
    }

    return NextResponse.json({
      ok: true,
      decision: decision.decision,
      counterOffer: decision.counterOffer,
      counterRefund: decision.counterRefund,
      message: decision.message,
      thread: store.getThread(thread.threadId),
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
