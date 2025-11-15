/**
 * Locus/x402 client with mock support
 * Handles payments and refunds
 */

const USE_MOCK = process.env.LOCUS_USE_MOCK === 'true';
const API_BASE = process.env.LOCUS_API_BASE || 'https://api.locus.sh';
const API_KEY = process.env.LOCUS_API_KEY || 'sk_xxx';

// Track processed idempotency keys
const processedIdempotencyKeys = new Set<string>();

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface PaymentRequest {
  from: string;
  to: string;
  amount: number;
  description?: string;
  idempotencyKey?: string;
}

export interface PaymentResponse {
  id: string;
  from: string;
  to: string;
  amount: number;
  status: 'pending' | 'confirmed';
  createdAt: number;
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
}

export interface RefundResponse {
  id: string;
  paymentId: string;
  amount: number;
  status: 'confirmed';
  createdAt: number;
}

/**
 * Create a payment
 */
export async function createPayment(req: PaymentRequest): Promise<PaymentResponse> {
  // Check idempotency
  if (req.idempotencyKey && processedIdempotencyKeys.has(req.idempotencyKey)) {
    console.log(`[Locus] Idempotent payment request: ${req.idempotencyKey}`);
    // Return cached response (in real impl, would store in DB)
    // For now, just return success
  } else if (req.idempotencyKey) {
    processedIdempotencyKeys.add(req.idempotencyKey);
  }

  if (USE_MOCK) {
    // Mock implementation
    await delay(200 + Math.random() * 100);

    const payment: PaymentResponse = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: req.from,
      to: req.to,
      amount: req.amount,
      status: 'confirmed',
      createdAt: Date.now(),
    };

    console.log(`[Locus Mock] Payment created: ${payment.id} for $${payment.amount} USDC`);
    return payment;
  } else {
    // Real API call
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    };

    if (req.idempotencyKey) {
      headers['Idempotency-Key'] = req.idempotencyKey;
    }

    const response = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: req.from,
        to: req.to,
        amount: req.amount,
        description: req.description,
      }),
    });

    if (!response.ok) {
      throw new Error(`Payment failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

/**
 * Create a refund
 */
export async function createRefund(req: RefundRequest): Promise<RefundResponse> {
  // Check idempotency
  if (req.idempotencyKey && processedIdempotencyKeys.has(req.idempotencyKey)) {
    console.log(`[Locus] Idempotent refund request: ${req.idempotencyKey}`);
  } else if (req.idempotencyKey) {
    processedIdempotencyKeys.add(req.idempotencyKey);
  }

  if (USE_MOCK) {
    // Mock implementation
    await delay(200 + Math.random() * 100);

    const refund: RefundResponse = {
      id: `rfnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentId: req.paymentId,
      amount: req.amount,
      status: 'confirmed',
      createdAt: Date.now(),
    };

    console.log(`[Locus Mock] Refund created: ${refund.id} for $${refund.amount} USDC`);
    return refund;
  } else {
    // Real API call
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    };

    if (req.idempotencyKey) {
      headers['Idempotency-Key'] = req.idempotencyKey;
    }

    const response = await fetch(`${API_BASE}/refunds`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        paymentId: req.paymentId,
        amount: req.amount,
        reason: req.reason,
      }),
    });

    if (!response.ok) {
      throw new Error(`Refund failed: ${response.statusText}`);
    }

    return await response.json();
  }
}
