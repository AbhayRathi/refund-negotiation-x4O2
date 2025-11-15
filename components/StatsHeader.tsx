'use client';

interface StatsHeaderProps {
  totalTransactions: number;
  usdcSpent: number;
  usdcRefunded: number;
  successRate: number;
}

export default function StatsHeader({
  totalTransactions,
  usdcSpent,
  usdcRefunded,
  successRate,
}: StatsHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm font-medium text-gray-600">Total Transactions</div>
        <div className="mt-2 text-3xl font-bold text-gray-900">{totalTransactions}</div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm font-medium text-gray-600">USDC Spent</div>
        <div className="mt-2 text-3xl font-bold text-gray-900">
          ${usdcSpent.toFixed(4)}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm font-medium text-gray-600">USDC Refunded</div>
        <div className="mt-2 text-3xl font-bold text-red-600">
          ${usdcRefunded.toFixed(4)}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm font-medium text-gray-600">Success Rate</div>
        <div className="mt-2 text-3xl font-bold text-green-600">
          {(successRate * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}
