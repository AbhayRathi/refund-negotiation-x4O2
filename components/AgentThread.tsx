'use client';

import { Thread } from '@/lib/memoryStore';

interface AgentThreadProps {
  thread: Thread;
  onClose: () => void;
}

export default function AgentThread({ thread, onClose }: AgentThreadProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Negotiation Thread</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Thread Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Thread Information</h4>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-600">Thread ID</dt>
                <dd className="font-mono text-gray-900">{thread.threadId}</dd>
              </div>
              <div>
                <dt className="text-gray-600">WTP (USDC)</dt>
                <dd className="text-gray-900 font-semibold">
                  ${thread.wtp_usdc?.toFixed(4) || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-600">EV (USDC)</dt>
                <dd className="text-gray-900">${thread.ev_usdc?.toFixed(4) || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-gray-600">Accepted Price</dt>
                <dd className="text-gray-900 font-semibold">
                  {thread.acceptedPrice ? `$${thread.acceptedPrice.toFixed(4)}` : 'Not accepted'}
                </dd>
              </div>
            </dl>
          </div>

          {/* SLA */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">SLA Terms</h4>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-600">Max Latency</dt>
                <dd className="text-gray-900">{thread.sla.latencyMaxMs}ms</dd>
              </div>
              <div>
                <dt className="text-gray-600">Min Quality</dt>
                <dd className="text-gray-900">{(thread.sla.qualityMin * 100).toFixed(0)}%</dd>
              </div>
              <div>
                <dt className="text-gray-600">Refund Floor</dt>
                <dd className="text-gray-900">
                  {thread.refundFloor ? `${(thread.refundFloor * 100).toFixed(0)}%` : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-600">Service Status</dt>
                <dd>
                  {thread.serviceOk === true && (
                    <span className="text-green-600 font-medium">✓ Success</span>
                  )}
                  {thread.serviceOk === false && (
                    <span className="text-red-600 font-medium">✗ Failed SLA</span>
                  )}
                  {thread.serviceOk === undefined && (
                    <span className="text-gray-400">Pending</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Negotiation History */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Negotiation History</h4>
            <div className="space-y-3">
              {thread.history.map((turn, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    turn.from === 'buyer' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium text-gray-600 capitalize">
                      {turn.from}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(turn.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    {turn.offer && (
                      <div>
                        <span className="font-medium">Offer:</span> ${turn.offer.toFixed(4)} USDC
                      </div>
                    )}
                    {turn.counter && (
                      <div>
                        <span className="font-medium">Counter:</span> ${turn.counter.toFixed(4)} USDC
                      </div>
                    )}
                    {turn.accept && (
                      <div>
                        <span className="font-medium text-green-600">Accepted:</span> ${turn.accept.toFixed(4)} USDC
                      </div>
                    )}
                    {turn.message && (
                      <div className="text-xs text-gray-600 mt-1">{turn.message}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Result */}
          {thread.serviceResult && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Service Result</h4>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-600">Actual Latency</dt>
                  <dd className="text-gray-900">{thread.serviceResult.latencyMs.toFixed(0)}ms</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Actual Quality</dt>
                  <dd className="text-gray-900">{(thread.serviceResult.quality * 100).toFixed(1)}%</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
