import { CrawlCandidate, optimizeValue, ValueResult } from './valueOptimizer';

/**
 * Value assessor wraps the optimizer and adds SLA + refund floor calculation
 */

export interface QuoteContext {
  domain?: string;
  urls?: string[];
  htmlSnippets?: Array<{ url: string; html: string }>;
  dupRateEst?: number;
  freshnessNeedMs?: number;
  qualityTarget?: number;
  deadlineMs?: number;
  riskFail?: number;
}

export interface QuoteResult extends ValueResult {
  sla: {
    latencyMaxMs: number;
    qualityMin: number;
  };
  refundFloor: number;
}

/**
 * Generate quote with value assessment, SLA, and refund floor
 */
export function quoteValue(ctx: QuoteContext): QuoteResult {
  const {
    domain = 'example.com',
    urls = [],
    htmlSnippets = [],
    dupRateEst = 0.1,
    freshnessNeedMs = 86400000, // 1 day
    qualityTarget = 0.8,
    deadlineMs = 5000,
    riskFail = 0.1,
  } = ctx;

  // Build candidates from htmlSnippets or urls
  const candidates: CrawlCandidate[] = [];

  if (htmlSnippets.length > 0) {
    htmlSnippets.forEach((snippet, idx) => {
      candidates.push({
        id: `snippet_${idx}`,
        url: snippet.url,
        domain,
        depth: 1,
        freshness: 0.9, // Assume fresh if provided
        quality: qualityTarget,
        dup: dupRateEst,
        cost: 0.001 + Math.random() * 0.002, // Small random cost in USDC
        html: snippet.html,
      });
    });
  } else if (urls.length > 0) {
    urls.forEach((url, idx) => {
      candidates.push({
        id: `url_${idx}`,
        url,
        domain,
        depth: 1,
        freshness: 0.8,
        quality: qualityTarget,
        dup: dupRateEst,
        cost: 0.001 + Math.random() * 0.002,
      });
    });
  } else {
    // Create a default candidate
    candidates.push({
      id: 'default',
      url: `https://${domain}`,
      domain,
      depth: 1,
      freshness: 0.7,
      quality: qualityTarget,
      dup: dupRateEst,
      cost: 0.001,
    });
  }

  // Run optimizer
  const result = optimizeValue(candidates, 3);

  // Calculate SLA
  const sla = {
    latencyMaxMs: deadlineMs,
    qualityMin: qualityTarget,
  };

  // Calculate refund floor
  // refundFloor = clamp((riskFail * 0.8), 0.3, 0.9)
  const refundFloor = Math.max(0.3, Math.min(0.9, riskFail * 0.8));

  return {
    ...result,
    sla,
    refundFloor,
  };
}
