import { NextRequest, NextResponse } from 'next/server';
import { CrawlValueOptimizer } from '@/lib/crawl-value-optimizer';
import { NegotiationEngine } from '@/lib/negotiation-engine';
import { PaymentSystem } from '@/lib/payment-system';
import { TransactionStore } from '@/lib/transaction-store';

const negotiationEngine = new NegotiationEngine();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, htmlContent } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'Missing url' },
        { status: 400 }
      );
    }

    // Generate crawl request
    const crawlRequest = {
      id: `crawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      htmlContent: htmlContent || '<html><body>Sample content for testing</body></html>',
      timestamp: Date.now(),
    };

    // Compute value
    const crawlValue = CrawlValueOptimizer.computeValue(
      crawlRequest.htmlContent,
      crawlRequest.url
    );

    // Generate initial offer from client
    const clientOffer = {
      id: `offer_${Date.now()}`,
      crawlRequestId: crawlRequest.id,
      proposedPriceCents: Math.round(crawlValue.willingnessToPayCents * 0.7), // Start at 70%
      sla: {
        expectedResponseTimeMs: 3000,
        expectedSuccessRate: 0.95,
        refundPercentageOnFailure: 0.6,
      },
      timestamp: Date.now(),
    };

    // Create transaction
    const transaction = TransactionStore.createTransaction(crawlRequest, clientOffer);

    // Evaluate offer
    const response = negotiationEngine.evaluateOffer(
      clientOffer,
      crawlValue,
      0
    );

    // Add response to thread
    TransactionStore.addNegotiationMessage(transaction.id, {
      sender: 'server',
      type: response.decision,
      priceCents: response.counterOfferCents,
      sla: response.acceptedSLA,
      reason: response.reason,
    });

    if (response.decision === 'accept') {
      // Finalize and process payment
      TransactionStore.finalizeAgreement(
        transaction.id,
        clientOffer.proposedPriceCents,
        clientOffer.sla
      );

      const receipt = await PaymentSystem.initiatePayment(
        transaction.id,
        clientOffer.proposedPriceCents
      );

      TransactionStore.recordPayment(transaction.id, receipt);

      // Simulate crawl completion
      setTimeout(() => {
        const actualResponseTime = Math.random() * 4000; // Random 0-4s
        const success = Math.random() > 0.1; // 90% success rate

        TransactionStore.recordSLAEvaluation(
          transaction.id,
          actualResponseTime,
          success
        );

        // Update payment status
        TransactionStore.updatePaymentStatus(transaction.id, 'completed');

        // Check if refund needed
        const slaEval = negotiationEngine.evaluateSLACompliance(
          clientOffer.sla,
          actualResponseTime,
          success
        );

        if (!slaEval.compliant && receipt) {
          const refundAmount = Math.round(
            receipt.amountCents * slaEval.refundPercentage
          );

          PaymentSystem.processRefund(
            receipt,
            refundAmount,
            slaEval.reason
          ).then(refund => {
            TransactionStore.recordRefund(transaction.id, refund);
          });
        }
      }, 2000);
    } else if (response.decision === 'reject') {
      TransactionStore.rejectTransaction(transaction.id);
    }

    return NextResponse.json({
      crawlRequest,
      crawlValue,
      transaction: TransactionStore.getTransaction(transaction.id),
      negotiationResponse: response,
    });
  } catch (error) {
    console.error('Crawl simulation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
