// Core types for the refund negotiation system

export interface CrawlRequest {
  id: string;
  url: string;
  timestamp: number;
  htmlContent?: string;
}

export interface CrawlValue {
  informationValue: number; // 0-100 score
  contentQuality: number; // 0-100 score
  dataPoints: number;
  uniqueness: number; // 0-100 score
  willingnessToPayCents: number; // in cents
}

export interface SLA {
  expectedResponseTimeMs: number;
  expectedSuccessRate: number; // 0-1
  refundPercentageOnFailure: number; // 0-1
}

export interface NegotiationOffer {
  id: string;
  crawlRequestId: string;
  proposedPriceCents: number;
  sla: SLA;
  timestamp: number;
}

export type NegotiationDecision = 'accept' | 'counter' | 'reject';

export interface NegotiationResponse {
  decision: NegotiationDecision;
  counterOfferCents?: number;
  reason: string;
  acceptedSLA?: SLA;
}

export interface PaymentReceipt {
  id: string;
  transactionId: string;
  amountCents: number;
  timestamp: number;
  signature: string;
  status: 'pending' | 'completed' | 'refunded';
}

export interface RefundRequest {
  id: string;
  transactionId: string;
  receiptId: string;
  reason: string;
  amountCents: number;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Transaction {
  id: string;
  crawlRequestId: string;
  initialOffer: NegotiationOffer;
  negotiationThread: NegotiationMessage[];
  finalAgreement?: {
    priceCents: number;
    sla: SLA;
  };
  payment?: PaymentReceipt;
  refund?: RefundRequest;
  status: 'negotiating' | 'agreed' | 'paid' | 'completed' | 'refunded' | 'failed';
  actualResponseTimeMs?: number;
  slaSuccess?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NegotiationMessage {
  id: string;
  sender: 'client' | 'server';
  type: 'offer' | 'counter' | 'accept' | 'reject';
  priceCents?: number;
  sla?: SLA;
  reason?: string;
  timestamp: number;
}

export interface DashboardMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  totalRevenueCents: number;
  totalRefundsCents: number;
  averageSLASuccessRate: number;
  activeNegotiations: number;
}
