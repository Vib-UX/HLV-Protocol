import React, { useState } from "react";
import { useBackend } from "@/hooks/useBackend";
import { formatAmount } from "@/lib/utils";
import { env } from "@/config/env";

const { VITE_BACKEND_URL } = env;

interface RebalanceProps {
  userAddress: string;
  wbtcBalance: string; // in wei
  onSuccess: () => void;
}

interface RebalanceResult {
  message: string;
  userAddress: string;
  status: string;
}

export const Rebalance: React.FC<RebalanceProps> = ({
  userAddress,
  wbtcBalance,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [nwcUri, setNwcUri] = useState("");
  const [success, setSuccess] = useState<RebalanceResult | null>(null);

  // Calculate rebalance amount (20% of balance)
  const rebalanceAmount = (BigInt(wbtcBalance) * BigInt(20)) / BigInt(100);
  const rebalanceSats = Number(rebalanceAmount / BigInt(10 ** 10)); // Convert to sats

  const handleRebalance = async () => {
    if (!nwcUri) {
      setError("Please enter your NWC URI");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${VITE_BACKEND_URL}/api/rebalance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress,
          wbtcBalanceWei: wbtcBalance,
          nwcUri,
          network: "testnet",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to trigger rebalance");
      }

      const result = await response.json();
      console.log("Rebalance triggered:", result);

      setSuccess(result);

      // Auto-close dialog after showing success for 3 seconds
      setTimeout(() => {
        setShowDialog(false);
        setSuccess(null);
        setNwcUri("");
        onSuccess();
      }, 3000);
    } catch (err) {
      console.error("Rebalance error:", err);
      setError(err instanceof Error ? err.message : "Rebalance failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    setError(null);
    setSuccess(null);
  };

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg"
      >
        ⚡ Rebalance (20%)
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Rebalance to Lightning</h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Rebalance Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Balance:</span>
                  <span className="font-medium">
                    {formatAmount(wbtcBalance, 8)} wBTC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rebalance Amount (20%):</span>
                  <span className="font-medium">
                    {formatAmount(rebalanceAmount.toString(), 8)} wBTC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lightning Invoice:</span>
                  <span className="font-medium">
                    {formatAmount(rebalanceSats, 0)} sats
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NWC URI (Nostr Wallet Connect)
              </label>
              <input
                type="text"
                value={nwcUri}
                onChange={(e) => setNwcUri(e.target.value)}
                placeholder="nostr+walletconnect://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from your Lightning wallet (Alby, Mutiny, etc.)
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-yellow-900 text-sm mb-2">
                How it works:
              </h4>
              <ol className="text-xs text-yellow-800 space-y-1">
                <li>1. Creates Lightning invoice for {rebalanceSats} sats</li>
                <li>2. Locks your wBTC in HTLC on Hedera</li>
                <li>3. Agent pays Lightning invoice automatically</li>
                <li>4. Agent claims wBTC with payment proof</li>
                <li>5. ✅ Fully atomic & trustless!</li>
              </ol>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                ❌ {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p className="font-semibold">✅ {success.message}</p>
                <p className="text-sm mt-2">Status: {success.status}</p>
                <p className="text-sm">
                  User: {success.userAddress.slice(0, 6)}...
                  {success.userAddress.slice(-4)}
                </p>
                <p className="text-xs mt-2 text-green-600">
                  The agent is now executing the atomic swap...
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRebalance}
                disabled={loading || !nwcUri || !!success}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : success
                    ? "Success!"
                    : "Confirm Rebalance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
