import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect, useRef, useCallback } from 'react';
import { fetchPortfolio } from '@/services/portfolio';
import { 
  fetchCurrentPricesBatch, 
  retryFailedPrices,
  type TokenPrice 
} from '@/services/price-current-ha';
import { dashboardConfig } from '@/config/dashboard.config';
import type { Asset } from '@/types/assets';

export function getPortfolioQueryKey(address?: string) {
  return ['portfolio', address] as const;
}

export function getPricesQueryKey(assets: Asset[]) {
  const assetIds = assets.map(a => a.uniqueId).sort().join(',');
  return ['token-prices-ha', assetIds] as const;
}

// 价格状态类型
export type PriceState = 
  | { status: 'loading'; price?: undefined }
  | { status: 'success'; price: number }
  | { status: 'failed'; price?: undefined };

function usePortfolioQuery(
  address: string | undefined,
  isConnected: boolean = false,
) {
  const { refresh, cache, retry } = dashboardConfig;

  return useQuery({
    queryKey: getPortfolioQueryKey(address),
    queryFn: () => fetchPortfolio({ address: address! }),
    enabled: isConnected && !!address && address.length > 0,
    staleTime: cache.enabled ? cache.staleTime : 0,
    gcTime: cache.enabled ? cache.gcTime : 0,
    refetchInterval: refresh.portfolio,
    refetchOnWindowFocus: cache.refetchOnWindowFocus,
    refetchOnReconnect: cache.refetchOnReconnect,
    retry: retry.maxRetries,
    retryDelay: (attemptIndex) => {
      if (retry.exponentialBackoff) {
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      }
      return retry.retryDelay;
    },
  });
}

function usePricesQueryHA(
  assets: Asset[],
  enabled: boolean = true
) {
  const { cache } = dashboardConfig;
  const queryClient = useQueryClient();
  const retryingAssetsRef = useRef(new Set<string>());

  const queryKey = useMemo(() => {
    return getPricesQueryKey(assets);
  }, [assets]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      console.log(`[usePricesQueryHA] 开始获取 ${assets.length} 个代币价格`);
      
      // 第一阶段：批量获取
      const { prices, failedAssets } = await fetchCurrentPricesBatch(assets);

      // 如果有失败的，启动后台重试
      if (failedAssets.length > 0) {
        console.log(`[usePricesQueryHA] ${failedAssets.length} 个代币需要后台重试`);
        
        // 后台重试（不阻塞返回）
        setTimeout(() => {
          retryFailedPrices(failedAssets, (uniqueId, price) => {
            if (!retryingAssetsRef.current.has(uniqueId)) {
              retryingAssetsRef.current.add(uniqueId);
              
              // 更新缓存
              queryClient.setQueryData(queryKey, (oldData: Record<string, TokenPrice> | undefined) => ({
                ...oldData,
                [uniqueId]: price,
              }));
              
              retryingAssetsRef.current.delete(uniqueId);
              console.log(`[usePricesQueryHA] ${price.symbol} 后台重试成功，UI已更新`);
            }
          });
        }, 100);
      }

      return prices;
    },
    enabled: enabled && assets.length > 0,
    staleTime: 0, // 价格实时性要求高
    gcTime: cache.enabled ? cache.gcTime : 0,
    refetchInterval: enabled ? dashboardConfig.refresh.price : false,
    refetchOnWindowFocus: cache.refetchOnWindowFocus,
    refetchOnReconnect: cache.refetchOnReconnect,
    retry: 1, // 由服务层处理重试
  });

  // 构建状态映射
  const stateMap = useMemo(() => {
    const map = new Map<string, PriceState>();

    assets.forEach((asset) => {
      // 正在重试中 = loading
      if (retryingAssetsRef.current.has(asset.uniqueId)) {
        map.set(asset.uniqueId, { status: 'loading' });
        return;
      }

      // 数据未加载 = loading
      if (query.isLoading) {
        map.set(asset.uniqueId, { status: 'loading' });
        return;
      }

      const priceData = query.data?.[asset.uniqueId];
      
      if (priceData) {
        map.set(asset.uniqueId, { 
          status: 'success', 
          price: priceData.price 
        });
      } else {
        map.set(asset.uniqueId, { status: 'failed' });
      }
    });

    return map;
  }, [assets, query.data, query.isLoading]);

  const getPriceState = useCallback((uniqueId: string): PriceState => {
    return stateMap.get(uniqueId) ?? { status: 'failed' };
  }, [stateMap]);

  return {
    ...query,
    getPriceState,
    stateMap,
  };
}

