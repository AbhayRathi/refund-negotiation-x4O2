import { CrawlValue } from '@/types';

/**
 * HTML-aware crawl value optimizer
 * Computes information value and determines Willingness to Pay (WTP)
 */
export class CrawlValueOptimizer {
  /**
   * Analyze HTML content and compute its value
   */
  static computeValue(htmlContent: string, url: string): CrawlValue {
    const informationValue = this.calculateInformationValue(htmlContent);
    const contentQuality = this.calculateContentQuality(htmlContent);
    const dataPoints = this.countDataPoints(htmlContent);
    const uniqueness = this.calculateUniqueness(htmlContent, url);
    
    // Calculate WTP based on weighted factors
    const willingnessToPayCents = this.calculateWTP({
      informationValue,
      contentQuality,
      dataPoints,
      uniqueness,
    });

    return {
      informationValue,
      contentQuality,
      dataPoints,
      uniqueness,
      willingnessToPayCents,
    };
  }

  /**
   * Calculate information value from HTML structure and content
   */
  private static calculateInformationValue(html: string): number {
    let score = 0;
    
    // Check for structured data
    if (html.includes('application/ld+json')) score += 20;
    if (html.includes('itemscope') || html.includes('itemtype')) score += 15;
    
    // Check for rich content elements
    const tableCount = (html.match(/<table/g) || []).length;
    const listCount = (html.match(/<ul|<ol/g) || []).length;
    const headingCount = (html.match(/<h[1-6]/g) || []).length;
    
    score += Math.min(tableCount * 5, 20);
    score += Math.min(listCount * 3, 15);
    score += Math.min(headingCount * 2, 10);
    
    // Check for metadata
    if (html.includes('<meta name="description"')) score += 10;
    if (html.includes('<meta property="og:')) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate content quality score
   */
  private static calculateContentQuality(html: string): number {
    let score = 50; // baseline
    
    // Text content length (remove HTML tags)
    const textContent = html.replace(/<[^>]*>/g, '');
    const wordCount = textContent.split(/\s+/).length;
    
    if (wordCount > 500) score += 20;
    else if (wordCount > 200) score += 10;
    else if (wordCount < 50) score -= 20;
    
    // Check for multimedia
    if (html.includes('<img')) score += 10;
    if (html.includes('<video') || html.includes('<audio')) score += 10;
    
    // Check for code/technical content
    if (html.includes('<code>') || html.includes('<pre>')) score += 10;
    
    // Penalize excessive ads/scripts
    const scriptCount = (html.match(/<script/g) || []).length;
    if (scriptCount > 10) score -= 15;
    
    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Count distinct data points in the HTML
   */
  private static countDataPoints(html: string): number {
    let count = 0;
    
    // Count structured elements
    count += (html.match(/<tr/g) || []).length; // table rows
    count += (html.match(/<li/g) || []).length; // list items
    count += (html.match(/<article/g) || []).length;
    count += (html.match(/<section/g) || []).length;
    
    // Count form fields
    count += (html.match(/<input/g) || []).length;
    count += (html.match(/<select/g) || []).length;
    
    return count;
  }

  /**
   * Calculate uniqueness score based on content and URL patterns
   */
  private static calculateUniqueness(html: string, url: string): number {
    let score = 50; // baseline
    
    // Dynamic content indicators
    if (url.includes('?') || url.includes('#')) score += 10;
    if (html.includes('data-timestamp') || html.includes('data-id')) score += 15;
    
    // User-generated content indicators
    if (html.includes('comment') || html.includes('review')) score += 10;
    
    // Real-time data indicators
    if (html.includes('price') || html.includes('stock')) score += 15;
    
    // Check for timestamps/dates
    if (html.match(/\d{4}-\d{2}-\d{2}/)) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate Willingness to Pay based on value factors
   */
  private static calculateWTP(factors: {
    informationValue: number;
    contentQuality: number;
    dataPoints: number;
    uniqueness: number;
  }): number {
    const {
      informationValue,
      contentQuality,
      dataPoints,
      uniqueness,
    } = factors;
    
    // Weighted calculation (in cents)
    // Base price: 10 cents
    let priceCents = 10;
    
    // Add value based on information value (0-50 cents)
    priceCents += (informationValue / 100) * 50;
    
    // Add value based on content quality (0-30 cents)
    priceCents += (contentQuality / 100) * 30;
    
    // Add value based on data points (0-40 cents)
    const dataPointsScore = Math.min(dataPoints / 50, 1); // normalize
    priceCents += dataPointsScore * 40;
    
    // Add value based on uniqueness (0-30 cents)
    priceCents += (uniqueness / 100) * 30;
    
    // Round to nearest cent
    return Math.round(priceCents);
  }
}
