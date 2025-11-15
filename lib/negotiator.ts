import { defaultPolicy, NegotiationPolicy } from './negotiationPolicy';

/**
 * Intelligent negotiator for buyer agent
 * Decides to accept, counter, or reject based on WTP, SLA, and refund terms
 */

export interface NegotiationInput {
  wtp_usdc: number;
  bmin_usdc: number;  // Minimum acceptable price
  sellerOffer: number;
  sellerRefund: number;  // Seller's refund percentage (0-1)
  sla: {
    latencyMaxMs: number;
    qualityMin: number;
  };
  t: number;  // Current round (1-indexed)
  T: number;  // Total max rounds
  policy?: NegotiationPolicy;
}

export type NegotiationDecision = 'accept' | 'counter' | 'reject';

export interface NegotiationResult {
  decision: NegotiationDecision;
  counterOffer?: number;
  counterRefund?: number;
  message: string;
}

/**
 * Calculate SLA score (0-1, higher is better)
 */
function calculateSLAScore(
  sla: { latencyMaxMs: number; qualityMin: number },
  policy: NegotiationPolicy
): number {
  // Normalize latency (assume reasonable range 1s-10s)
  const latencyScore = Math.max(0, Math.min(1, (10000 - sla.latencyMaxMs) / 9000));
  
  // Quality score is direct
  const qualityScore = sla.qualityMin;
  
  // Weighted combination
  return policy.alpha * latencyScore + policy.beta * qualityScore;
}

/**
 * Calculate concession target using exponential curve
 */
function calculateConcession(
  wtp_usdc: number,
  bmin_usdc: number,
  t: number,
  T: number,
  k: number
): number {
  // Concession curve: start near wtp, gradually move toward bmin
  // Progress through rounds: (t-1)/(T-1)
  const progress = T > 1 ? (t - 1) / (T - 1) : 1;
  
  // Exponential concession: wtp - (wtp - bmin) * (progress^k)
  const concession = wtp_usdc - (wtp_usdc - bmin_usdc) * Math.pow(progress, k);
  
  return concession;
}

/**
 * Main negotiation decision function
 */
export function decide(input: NegotiationInput): NegotiationResult {
  const {
    wtp_usdc,
    bmin_usdc,
    sellerOffer,
    sellerRefund,
    sla,
    t,
    T,
    policy = defaultPolicy,
  } = input;

  // Calculate SLA score
  const slaScore = calculateSLAScore(sla, policy);
  
  // SLA is acceptable if score >= 0.6
  const slaOk = slaScore >= 0.6;
  
  // Refund is acceptable if >= refundMin
  const refundOk = sellerRefund >= policy.refundMin;

  // Calculate concession target for this round
  const concessionTarget = calculateConcession(wtp_usdc, bmin_usdc, t, T, policy.k);

  // Decision logic:
  // 1. Accept if offer <= wtp AND refund >= min AND SLA ok
  if (sellerOffer <= wtp_usdc && refundOk && slaOk) {
    return {
      decision: 'accept',
      message: `Accepting offer at $${sellerOffer.toFixed(4)} USDC with ${(sellerRefund * 100).toFixed(0)}% refund guarantee`,
    };
  }

  // 2. If we're at the last round, make final decision
  if (t >= T) {
    // Accept if close to wtp (within 20%)
    if (sellerOffer <= wtp_usdc * 1.2 && refundOk && slaOk) {
      return {
        decision: 'accept',
        message: `Final round: accepting offer at $${sellerOffer.toFixed(4)} USDC`,
      };
    }
    
    return {
      decision: 'reject',
      message: `Unable to reach agreement after ${T} rounds`,
    };
  }

  // 3. Counter-offer
  // Counter price is max(bmin, concessionTarget)
  const counterPrice = Math.max(bmin_usdc, concessionTarget);
  
  // Request refund is max(refundMin, sellerRefund)
  const counterRefund = Math.max(policy.refundMin, sellerRefund);

  let message = `Round ${t}/${T}: Countering at $${counterPrice.toFixed(4)} USDC with ${(counterRefund * 100).toFixed(0)}% refund`;
  
  if (!slaOk) {
    message += `. SLA score ${slaScore.toFixed(2)} too low`;
  }
  if (!refundOk) {
    message += `. Refund ${(sellerRefund * 100).toFixed(0)}% below minimum ${(policy.refundMin * 100).toFixed(0)}%`;
  }

  return {
    decision: 'counter',
    counterOffer: counterPrice,
    counterRefund,
    message,
  };
}