export const usePortfolio = (address?: string, isConnected?: boolean) => {
  const portfolioQuery = usePortfolioQuery(address, isConnected ?? false);
  const assets = useMemo(() => portfolioQuery.data ?? [], [portfolioQuery.data]);

  const prevAssetsLengthRef = useRef(assets.length);
  const prevIsSuccessRef = useRef(portfolioQuery.isSuccess);
  const prevIsLoadingRef = useRef(portfolioQuery.isLoading);

  useEffect(() => {
    const assetsChanged = prevAssetsLengthRef.current !== assets.length;
    const successChanged = prevIsSuccessRef.current !== portfolioQuery.isSuccess;
    const loadingChanged = prevIsLoadingRef.current !== portfolioQuery.isLoading;

    if (assetsChanged || successChanged || loadingChanged) {
      console.log(`[usePortfolio] 📊 资产查询状态变化 - isLoading: ${portfolioQuery.isLoading}, isSuccess: ${portfolioQuery.isSuccess}, isError: ${portfolioQuery.isError}, 资产数量: ${assets.length}`);
      prevAssetsLengthRef.current = assets.length;
      prevIsSuccessRef.current = portfolioQuery.isSuccess;
      prevIsLoadingRef.current = portfolioQuery.isLoading;
    }
  }, [portfolioQuery.isLoading, portfolioQuery.isSuccess, portfolioQuery.isError, assets.length]);

  const pricesEnabled = portfolioQuery.isSuccess && assets.length > 0;

  // 使用高可用价格查询
  const pricesQuery = usePricesQueryHA(assets, pricesEnabled);

  // 合并资产和价格数据
  const assetsWithPrices = useMemo(() => {
    return assets.map((asset) => {
      const priceState = pricesQuery.getPriceState(asset.uniqueId);
      
      return {
        ...asset,
        price: priceState.status === 'success' ? priceState.price : undefined,
        value: priceState.status === 'success' && asset.formatted
          ? parseFloat(asset.formatted) * priceState.price
          : undefined,
        priceStatus: priceState.status,
      };
    });
  }, [assets, pricesQuery]);

  const totalValue = useMemo(() => {
    return assetsWithPrices.reduce((sum, asset) => {
      return sum + (asset.value ?? 0);
    }, 0);
  }, [assetsWithPrices]);

  // 统计价格状态
  const priceStats = useMemo(() => {
    const stats = { success: 0, loading: 0, failed: 0 };
    assets.forEach(asset => {
      const state = pricesQuery.getPriceState(asset.uniqueId);
      stats[state.status]++;
    });
    return stats;
  }, [assets, pricesQuery]);

  return {
    data: assetsWithPrices,
    totalValue,
    isLoading: portfolioQuery.isLoading || pricesQuery.isLoading,
    isPriceLoading: pricesQuery.isLoading,
    error: portfolioQuery.error
      ? portfolioQuery.error.message
      : pricesQuery.error
      ? pricesQuery.error.message
      : null,
    refetch: () => {
      portfolioQuery.refetch();
      pricesQuery.refetch();
    },
    isError: portfolioQuery.isError || pricesQuery.isError,
    isSuccess: portfolioQuery.isSuccess && pricesQuery.isSuccess,
    isFetching: portfolioQuery.isFetching || pricesQuery.isFetching,
    priceStats,
    portfolioStatus: {
      isLoading: portfolioQuery.isLoading,
      isError: portfolioQuery.isError,
      isSuccess: portfolioQuery.isSuccess,
    },
    pricesStatus: {
      isLoading: pricesQuery.isLoading,
      isError: pricesQuery.isError,
      isSuccess: pricesQuery.isSuccess,
      successCount: priceStats.success,
      failedCount: priceStats.failed,
    },
    getPriceState: pricesQuery.getPriceState,
  };
};

export type { Asset };
