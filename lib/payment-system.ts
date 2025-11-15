import { PaymentReceipt, RefundRequest } from '@/lib/types';
import * as crypto from 'crypto';

/**
 * Mock Locus/x402 payment and refund system
 * Simulates payment processing with signed receipts
 */
export class PaymentSystem {
  private static secretKey = 'mock-secret-key-for-signing';

  /**
   * Initiate a payment transaction
   */
  static async initiatePayment(
    transactionId: string,
    amountCents: number
  ): Promise<PaymentReceipt> {
    // Simulate payment processing delay
    await this.delay(100);

    const receipt: PaymentReceipt = {
      id: this.generateReceiptId(),
      transactionId,
      amountCents,
      timestamp: Date.now(),
      signature: '',
      status: 'pending',
    };

    // Generate signature
    receipt.signature = this.signReceipt(receipt);

    return receipt;
  }

  /**
   * Complete a payment transaction
   */
  static async completePayment(
    receiptId: string
  ): Promise<PaymentReceipt> {
    // Simulate payment completion delay
    await this.delay(50);

    // In a real system, this would update the receipt in the database
    // For now, we'll just return a completed status
    const receipt: PaymentReceipt = {
      id: receiptId,
      transactionId: '', // Would be looked up
      amountCents: 0, // Would be looked up
      timestamp: Date.now(),
      signature: '', // Would be looked up
      status: 'completed',
    };

    return receipt;
  }

  /**
   * Process a refund request
   */
  static async processRefund(
    receipt: PaymentReceipt,
    refundAmountCents: number,
    reason: string
  ): Promise<RefundRequest> {
    // Verify receipt signature
    if (!this.verifyReceipt(receipt)) {
      throw new Error('Invalid receipt signature');
    }

    // Simulate refund processing delay
    await this.delay(150);

    const refund: RefundRequest = {
      id: this.generateRefundId(),
      transactionId: receipt.transactionId,
      receiptId: receipt.id,
      reason,
      amountCents: Math.min(refundAmountCents, receipt.amountCents),
      timestamp: Date.now(),
      status: 'approved',
    };

    return refund;
  }

  /**
   * Sign a payment receipt
   */
  private static signReceipt(receipt: PaymentReceipt): string {
    const data = `${receipt.id}:${receipt.transactionId}:${receipt.amountCents}:${receipt.timestamp}`;
    
    // In browser environment, use a simple hash
    if (typeof window !== 'undefined') {
      return this.simpleHash(data);
    }
    
    // In Node environment, use crypto
    try {
      const hmac = crypto.createHmac('sha256', this.secretKey);
      hmac.update(data);
      return hmac.digest('hex');
    } catch {
      return this.simpleHash(data);
    }
  }

  /**
   * Simple hash function for browser environment
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Verify a payment receipt signature
   */
  private static verifyReceipt(receipt: PaymentReceipt): boolean {
    const expectedSignature = this.signReceipt({
      ...receipt,
      signature: '', // Exclude signature from verification
    });
    return expectedSignature === receipt.signature;
  }

  /**
   * Generate a unique receipt ID
   */
  private static generateReceiptId(): string {
    return `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique refund ID
   */
  private static generateRefundId(): string {
    return `rfnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simulate async delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simulate x402 payment protocol headers
   */
  static generateX402Headers(
    transactionId: string,
    priceCents: number
  ): Record<string, string> {
    return {
      'X-Payment-Required': '402',
      'X-Transaction-ID': transactionId,
      'X-Amount-Cents': priceCents.toString(),
      'X-Payment-System': 'locus-x402',
      'X-Timestamp': Date.now().toString(),
    };
  }

  /**
   * Parse x402 payment headers
   */
  static parseX402Headers(headers: Record<string, string>): {
    transactionId?: string;
    amountCents?: number;
    timestamp?: number;
  } {
    return {
      transactionId: headers['X-Transaction-ID'],
      amountCents: headers['X-Amount-Cents'] 
        ? parseInt(headers['X-Amount-Cents']) 
        : undefined,
      timestamp: headers['X-Timestamp'] 
        ? parseInt(headers['X-Timestamp']) 
        : undefined,
    };
  }
}
