import React, { useEffect, useState } from "react";
import { useJwtContext } from "@lit-protocol/vincent-app-sdk/react";
import { useBackend } from "@/hooks/useBackend";
import { formatAmount } from "@/lib/utils";
import { Rebalance } from "./rebalance";

export const Wallet: React.FC = () => {
  const { authInfo } = useJwtContext();
  const { getAgentStatus, loading } = useBackend();
  const [status, setStatus] = useState<any>(null);

  // Get user address from Vincent PKP wallet
  const userAddress = authInfo?.pkp?.ethAddress || "";
  const wbtcBalance = "5000000000000000000"; // TODO: Get actual balance from chain

  const fetchStatus = async () => {
    try {
      const result = await getAgentStatus();
      setStatus(result.status);
    } catch (err) {
      console.error("Failed to fetch agent status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!userAddress) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Loading wallet...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Wallet & Agent Status</h2>
          <p className="text-sm text-gray-500 mt-1">
            Address: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
          </p>
        </div>
        <Rebalance
          userAddress={userAddress}
          wbtcBalance={wbtcBalance}
          onSuccess={fetchStatus}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent Status */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Agent Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span
                className={`font-medium ${status?.online ? "text-green-600" : "text-red-600"}`}
              >
                {status?.online ? "🟢 Online" : "🔴 Offline"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Swaps</span>
              <span className="font-medium">{status?.activeSwaps || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed Swaps</span>
              <span className="font-medium">{status?.completedSwaps || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Uptime</span>
              <span className="font-medium">
                {status?.uptime ? Math.floor(status.uptime / 60) : 0} minutes
              </span>
            </div>
          </div>
        </div>

        {/* Lightning Balance */}
        <div className="bg-yellow-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">⚡ Lightning Network</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Local Balance</span>
              <span className="font-medium">
                {formatAmount(status?.lightningCapacity?.local || 0, 0)} sats
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remote Balance</span>
              <span className="font-medium">
                {formatAmount(status?.lightningCapacity?.remote || 0, 0)} sats
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-semibold">
                Total Capacity
              </span>
              <span className="font-semibold">
                {formatAmount(status?.lightningCapacity?.total || 0, 0)} sats
              </span>
            </div>
          </div>
        </div>

        {/* Hedera Balance */}
        <div className="bg-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🔗 Hedera</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">HBAR</span>
              <span className="font-medium">
                {status?.hederaBalance?.hbar || "0"} HBAR
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">wBTC</span>
              <span className="font-medium">
                {status?.hederaBalance?.wbtc || "0"} wBTC
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">ℹ️ Information</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              Your Vincent agent manages liquidity across Lightning Network and
              Hedera.
            </p>
            <p>
              All swaps are executed autonomously with full atomic guarantees.
            </p>
            <p className="text-xs text-gray-500 mt-4">
              Note: This is demo data. Connect your actual Lightning node and
              Hedera wallet for real balances.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
