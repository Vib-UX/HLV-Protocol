import React, { useState } from 'react';
import { useBackend } from '@/hooks/useBackend';

interface CreateSwapProps {
  onCreate: () => void;
}

export const CreateSwap: React.FC<CreateSwapProps> = ({ onCreate }) => {
  const { createSwap, loading, error } = useBackend();
  
  const [direction, setDirection] = useState<'hedera_to_lightning' | 'lightning_to_hedera'>(
    'hedera_to_lightning'
  );
  const [lightningInvoice, setLightningInvoice] = useState('');
  const [amount, setAmount] = useState('');
  const [userAddress, setUserAddress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Calculate timelock (24 hours from now)
      const timelock = Math.floor(Date.now() / 1000) + 86400;

      await createSwap({
        direction,
        lightningInvoice,
        htlcAmount: amount,
        userAddress,
        timelock,
      });

      // Reset form
      setLightningInvoice('');
      setAmount('');
      setUserAddress('');

      // Navigate to active swaps
      onCreate();
    } catch (err) {
      console.error('Failed to create swap:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Create New Swap</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Direction Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Swap Direction
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setDirection('hedera_to_lightning')}
              className={`p-4 border-2 rounded-lg transition-all ${
                direction === 'hedera_to_lightning'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-lg font-semibold mb-1">Hedera → Lightning</div>
              <div className="text-sm text-gray-600">
                Pay Lightning invoice with wBTC
              </div>
            </button>
            <button
              type="button"
              onClick={() => setDirection('lightning_to_hedera')}
              className={`p-4 border-2 rounded-lg transition-all ${
                direction === 'lightning_to_hedera'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-lg font-semibold mb-1">Lightning → Hedera</div>
              <div className="text-sm text-gray-600">
                Receive wBTC for Lightning payment
              </div>
            </button>
          </div>
        </div>

        {/* Lightning Invoice */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lightning Invoice
          </label>
          <textarea
            value={lightningInvoice}
            onChange={(e) => setLightningInvoice(e.target.value)}
            placeholder="lnbc..."
            rows={3}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (wBTC in wei)
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000000"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter amount in wei (smallest unit)
          </p>
        </div>

        {/* User Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Hedera Address
          </label>
          <input
            type="text"
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
            placeholder="0x..."
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Swap...' : 'Create Swap'}
        </button>
      </form>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. Lock wBTC on Hedera with Lightning payment hash</li>
          <li>2. Agent monitors and pays Lightning invoice</li>
          <li>3. Agent submits preimage to claim wBTC</li>
          <li>4. Fully atomic and trustless ✓</li>
        </ul>
      </div>
    </div>
  );
};

