import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { requireBearer } from '@/lib/auth';
import { CrawlBodySchema } from '@/lib/validation';
import { createRefund } from '@/lib/locusClient';
import { signReceipt } from '@/lib/receiptSigner';
import { store } from '@/lib/memoryStore';

export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  console.log(`[${requestId}] POST /api/crawl`);

  await store.initialize();

  const auth = requireBearer(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CrawlBodySchema.safeParse(body);
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

    // Simulate crawl service
    const simulatedLatency = data.simulatedLatencyMs || Math.random() * 4000 + 1000;
    const simulatedQuality = data.simulatedQuality || Math.random() * 0.3 + 0.7;

    await new Promise(resolve => setTimeout(resolve, Math.min(simulatedLatency, 500)));

    const serviceResult = {
      latencyMs: simulatedLatency,
      quality: simulatedQuality,
      data: 'Mock crawl data...',
    };

    // Check SLA
    const latencyOk = !data.forceFail && simulatedLatency <= thread.sla.latencyMaxMs;
    const qualityOk = !data.forceFail && simulatedQuality >= thread.sla.qualityMin;
    const serviceOk = latencyOk && qualityOk;

    thread.serviceResult = serviceResult;
    thread.serviceOk = serviceOk;
    store.upsertThread(thread);

    console.log(`[${requestId}] Crawl completed: OK=${serviceOk}, latency=${simulatedLatency.toFixed(0)}ms, quality=${simulatedQuality.toFixed(2)}`);

    // If service failed SLA, trigger refund
    if (!serviceOk && thread.paymentId && thread.acceptedPrice) {
      const refundAmount = thread.acceptedPrice * (thread.refundFloor || 0.5);
      
      const refund = await createRefund({
        paymentId: thread.paymentId,
        amount: refundAmount,
        reason: `SLA violation: latency=${latencyOk ? 'OK' : 'FAIL'}, quality=${qualityOk ? 'OK' : 'FAIL'}`,
        idempotencyKey: `refund_${thread.threadId}_${Date.now()}`,
      });

      const receiptData = {
        receiptId: `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        refundId: refund.id,
        threadId: data.threadId,
        amount: refund.amount,
        reason: `SLA violation`,
        timestamp: refund.createdAt,
      };

      const receipt = signReceipt(receiptData);
      store.storeReceipt(receiptData.receiptId, receipt);

      if (thread.paymentId) {
        store.addRefund(thread.paymentId, refundAmount, `SLA violation`, receiptData.receiptId);
      }

      return NextResponse.json({
        ok: true,
        serviceOk: false,
        result: serviceResult,
        refund,
        receipt: receiptData,
      });
    }

    return NextResponse.json({
      ok: true,
      serviceOk: true,
      result: serviceResult,
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
