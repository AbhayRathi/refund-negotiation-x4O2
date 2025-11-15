import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireBearer } from '@/lib/auth';
import { NegotiateBodySchema } from '@/lib/validation';
import { quoteValue } from '@/lib/valueAssessor';
import { store } from '@/lib/memoryStore';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  console.log(`[${requestId}] POST /api/negotiate`);

  // Initialize store
  await store.initialize();

  // Check authentication
  const auth = requireBearer(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Validate with Zod
    const parsed = NegotiateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get quote from value assessor
    const quote = quoteValue({
      domain: data.domain,
      urls: data.urls,
      htmlSnippets: data.htmlSnippets,
      dupRateEst: data.dupRateEst,
      freshnessNeedMs: data.freshnessNeedMs,
      qualityTarget: data.qualityTarget,
      deadlineMs: data.deadlineMs,
      riskFail: data.riskFail,
    });

    console.log(`[${requestId}] Quote: EV=${quote.ev_usdc.toFixed(4)}, WTP=${quote.wtp_usdc.toFixed(4)}`);

    // Create thread
    const buyer = process.env.BUYER_AGENT_ID || 'agent_123';
    const seller = process.env.SELLER_AGENT_ID || 'agent_456';

    const thread = store.newThread(buyer, seller, quote.sla, {
      wtp_usdc: quote.wtp_usdc,
      ev_usdc: quote.ev_usdc,
      refundFloor: quote.refundFloor,
    });

    // Add initial buyer turn (offer at WTP)
    store.addTurn(thread.threadId, {
      from: 'buyer',
      offer: quote.wtp_usdc,
      message: `Initial offer at WTP: $${quote.wtp_usdc.toFixed(4)} USDC`,
    });

    const updatedThread = store.getThread(thread.threadId);

    return NextResponse.json({
      ok: true,
      threadId: thread.threadId,
      thread: updatedThread,
      quote: {
        ev_usdc: quote.ev_usdc,
        wtp_usdc: quote.wtp_usdc,
        sla: quote.sla,
        refundFloor: quote.refundFloor,
      },
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
