import React from 'react';

export const Info: React.FC = () => {
  return (
    <div className="mt-8 text-center text-sm text-gray-600 max-w-2xl">
      <p className="mb-2">
        <strong>HLV Protocol</strong> - Hash-Locked Value Protocol
      </p>
      <p className="mb-2">
        Trustless atomic swaps between Bitcoin Lightning Network and Hedera blockchain
      </p>
      <p className="text-xs text-gray-500">
        Powered by Vincent Protocol • HTLC Smart Contracts • Lightning Network
      </p>
    </div>
  );
};

