import { useMemo } from 'react';
import { usePortfolio } from './usePortfolio';
import { groupAssetsBySymbol } from '@/utils/asset-utils';
import type { Asset, GroupedAsset } from '@/types/assets';

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
  };
}

export function useAggregatedPortfolio(
  address?: string,
  isConnected: boolean = true
): UseAggregatedPortfolioReturn {
  
  const {
    data: rawAssets,
    totalValue,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    error,
    refetch,
    portfolioStatus,
    pricesStatus,
  } = usePortfolio(address, isConnected);

  const aggregatedData = useMemo(() => {
    
    if (!rawAssets || rawAssets.length === 0) {
      return [];
    }

    try {
      return groupAssetsBySymbol(rawAssets);
    } catch (error) {
      
      console.error('[useAggregatedPortfolio] 資產聚合失敗:', error);
      return [];
    }
  }, [rawAssets]);

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
  };
}

export type { Asset, GroupedAsset };
