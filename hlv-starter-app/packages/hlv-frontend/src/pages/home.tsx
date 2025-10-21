import React from "react";
import { useJwtContext } from "@lit-protocol/vincent-app-sdk/react";

import { Wallet } from "@/components/wallet";
import { Info } from "@/components/info";

export const Home: React.FC = () => {
  const { logout } = useJwtContext();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen min-w-screen bg-gray-100">
      <div className="bg-white p-6 shadow-lg rounded-lg w-full xl:max-w-5xl h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">HLV Protocol</h1>
            <p className="text-sm text-gray-500">
              Lightning ⚡ Hedera Atomic Swaps
            </p>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            Disconnect
          </button>
        </div>

        {/* Main Content - Wallet & Rebalance */}
        <div className="min-h-[500px]">
          <Wallet />
        </div>
      </div>

      <Info />
    </div>
  );
};
