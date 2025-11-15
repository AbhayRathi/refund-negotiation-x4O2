'use client';

import { useEffect, useState } from 'react';
import { Transaction, DashboardMetrics } from '@/types';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 3 seconds
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [metricsRes, transactionsRes] = await Promise.all([
        fetch('/api/metrics'),
        fetch('/api/transactions?limit=50'),
      ]);

      const metricsData = await metricsRes.json();
      const transactionsData = await transactionsRes.json();

      setMetrics(metricsData.metrics);
      setTransactions(transactionsData.transactions);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const simulateCrawl = async () => {
    setLoading(true);
    try {
      const sampleUrls = [
        'https://example.com/article/tech-news',
        'https://example.com/product/123',
        'https://example.com/blog/tutorial',
        'https://example.com/data/pricing',
      ];
      
      const sampleHtml = `
        <html>
          <head>
            <meta name="description" content="Sample page">
            <meta property="og:title" content="Test Page">
          </head>
          <body>
            <h1>Main Title</h1>
            <article>
              <h2>Section 1</h2>
              <p>This is sample content with valuable information about technology and innovation.</p>
              <table>
                <tr><td>Data Point 1</td><td>Value 1</td></tr>
                <tr><td>Data Point 2</td><td>Value 2</td></tr>
              </table>
            </article>
            <section>
              <h2>Section 2</h2>
              <ul>
                <li>Item 1</li>
                <li>Item 2</li>
                <li>Item 3</li>
              </ul>
            </section>
          </body>
        </html>
      `;

      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sampleUrls[Math.floor(Math.random() * sampleUrls.length)],
          htmlContent: sampleHtml,
        }),
      });

      if (response.ok) {
        // Refresh data after a short delay to see the result
        setTimeout(fetchData, 500);
      }
    } catch (error) {
      console.error('Error simulating crawl:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCents = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'negotiating':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            AI-powered payment negotiation system for web crawls
          </p>
        </div>

        {/* Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Total Transactions</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {metrics.totalTransactions}
              </div>
              <div className="mt-2 text-sm text-green-600">
                {metrics.activeNegotiations} active negotiations
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Total Revenue</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {formatCents(metrics.totalRevenueCents)}
              </div>
              <div className="mt-2 text-sm text-red-600">
                {formatCents(metrics.totalRefundsCents)} refunded
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">SLA Success Rate</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {(metrics.averageSLASuccessRate * 100).toFixed(1)}%
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {metrics.successfulTransactions} successful
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mb-6">
          <button
            onClick={simulateCrawl}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Simulating...' : 'Simulate New Crawl'}
          </button>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SLA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Refund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {transaction.id.substring(0, 20)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.finalAgreement
                        ? formatCents(transaction.finalAgreement.priceCents)
                        : formatCents(transaction.initialOffer.proposedPriceCents)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {transaction.slaSuccess === true && (
                        <span className="text-green-600">✓ Met</span>
                      )}
                      {transaction.slaSuccess === false && (
                        <span className="text-red-600">✗ Failed</span>
                      )}
                      {transaction.slaSuccess === undefined && (
                        <span className="text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.refund
                        ? formatCents(transaction.refund.amountCents)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {transactions.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No transactions yet. Click &quot;Simulate New Crawl&quot; to get started.
              </div>
            )}
          </div>
        </div>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Transaction Details
                </h3>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Basic Information</h4>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-gray-600">Transaction ID</dt>
                      <dd className="font-mono text-gray-900">{selectedTransaction.id}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Status</dt>
                      <dd>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedTransaction.status)}`}>
                          {selectedTransaction.status}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Created</dt>
                      <dd className="text-gray-900">{formatTimestamp(selectedTransaction.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Updated</dt>
                      <dd className="text-gray-900">{formatTimestamp(selectedTransaction.updatedAt)}</dd>
                    </div>
                  </dl>
                </div>

                {/* Negotiation Thread */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Negotiation Thread</h4>
                  <div className="space-y-3">
                    {selectedTransaction.negotiationThread.map((message, index) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.sender === 'client'
                            ? 'bg-blue-50 ml-8'
                            : 'bg-gray-50 mr-8'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-medium text-gray-600">
                            {message.sender === 'client' ? 'Client' : 'Server'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium capitalize">{message.type}</span>
                          {message.priceCents && (
                            <span className="ml-2">- {formatCents(message.priceCents)}</span>
                          )}
                        </div>
                        {message.reason && (
                          <div className="text-xs text-gray-600 mt-1">{message.reason}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Agreement */}
                {selectedTransaction.finalAgreement && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Final Agreement</h4>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-gray-600">Agreed Price</dt>
                        <dd className="text-gray-900 font-semibold">
                          {formatCents(selectedTransaction.finalAgreement.priceCents)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Expected Response Time</dt>
                        <dd className="text-gray-900">
                          {selectedTransaction.finalAgreement.sla.expectedResponseTimeMs}ms
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Success Rate</dt>
                        <dd className="text-gray-900">
                          {(selectedTransaction.finalAgreement.sla.expectedSuccessRate * 100).toFixed(0)}%
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Refund on Failure</dt>
                        <dd className="text-gray-900">
                          {(selectedTransaction.finalAgreement.sla.refundPercentageOnFailure * 100).toFixed(0)}%
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* SLA Evaluation */}
                {selectedTransaction.actualResponseTimeMs !== undefined && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">SLA Evaluation</h4>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-gray-600">Actual Response Time</dt>
                        <dd className="text-gray-900">
                          {selectedTransaction.actualResponseTimeMs.toFixed(0)}ms
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">SLA Met</dt>
                        <dd>
                          {selectedTransaction.slaSuccess ? (
                            <span className="text-green-600 font-medium">✓ Yes</span>
                          ) : (
                            <span className="text-red-600 font-medium">✗ No</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Payment Info */}
                {selectedTransaction.payment && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Information</h4>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-gray-600">Receipt ID</dt>
                        <dd className="font-mono text-gray-900">{selectedTransaction.payment.id}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Amount</dt>
                        <dd className="text-gray-900 font-semibold">
                          {formatCents(selectedTransaction.payment.amountCents)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Status</dt>
                        <dd className="text-gray-900 capitalize">{selectedTransaction.payment.status}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Signature</dt>
                        <dd className="font-mono text-xs text-gray-900 truncate">
                          {selectedTransaction.payment.signature}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {/* Refund Info */}
                {selectedTransaction.refund && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Refund Information</h4>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-gray-600">Refund ID</dt>
                        <dd className="font-mono text-gray-900">{selectedTransaction.refund.id}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Amount</dt>
                        <dd className="text-gray-900 font-semibold">
                          {formatCents(selectedTransaction.refund.amountCents)}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-gray-600">Reason</dt>
                        <dd className="text-gray-900">{selectedTransaction.refund.reason}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-600">Status</dt>
                        <dd className="text-gray-900 capitalize">{selectedTransaction.refund.status}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
