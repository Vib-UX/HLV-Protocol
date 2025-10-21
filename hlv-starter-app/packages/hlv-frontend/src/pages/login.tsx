import React from "react";
import { useVincentWebAuthClient } from "@lit-protocol/vincent-app-sdk/react";
import { env } from "@/config/env";

const { VITE_APP_ID, VITE_REDIRECT_URI } = env;

export const Login: React.FC = () => {
  const vincentWebAuthClient = useVincentWebAuthClient(VITE_APP_ID);

  const handleLogin = () => {
    // Redirect to Vincent Auth consent page
    vincentWebAuthClient.redirectToConnectPage({
      redirectUri: VITE_REDIRECT_URI,
    });
  };

  return (
    <div className="app-container">
      <div className="login-container">
        <img src="/vincent-logo.svg" alt="HLV Protocol" className="logo" />

        <h1 className="text-3xl font-bold mb-4 text-gray-800">HLV Protocol</h1>

        <p className="text-gray-600 mb-8">
          Bridge Lightning Network and Hedera with trustless atomic swaps
        </p>

        <button
          onClick={handleLogin}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Connect with Vincent
        </button>

        <div className="mt-8 text-sm text-gray-500">
          <p>Powered by Vincent Protocol</p>
          <p className="mt-2">
            ⚡ Lightning Network • 🔗 Hedera • 🤖 Vincent Agents
          </p>
        </div>
      </div>
    </div>
  );
};
