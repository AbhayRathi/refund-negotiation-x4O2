import { describe, it, expect } from 'vitest';
import { decide } from '@/lib/negotiator';

describe('negotiator', () => {
  it('should accept when offer <= wtp and refund >= min and SLA ok', () => {
    const result = decide({
      wtp_usdc: 0.01,
      bmin_usdc: 0.005,
      sellerOffer: 0.009,
      sellerRefund: 0.5,
      sla: {
        latencyMaxMs: 2000,
        qualityMin: 0.8,
      },
      t: 1,
      T: 3,
    });

    expect(result.decision).toBe('accept');
    expect(result.message).toContain('Accepting');
  });

  it('should counter when offer > concessionTarget but <= 1.2 * wtp', () => {
    const result = decide({
      wtp_usdc: 0.01,
      bmin_usdc: 0.005,
      sellerOffer: 0.015, // Above WTP but within range
      sellerRefund: 0.5,
      sla: {
        latencyMaxMs: 2000,
        qualityMin: 0.8,
      },
      t: 1,
      T: 3,
    });

    expect(result.decision).toBe('counter');
    expect(result.counterOffer).toBeDefined();
    expect(result.counterOffer).toBeGreaterThan(0);
  });

  it('should reject on weak refund', () => {
    const result = decide({
      wtp_usdc: 0.01,
      bmin_usdc: 0.005,
      sellerOffer: 0.009,
      sellerRefund: 0.1, // Below min of 0.3
      sla: {
        latencyMaxMs: 2000,
        qualityMin: 0.8,
      },
      t: 3, // Last round
      T: 3,
    });

    // Should not accept due to low refund
    expect(result.decision).not.toBe('accept');
  });

  it('should reject after max rounds if no agreement', () => {
    const result = decide({
      wtp_usdc: 0.01,
      bmin_usdc: 0.005,
      sellerOffer: 0.02, // Way above WTP
      sellerRefund: 0.2,
      sla: {
        latencyMaxMs: 2000,
        qualityMin: 0.8,
      },
      t: 3,
      T: 3,
    });

    expect(result.decision).toBe('reject');
    expect(result.message).toContain('Unable to reach agreement');
  });
});
