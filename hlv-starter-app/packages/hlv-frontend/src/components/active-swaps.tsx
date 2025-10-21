import React, { useEffect, useState } from 'react';
import { useBackend, type Swap } from '@/hooks/useBackend';
import { formatAddress, formatAmount, formatTimestamp } from '@/lib/utils';

export const ActiveSwaps: React.FC = () => {
  const { listSwaps, cancelSwap, loading } = useBackend();
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSwaps = async () => {
    setRefreshing(true);
    try {
      const result = await listSwaps();
      setSwaps(result.swaps);
    } catch (err) {
      console.error('Failed to fetch swaps:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSwaps();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchSwaps, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (swapId: string) => {
    if (!confirm('Are you sure you want to cancel this swap?')) return;

    try {
      await cancelSwap(swapId);
      await fetchSwaps();
    } catch (err) {
      console.error('Failed to cancel swap:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'htlc_locked':
      case 'lightning_paid':
      case 'preimage_submitted':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && swaps.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Active Swaps</h2>
        <button
          onClick={fetchSwaps}
          disabled={refreshing}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {swaps.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">No swaps yet</p>
          <p className="text-gray-500 text-sm mt-2">Create your first swap to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {swaps.map((swap) => (
            <div
              key={swap.swapId}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-600">
                      {swap.swapId}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(
                        swap.status
                      )}`}
                    >
                      {swap.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatTimestamp(swap.createdAt)}
                  </div>
                </div>
                {swap.status === 'pending' && (
                  <button
                    onClick={() => handleCancel(swap.swapId)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Direction</div>
                  <div className="font-medium">
                    {swap.direction === 'hedera_to_lightning'
                      ? '🔗 Hedera → ⚡ Lightning'
                      : '⚡ Lightning → 🔗 Hedera'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Amount</div>
                  <div className="font-medium">{formatAmount(swap.htlcAmount)} wBTC</div>
                </div>
                <div>
                  <div className="text-gray-500">User Address</div>
                  <div className="font-mono">{formatAddress(swap.userAddress)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Payment Hash</div>
                  <div className="font-mono">{formatAddress(swap.paymentHash)}</div>
                </div>
              </div>

              {swap.error && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                  Error: {swap.error}
                </div>
              )}

              {swap.htlcTxHash && (
                <div className="mt-3 text-sm">
                  <span className="text-gray-500">HTLC Tx:</span>{' '}
                  <span className="font-mono">{formatAddress(swap.htlcTxHash)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

