import { JSDOM } from 'jsdom';

/**
 * Grover-inspired HTML-aware crawl value optimizer
 * Computes Expected Value (EV) and Willingness to Pay (WTP) in USDC
 */

export interface CrawlCandidate {
  id: string;
  url: string;
  domain: string;
  depth: number;
  freshness: number;  // 0-1, higher is fresher
  quality: number;    // 0-1, expected content quality
  dup: number;        // 0-1, duplication rate
  cost: number;       // in USDC
  html?: string;
}

export interface ValueResult {
  best: CrawlCandidate;
  ev_usdc: number;
  wtp_usdc: number;
}

/**
 * Extract information gain from HTML using entropy proxy
 */
export function infoGainFromHTML(html: string): number {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract text content
    const text = document.body?.textContent || '';
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) {
      return 0;
    }
    
    // Calculate unique/total ratio as entropy proxy
    const uniqueWords = new Set(words);
    const uniqueRatio = uniqueWords.size / words.length;
    
    // More unique words = higher information gain
    // Clamp to 0-1
    return Math.min(Math.max(uniqueRatio, 0), 1);
  } catch (error) {
    console.error('Error parsing HTML:', error);
    return 0.1; // Default low value on parse error
  }
}

/**
 * Score a candidate
 */
function scoreCandidate(candidate: CrawlCandidate): number {
  const { quality, dup, freshness, cost, html } = candidate;
  
  // If HTML is available, use it to boost content score
  let contentScore = 1.0;
  if (html) {
    const infoGain = infoGainFromHTML(html);
    contentScore = 0.5 + (infoGain * 0.5); // Blend with base score
  }
  
  // Score formula: (contentScore * quality * (1-dup) * freshness) / (cost + epsilon)
  const score = (contentScore * quality * (1 - dup) * freshness) / (cost + 1e-6);
  
  return score;
}

/**
 * Perturb a candidate by adjusting depth/freshness
 */
function perturbCandidate(candidate: CrawlCandidate): CrawlCandidate {
  const depthDelta = (Math.random() - 0.5) * 0.2;
  const freshnessDelta = (Math.random() - 0.5) * 0.1;
  
  return {
    ...candidate,
    depth: Math.max(0, candidate.depth + depthDelta),
    freshness: Math.max(0, Math.min(1, candidate.freshness + freshnessDelta)),
  };
}

/**
 * Grover-style optimization
 * Iteratively rank candidates, keep top-k, perturb neighbors
 */
export function optimizeValue(candidates: CrawlCandidate[], iters: number = 3): ValueResult {
  if (candidates.length === 0) {
    throw new Error('No candidates provided');
  }
  
  let currentCandidates = [...candidates];
  
  for (let iter = 0; iter < iters; iter++) {
    // Score all candidates
    const scored = currentCandidates.map(c => ({
      candidate: c,
      score: scoreCandidate(c),
    }));
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    // Keep top-k (approximately sqrt(N))
    const k = Math.max(1, Math.floor(Math.sqrt(currentCandidates.length)));
    const topK = scored.slice(0, k);
    
    // Generate perturbed neighbors for next iteration
    if (iter < iters - 1) {
      const nextGen: CrawlCandidate[] = [];
      for (const { candidate } of topK) {
        nextGen.push(candidate);
        // Add 2 perturbed versions
        nextGen.push(perturbCandidate(candidate));
        nextGen.push(perturbCandidate(candidate));
      }
      currentCandidates = nextGen;
    }
  }
  
  // Final scoring
  const scored = currentCandidates.map(c => ({
    candidate: c,
    score: scoreCandidate(c),
  }));
  scored.sort((a, b) => b.score - a.score);
  
  const best = scored[0].candidate;
  const bestScore = scored[0].score;
  
  // Convert score to EV in USDC (scale factor 0.01)
  const ev_usdc = bestScore * 0.01;
  
  // WTP is 70% of EV
  const wtp_usdc = ev_usdc * 0.7;
  
  return {
    best,
    ev_usdc,
    wtp_usdc,
  };
}
