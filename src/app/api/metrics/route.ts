import { NextResponse } from 'next/server';
import { TransactionStore } from '@/lib/transaction-store';

export async function GET() {
  try {
    const metrics = TransactionStore.getDashboardMetrics();
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
