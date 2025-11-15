'use client';

import { Thread, Tx } from '@/lib/memoryStore';

interface TransactionTableProps {
  transactions: Tx[];
  threads: Thread[];
  onViewThread: (threadId: string) => void;
}

export default function TransactionTable({
  transactions,
  threads,
  onViewThread,
}: TransactionTableProps) {
  const getThreadForTx = (tx: Tx): Thread | undefined => {
    return threads.find(t => t.paymentId && transactions.some(t2 => t2.id === tx.id));
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount (USDC)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Receipt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                  {tx.id.substring(0, 16)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tx.originalPaymentId ? 'Refund' : 'Payment'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  ${tx.amount.toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      tx.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : tx.status === 'refunded'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {tx.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {tx.receiptId ? (
                    <a
                      href={`/api/receipts/${tx.receiptId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {/* Find associated thread and show view button */}
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => {
                      // Find thread with matching payment
                      const thread = threads.find(t => 
                        t.paymentId && transactions.some(t2 => t2.id === tx.id && t2.receiptId)
                      );
                      if (thread) {
                        onViewThread(thread.threadId);
                      }
                    }}
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {transactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No transactions yet
          </div>
        )}
      </div>
    </div>
  );
}
