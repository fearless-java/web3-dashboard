"use client";

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { dashboardConfig } from '@/config/dashboard.config';

export function getGasPriceQueryKey(chainId: number) {
  return ['gas-price', chainId] as const;
}

/**
 * 获取实时 Gas 价格
 * 
 * @param chainId 链 ID（可选，默认为 Ethereum Mainnet）
 * @returns Gas 价格（Gwei）、加载状态和错误信息
 */
export function useGasPrice(chainId?: number) {
  const targetChainId = chainId || 1;
  const publicClient = usePublicClient({ chainId: targetChainId });
  const { cache, retry } = dashboardConfig;

  const query = useQuery({
    queryKey: getGasPriceQueryKey(targetChainId),
    queryFn: async () => {
      if (!publicClient) {
        throw new Error(`Public client not available for chain ${targetChainId}`);
      }
      
      const priceInWei = await publicClient.getGasPrice();
      const priceInGwei = formatUnits(priceInWei, 9);
      const numeric = Number(priceInGwei);
      if (!Number.isFinite(numeric) || numeric < 0) {
        throw new Error(`Invalid gas price for chain ${targetChainId}: ${priceInGwei}`);
      }
      return numeric;
    },
    enabled: !!publicClient,
    staleTime: dashboardConfig.refresh.price / 2,
    gcTime: cache.enabled ? cache.gcTime : 0,
    refetchInterval: dashboardConfig.refresh.price,
    retry: retry.maxRetries,
    retryDelay: (attemptIndex) => {
      if (retry.exponentialBackoff) {
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      }
      return retry.retryDelay;
    },
    refetchOnWindowFocus: cache.refetchOnWindowFocus,
    refetchOnReconnect: cache.refetchOnReconnect,
  });

  return {
    gasPrice: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
