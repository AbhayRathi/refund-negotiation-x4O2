import { NextRequest, NextResponse } from 'next/server';
import { TransactionStore } from '@/lib/transaction-store';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');

    const transactions = TransactionStore.getTransactions({
      status: status as any,
      limit: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
