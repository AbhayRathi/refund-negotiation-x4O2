/**
 * Negotiation policy tunables
 * Controls how the buyer agent negotiates
 */

export interface NegotiationPolicy {
  alpha: number;      // Weight for latency in SLA score
  beta: number;       // Weight for quality in SLA score
  k: number;          // Concession curve steepness
  refundMin: number;  // Minimum acceptable refund percentage
}

export const defaultPolicy: NegotiationPolicy = {
  alpha: 0.4,
  beta: 0.6,
  k: 1.5,
  refundMin: 0.3,
};
