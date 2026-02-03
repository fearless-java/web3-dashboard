"use client";

import { useQuery } from '@tanstack/react-query';
import { fetchGasPrice, formatGasPrice } from '@/services/gas-price';
import { dashboardConfig } from '@/config/dashboard.config';
import type { GasPriceData } from '@/types';

// ============================================================================
// Query Key
// ============================================================================

/**
 * 获取 Gas 价格查询的 Query Key
 *
 * @param chainId - 链 ID
 * @returns Query Key 元组
 */
export function getGasPriceQueryKey(chainId: number) {
  return ['gas-price', chainId] as const;
}

// ============================================================================
// Hook 定义
// ============================================================================

/**
 * Gas 价格查询 Hook 返回值类型
 */
export interface UseGasPriceResult {
  /** 完整的 Gas 价格数据 */
  gasData: GasPriceData | null;
  /** 平均 Gas 价格（ETH 单位） */
  averagePrice: number | null;
  /** 格式化后的 Gas 价格（原生代币单位，用于显示） */
  displayPrice: string | null;
  /** 原生代币符号 */
  nativeTokenSymbol: string;
  /** 数据来源 */
  source: 'etherscan' | 'rpc' | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: Error | null;
  /** 手动刷新 */
  refetch: () => void;
}

/**
 * 获取实时 Gas 价格 Hook
 *
 * 返回的 gas 数据单位：
 * - averagePrice: ETH 单位（数值，如 0.00000003）
 * - displayPrice: Gwei 单位（格式化字符串，如 "30 Gwei"）
 *
 * 使用示例：
 * ```tsx
 * const { averagePrice, displayPrice, isLoading } = useGasPrice(1);
 * // averagePrice: 0.00000003 (ETH)
 * // displayPrice: "30 Gwei"
 * ```
 *
 * @param chainId - 链 ID（可选，默认为 Ethereum Mainnet）
 * @returns Gas 价格数据和状态
 */
export function useGasPrice(chainId?: number): UseGasPriceResult {
  const targetChainId = chainId || 1;
  const { cache, retry } = dashboardConfig;

  const query = useQuery({
    queryKey: getGasPriceQueryKey(targetChainId),
    queryFn: async () => {
      const gasData = await fetchGasPrice(targetChainId);

      if (!gasData) {
        throw new Error(`Failed to fetch gas price for chain ${targetChainId}`);
      }

      return gasData;
    },
    staleTime: dashboardConfig.refresh.transaction,
    gcTime: cache.enabled ? cache.gcTime : 0,
    refetchInterval: dashboardConfig.refresh.transaction,
    retry: retry.maxRetries,
    retryDelay: (attemptIndex) => {
      if (retry.exponentialBackoff) {
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      }
      return retry.retryDelay;
    },
    refetchOnWindowFocus: cache.refetchOnWindowFocus,
  });

  const gasData = query.data ?? null;
  const averagePrice = gasData?.averagePrice ?? null;
  const nativeTokenSymbol = gasData?.nativeTokenSymbol ?? 'ETH';
  const displayPrice = averagePrice !== null 
    ? formatGasPrice(averagePrice, nativeTokenSymbol) 
    : null;
  const source = gasData?.source ?? null;

  return {
    gasData,
    averagePrice,
    displayPrice,
    nativeTokenSymbol,
    source,
    isLoading: query.isLoading,
    error: query.error ?? null,
    refetch: query.refetch,
  };
}

// ============================================================================
// 便捷 Hook
// ============================================================================

/**
 * 获取 Ethereum 主网 Gas 价格的便捷 Hook
 *
 * @returns Gas 价格数据和状态
 */
export function useMainnetGasPrice(): UseGasPriceResult {
  return useGasPrice(1);
}
