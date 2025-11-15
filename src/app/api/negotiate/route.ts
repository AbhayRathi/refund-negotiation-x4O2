import { NextRequest, NextResponse } from 'next/server';
import { CrawlValueOptimizer } from '@/lib/crawl-value-optimizer';
import { NegotiationEngine } from '@/lib/negotiation-engine';
import { PaymentSystem } from '@/lib/payment-system';
import { TransactionStore } from '@/lib/transaction-store';
import { CrawlRequest, NegotiationOffer } from '@/types';

const negotiationEngine = new NegotiationEngine();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { crawlRequest, offer } = body as {
      crawlRequest: CrawlRequest;
      offer: NegotiationOffer;
    };

    // Validate input
    if (!crawlRequest || !offer) {
      return NextResponse.json(
        { error: 'Missing crawlRequest or offer' },
        { status: 400 }
      );
    }

    // Create or get existing transaction
    let transaction = TransactionStore.getTransaction(offer.crawlRequestId);
    
    if (!transaction) {
      // New negotiation
      transaction = TransactionStore.createTransaction(crawlRequest, offer);
    }

    // Compute crawl value
    const crawlValue = CrawlValueOptimizer.computeValue(
      crawlRequest.htmlContent || '<html><body>Sample content</body></html>',
      crawlRequest.url
    );

    // Count existing counter-offers
    const counterOfferCount = transaction.negotiationThread.filter(
      msg => msg.type === 'counter'
    ).length;

    // Evaluate the offer
    const response = negotiationEngine.evaluateOffer(
      offer,
      crawlValue,
      counterOfferCount
    );

    // Add response to negotiation thread
    TransactionStore.addNegotiationMessage(transaction.id, {
      sender: 'server',
      type: response.decision,
      priceCents: response.counterOfferCents,
      sla: response.acceptedSLA,
      reason: response.reason,
    });

    // Handle decision
    if (response.decision === 'accept') {
      // Finalize agreement
      TransactionStore.finalizeAgreement(
        transaction.id,
        offer.proposedPriceCents,
        offer.sla
      );

      // Initiate payment
      const receipt = await PaymentSystem.initiatePayment(
        transaction.id,
        offer.proposedPriceCents
      );

      TransactionStore.recordPayment(transaction.id, receipt);

      return NextResponse.json({
        decision: 'accept',
        transactionId: transaction.id,
        receipt,
        message: response.reason,
      });
    } else if (response.decision === 'counter') {
      // Return counter-offer
      return NextResponse.json({
        decision: 'counter',
        transactionId: transaction.id,
        counterOffer: {
          priceCents: response.counterOfferCents,
          sla: negotiationEngine.generateReasonableSLA(),
        },
        message: response.reason,
      });
    } else {
      // Reject
      TransactionStore.rejectTransaction(transaction.id);

      return NextResponse.json({
        decision: 'reject',
        transactionId: transaction.id,
        message: response.reason,
      });
    }
  } catch (error) {
    console.error('Negotiation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Missing transactionId' },
        { status: 400 }
      );
    }

    const transaction = TransactionStore.getTransaction(transactionId);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Error fetching negotiation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
