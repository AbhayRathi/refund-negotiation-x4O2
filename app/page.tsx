'use client';

import { useEffect, useState } from 'react';
import { Thread, Tx } from '@/lib/memoryStore';
import StatsHeader from '@/components/StatsHeader';
import TransactionTable from '@/components/TransactionTable';
import AgentThread from '@/components/AgentThread';

export default function Dashboard() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2500);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();

      if (data.ok) {
        setThreads(data.threads || []);
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  // Calculate metrics
  const totalTransactions = transactions.length;
  
  const usdcSpent = transactions
    .filter(tx => !tx.originalPaymentId && tx.status !== 'refunded')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const usdcRefunded = transactions
    .filter(tx => tx.originalPaymentId)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const completedThreads = threads.filter(t => t.serviceOk !== undefined);
  const successfulThreads = completedThreads.filter(t => t.serviceOk === true);
  const successRate = completedThreads.length > 0
    ? successfulThreads.length / completedThreads.length
    : 0;

  const handleViewThread = (threadId: string) => {
    const thread = threads.find(t => t.threadId === threadId);
    if (thread) {
      setSelectedThread(thread);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Refund Negotiation Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            AI-powered payment negotiation with SLA-based refunds
          </p>
        </div>

        <StatsHeader
          totalTransactions={totalTransactions}
          usdcSpent={usdcSpent}
          usdcRefunded={usdcRefunded}
          successRate={successRate}
        />

        <TransactionTable
          transactions={transactions}
          threads={threads}
          onViewThread={handleViewThread}
        />

        {selectedThread && (
          <AgentThread
            thread={selectedThread}
            onClose={() => setSelectedThread(null)}
          />
        )}
      </div>
    </div>
  );
}
