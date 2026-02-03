import { useMemo } from 'react';
import { usePortfolio, type PriceState } from './usePortfolio';
import { groupAssetsBySymbol } from '@/utils/asset-utils';
import type { Asset, GroupedAsset, PriceStatus } from '@/types';

export interface UseAggregatedPortfolioReturn {
  
  aggregatedData: GroupedAsset[];
  
  rawData: Asset[];
  
  isLoading: boolean;
  
  isError: boolean;
  
  isSuccess: boolean;
  
  isFetching: boolean;
  
  error: string | null;
  
  refetch: () => void;
  
  totalValue: number;
  
  portfolioStatus: {
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
  };
  
  pricesStatus: {
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    successCount: number;
    failedCount: number;
  };

  /** 获取单个资产的价格状态 */
  getPriceState: (uniqueId: string) => PriceState;
}

export function useAggregatedPortfolio(
  address?: string,
  isConnected: boolean = true,
  showTestnets: boolean = false
): UseAggregatedPortfolioReturn {
  const {
    data: rawAssets,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    error,
    refetch,
    portfolioStatus,
    pricesStatus,
    getPriceState,
  } = usePortfolio(address, isConnected);

  const { aggregatedData, totalValue } = useMemo(() => {
    if (!rawAssets || rawAssets.length === 0) {
      return { aggregatedData: [], totalValue: 0 };
    }
    try {
      const aggregated = groupAssetsBySymbol(rawAssets, showTestnets);
      const total = aggregated
        .filter((g) => !g.isTestnet)
        .reduce((sum, g) => sum + g.totalValue, 0);
      return { aggregatedData: aggregated, totalValue: total };
    } catch (err) {
      console.error("[useAggregatedPortfolio] 資產聚合失敗:", err);
      return { aggregatedData: [], totalValue: 0 };
    }
  }, [rawAssets, showTestnets]);

  return {
    aggregatedData,
    rawData: rawAssets ?? [],
    isLoading,
    isError,
    isSuccess,
    isFetching,
    error,
    refetch,
    totalValue,
    portfolioStatus,
    pricesStatus,
    getPriceState,
  };
}

export type { Asset, GroupedAsset };
