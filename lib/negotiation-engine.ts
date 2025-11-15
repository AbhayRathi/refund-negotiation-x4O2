import {
  NegotiationOffer,
  NegotiationResponse,
  NegotiationDecision,
  SLA,
  CrawlValue,
} from '@/lib/types';

/**
 * Intelligent negotiation engine
 * Decides whether to accept, counter, or reject offers based on value and SLA
 */
export class NegotiationEngine {
  private minAcceptableMargin = 0.7; // 70% of computed value
  private maxCounterOffers = 3;

  /**
   * Evaluate an offer and decide on a response
   */
  evaluateOffer(
    offer: NegotiationOffer,
    crawlValue: CrawlValue,
    counterOfferCount: number
  ): NegotiationResponse {
    const { proposedPriceCents, sla } = offer;
    const { willingnessToPayCents } = crawlValue;

    // Calculate acceptance threshold
    const minAcceptablePrice = willingnessToPayCents * this.minAcceptableMargin;

    // Evaluate SLA risk
    const slaRisk = this.evaluateSLARisk(sla);
    const slaAdjustedPrice = proposedPriceCents * (1 - slaRisk);

    // Decision logic
    if (slaAdjustedPrice >= willingnessToPayCents * 0.95) {
      // Great offer - accept immediately
      return {
        decision: 'accept',
        reason: 'Offer meets our expected value with acceptable SLA terms',
        acceptedSLA: sla,
      };
    }

    if (slaAdjustedPrice >= minAcceptablePrice) {
      // Good offer - accept
      return {
        decision: 'accept',
        reason: 'Offer is within acceptable range',
        acceptedSLA: sla,
      };
    }

    if (counterOfferCount >= this.maxCounterOffers) {
      // Too many rounds - reject or accept if close
      if (slaAdjustedPrice >= minAcceptablePrice * 0.9) {
        return {
          decision: 'accept',
          reason: 'Final round - accepting close offer',
          acceptedSLA: sla,
        };
      }
      return {
        decision: 'reject',
        reason: 'Unable to reach agreement after multiple rounds',
      };
    }

    // Counter-offer
    const counterPrice = this.calculateCounterOffer(
      proposedPriceCents,
      willingnessToPayCents,
      counterOfferCount
    );

    return {
      decision: 'counter',
      counterOfferCents: counterPrice,
      reason: `Current offer is ${Math.round((slaAdjustedPrice / willingnessToPayCents) * 100)}% of expected value. Countering at ${counterPrice} cents.`,
    };
  }

  /**
   * Evaluate SLA risk based on terms
   */
  private evaluateSLARisk(sla: SLA): number {
    let riskScore = 0;

    // Response time risk
    if (sla.expectedResponseTimeMs > 5000) {
      riskScore += 0.1;
    } else if (sla.expectedResponseTimeMs > 2000) {
      riskScore += 0.05;
    }

    // Success rate risk
    if (sla.expectedSuccessRate < 0.95) {
      riskScore += (0.95 - sla.expectedSuccessRate) * 0.5;
    }

    // Refund percentage (lower refund = higher risk for us)
    if (sla.refundPercentageOnFailure < 0.5) {
      riskScore += (0.5 - sla.refundPercentageOnFailure) * 0.3;
    }

    return Math.min(riskScore, 0.5); // Cap at 50% risk
  }

  /**
   * Calculate counter-offer price
   */
  private calculateCounterOffer(
    offeredPrice: number,
    targetPrice: number,
    round: number
  ): number {
    // Gradually move toward middle ground
    // Start at 90% of target, move closer to middle with each round
    const startRatio = 0.9;
    const convergenceRate = 0.15;
    
    const targetRatio = startRatio - (round * convergenceRate);
    const counterPrice = targetPrice * Math.max(targetRatio, 0.7);

    // Ensure counter is higher than offer but not too aggressive
    const minCounter = offeredPrice + (targetPrice - offeredPrice) * 0.3;
    
    return Math.round(Math.max(counterPrice, minCounter));
  }

  /**
   * Generate a reasonable SLA for a counter-offer
   */
  generateReasonableSLA(): SLA {
    return {
      expectedResponseTimeMs: 2000,
      expectedSuccessRate: 0.98,
      refundPercentageOnFailure: 0.8,
    };
  }

  /**
   * Determine if SLA was met based on actual performance
   */
  evaluateSLACompliance(
    sla: SLA,
    actualResponseTimeMs: number,
    success: boolean
  ): {
    compliant: boolean;
    refundPercentage: number;
    reason: string;
  } {
    if (!success) {
      return {
        compliant: false,
        refundPercentage: sla.refundPercentageOnFailure,
        reason: 'Crawl request failed',
      };
    }

    if (actualResponseTimeMs > sla.expectedResponseTimeMs * 1.5) {
      // Severe delay
      return {
        compliant: false,
        refundPercentage: sla.refundPercentageOnFailure * 0.5,
        reason: `Response time ${actualResponseTimeMs}ms significantly exceeded SLA of ${sla.expectedResponseTimeMs}ms`,
      };
    }

    if (actualResponseTimeMs > sla.expectedResponseTimeMs) {
      // Moderate delay
      return {
        compliant: false,
        refundPercentage: sla.refundPercentageOnFailure * 0.3,
        reason: `Response time ${actualResponseTimeMs}ms exceeded SLA of ${sla.expectedResponseTimeMs}ms`,
      };
    }

    return {
      compliant: true,
      refundPercentage: 0,
      reason: 'SLA terms met successfully',
    };
  }
}
