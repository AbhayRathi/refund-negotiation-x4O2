import { describe, it, expect } from 'vitest';
import { infoGainFromHTML, optimizeValue, CrawlCandidate } from '@/lib/valueOptimizer';

describe('valueOptimizer', () => {
  describe('infoGainFromHTML', () => {
    it('should return higher score for more unique content', () => {
      const uniqueHTML = '<html><body><p>unique alpha beta gamma delta epsilon zeta eta theta iota kappa</p></body></html>';
      const repetitiveHTML = '<html><body><p>test test test test test test test test test test</p></body></html>';

      const uniqueScore = infoGainFromHTML(uniqueHTML);
      const repetitiveScore = infoGainFromHTML(repetitiveHTML);

      expect(uniqueScore).toBeGreaterThan(repetitiveScore);
      expect(uniqueScore).toBeGreaterThan(0.5);
      expect(repetitiveScore).toBeLessThan(0.5);
    });

    it('should handle empty HTML', () => {
      const score = infoGainFromHTML('<html><body></body></html>');
      expect(score).toBe(0);
    });

    it('should clamp values between 0 and 1', () => {
      const html = '<html><body><p>Some content here</p></body></html>';
      const score = infoGainFromHTML(html);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('optimizeValue', () => {
    it('should return ev_usdc > 0 and wtp_usdc = 0.7 * ev', () => {
      const candidates: CrawlCandidate[] = [
        {
          id: '1',
          url: 'https://example.com',
          domain: 'example.com',
          depth: 1,
          freshness: 0.9,
          quality: 0.8,
          dup: 0.1,
          cost: 0.001,
          html: '<html><body><p>High quality content with many unique words</p></body></html>',
        },
      ];

      const result = optimizeValue(candidates, 3);

      expect(result.ev_usdc).toBeGreaterThan(0);
      expect(result.wtp_usdc).toBeCloseTo(result.ev_usdc * 0.7, 4);
      expect(result.best).toBeDefined();
    });

    it('should select best candidate from multiple options', () => {
      const candidates: CrawlCandidate[] = [
        {
          id: '1',
          url: 'https://example.com/low',
          domain: 'example.com',
          depth: 1,
          freshness: 0.5,
          quality: 0.5,
          dup: 0.5,
          cost: 0.002,
        },
        {
          id: '2',
          url: 'https://example.com/high',
          domain: 'example.com',
          depth: 1,
          freshness: 0.9,
          quality: 0.9,
          dup: 0.1,
          cost: 0.001,
          html: '<html><body><h1>Title</h1><p>Excellent unique content with valuable information</p></body></html>',
        },
      ];

      const result = optimizeValue(candidates, 3);

      // Should select the higher quality candidate
      expect(result.best.id).toBe('2');
      expect(result.ev_usdc).toBeGreaterThan(0);
    });
  });
});
