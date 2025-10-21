import { useState, useCallback } from 'react';
import { env } from '@/config/env';

const { VITE_API_URL } = env;

export interface Swap {
  swapId: string;
  direction: 'hedera_to_lightning' | 'lightning_to_hedera';
  status: string;
  paymentHash: string;
  preimage?: string;
  htlcAmount: string;
  htlcAddress: string;
  htlcTxHash?: string;
  timelock: string;
  lightningInvoice: string;
  lightningAmount: number;
  userAddress: string;
  agentAddress: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

export interface CreateSwapRequest {
  direction: 'hedera_to_lightning' | 'lightning_to_hedera';
  lightningInvoice: string;
  htlcAmount: string;
  userAddress: string;
  timelock: number;
}

export function useBackend() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async <T,>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${VITE_API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const listSwaps = useCallback(
    async (userAddress?: string) => {
      const query = userAddress ? `?userAddress=${userAddress}` : '';
      return apiCall<{ swaps: Swap[] }>(`/api/swaps${query}`);
    },
    [apiCall],
  );

  const getSwap = useCallback(
    async (swapId: string) => {
      return apiCall<{ swap: Swap }>(`/api/swaps/${swapId}`);
    },
    [apiCall],
  );

  const createSwap = useCallback(
    async (data: CreateSwapRequest) => {
      return apiCall<{ swap: Swap }>(`/api/swaps`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    [apiCall],
  );

  const cancelSwap = useCallback(
    async (swapId: string) => {
      return apiCall<{ swap: Swap }>(`/api/swaps/${swapId}`, {
        method: 'DELETE',
      });
    },
    [apiCall],
  );

  const getAgentStatus = useCallback(async () => {
    return apiCall<{ status: any }>(`/api/agent/status`);
  }, [apiCall]);

  return {
    loading,
    error,
    listSwaps,
    getSwap,
    createSwap,
    cancelSwap,
    getAgentStatus,
  };
}

