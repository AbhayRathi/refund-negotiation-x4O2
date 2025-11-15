import {
  Transaction,
  NegotiationOffer,
  NegotiationMessage,
  PaymentReceipt,
  RefundRequest,
  DashboardMetrics,
  CrawlRequest,
  SLA,
} from '@/types';

/**
 * In-memory transaction store
 * Manages all transactions, negotiations, and related data
 */
export class TransactionStore {
  private static transactions = new Map<string, Transaction>();
  private static crawlRequests = new Map<string, CrawlRequest>();

  /**
   * Create a new transaction
   */
  static createTransaction(
    crawlRequest: CrawlRequest,
    initialOffer: NegotiationOffer
  ): Transaction {
    const transaction: Transaction = {
      id: this.generateId('txn'),
      crawlRequestId: crawlRequest.id,
      initialOffer,
      negotiationThread: [
        {
          id: this.generateId('msg'),
          sender: 'client',
          type: 'offer',
          priceCents: initialOffer.proposedPriceCents,
          sla: initialOffer.sla,
          timestamp: Date.now(),
        },
      ],
      status: 'negotiating',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.transactions.set(transaction.id, transaction);
    this.crawlRequests.set(crawlRequest.id, crawlRequest);

    return transaction;
  }

  /**
   * Add a message to the negotiation thread
   */
  static addNegotiationMessage(
    transactionId: string,
    message: Omit<NegotiationMessage, 'id' | 'timestamp'>
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const fullMessage: NegotiationMessage = {
      id: this.generateId('msg'),
      timestamp: Date.now(),
      ...message,
    };

    transaction.negotiationThread.push(fullMessage);
    transaction.updatedAt = Date.now();

    this.transactions.set(transactionId, transaction);
  }

  /**
   * Finalize agreement
   */
  static finalizeAgreement(
    transactionId: string,
    priceCents: number,
    sla: SLA
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    transaction.finalAgreement = { priceCents, sla };
    transaction.status = 'agreed';
    transaction.updatedAt = Date.now();

    this.transactions.set(transactionId, transaction);
  }

  /**
   * Record payment
   */
  static recordPayment(
    transactionId: string,
    receipt: PaymentReceipt
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    transaction.payment = receipt;
    transaction.status = receipt.status === 'completed' ? 'paid' : 'agreed';
    transaction.updatedAt = Date.now();

    this.transactions.set(transactionId, transaction);
  }

  /**
   * Update payment status
   */
  static updatePaymentStatus(
    transactionId: string,
    status: PaymentReceipt['status']
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || !transaction.payment) {
      throw new Error(`Transaction or payment not found`);
    }

    transaction.payment.status = status;
    if (status === 'completed') {
      transaction.status = 'paid';
    } else if (status === 'refunded') {
      transaction.status = 'refunded';
    }
    transaction.updatedAt = Date.now();

    this.transactions.set(transactionId, transaction);
  }

  /**
   * Record refund
   */
  static recordRefund(
    transactionId: string,
    refund: RefundRequest
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    transaction.refund = refund;
    if (refund.status === 'approved') {
      transaction.status = 'refunded';
      if (transaction.payment) {
        transaction.payment.status = 'refunded';
      }
    }
    transaction.updatedAt = Date.now();

    this.transactions.set(transactionId, transaction);
  }

  /**
   * Record SLA evaluation
   */
  static recordSLAEvaluation(
    transactionId: string,
    actualResponseTimeMs: number,
    success: boolean
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || !transaction.finalAgreement) {
      throw new Error(`Transaction or agreement not found`);
    }

    transaction.actualResponseTimeMs = actualResponseTimeMs;
    
    // Determine SLA success
    const slaSuccess = success && 
      actualResponseTimeMs <= transaction.finalAgreement.sla.expectedResponseTimeMs;
    
    transaction.slaSuccess = slaSuccess;
    transaction.status = 'completed';
    transaction.updatedAt = Date.now();

    this.transactions.set(transactionId, transaction);
  }

  /**
   * Reject transaction
   */
  static rejectTransaction(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    transaction.status = 'failed';
    transaction.updatedAt = Date.now();

    this.transactions.set(transactionId, transaction);
  }

  /**
   * Get a transaction by ID
   */
  static getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  /**
   * Get all transactions
   */
  static getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  /**
   * Get transactions with filters
   */
  static getTransactions(filter?: {
    status?: Transaction['status'];
    limit?: number;
  }): Transaction[] {
    let transactions = this.getAllTransactions();

    if (filter?.status) {
      transactions = transactions.filter(t => t.status === filter.status);
    }

    if (filter?.limit) {
      transactions = transactions.slice(0, filter.limit);
    }

    return transactions;
  }

  /**
   * Get dashboard metrics
   */
  static getDashboardMetrics(): DashboardMetrics {
    const transactions = this.getAllTransactions();

    const totalTransactions = transactions.length;
    const completedTransactions = transactions.filter(
      t => t.status === 'completed' || t.status === 'paid'
    );
    const successfulTransactions = completedTransactions.filter(
      t => t.slaSuccess === true
    ).length;

    const totalRevenueCents = transactions
      .filter(t => t.payment?.status === 'completed' || t.payment?.status === 'pending')
      .reduce((sum, t) => sum + (t.payment?.amountCents || 0), 0);

    const totalRefundsCents = transactions
      .filter(t => t.refund?.status === 'approved')
      .reduce((sum, t) => sum + (t.refund?.amountCents || 0), 0);

    const slaEvaluatedCount = transactions.filter(
      t => t.slaSuccess !== undefined
    ).length;
    const slaSuccessCount = transactions.filter(
      t => t.slaSuccess === true
    ).length;
    const averageSLASuccessRate = slaEvaluatedCount > 0
      ? slaSuccessCount / slaEvaluatedCount
      : 0;

    const activeNegotiations = transactions.filter(
      t => t.status === 'negotiating'
    ).length;

    return {
      totalTransactions,
      successfulTransactions,
      totalRevenueCents,
      totalRefundsCents,
      averageSLASuccessRate,
      activeNegotiations,
    };
  }

  /**
   * Clear all data (for testing)
   */
  static clear(): void {
    this.transactions.clear();
    this.crawlRequests.clear();
  }

  /**
   * Generate a unique ID
   */
  private static generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
