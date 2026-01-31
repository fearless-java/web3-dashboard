import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useMemo, useEffect, useRef } from 'react';
import { fetchPortfolio } from '@/services/portfolio';
import { fetchTokenPrices } from '@/services/price';
import { dashboardConfig } from '@/config/dashboard.config';
import { useSettingsStore, type Currency } from '@/stores/settings-store';
import type { Asset } from '@/types/assets';

export function getPortfolioQueryKey(address?: string) {
  return ['portfolio', address] as const;
}

export function getPricesQueryKey(assets: Asset[], currency: string) {
  
  const assetIds = assets.map(a => a.uniqueId).sort().join(',');
  return ['token-prices', assetIds, currency] as const;
}

function usePortfolioQuery(
  address: string | undefined,
  isConnected: boolean = false,
  options?: Omit<UseQueryOptions<Asset[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
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
    ...options, 
  });
}

function usePricesQuery(
  assets: Asset[],
  currency: string,
  enabled: boolean = true
) {
  const { refresh, cache, retry } = dashboardConfig;

  const queryKey = getPricesQueryKey(assets, currency);
  const finalEnabled = enabled && assets.length > 0;

  useEffect(() => {
    if (finalEnabled) {
      console.log(`[usePricesQuery] 🔄 价格查询已配置 - assets.length: ${assets.length}, currency: ${currency}, refetchInterval: ${refresh.price}ms`);
      console.log(`[usePricesQuery] Query Key:`, queryKey);
    }
  }, [assets.length, currency, finalEnabled, refresh.price, queryKey]);

  const queryCountMapRef = useRef(new Map<string, number>());

  useEffect(() => {
    if (finalEnabled) {
      console.log(`[usePricesQuery] ⚙️ 查詢配置 - refetchInterval: ${refresh.price}ms, staleTime: 0, enabled: ${finalEnabled}`);
    }
  }, [finalEnabled, refresh.price]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      const queryKeyStr = JSON.stringify(queryKey);
      const currentCount = (queryCountMapRef.current.get(queryKeyStr) || 0) + 1;
      queryCountMapRef.current.set(queryKeyStr, currentCount);
      
      const isInitialQuery = currentCount === 1;
      const queryType = isInitialQuery ? '🔄 初始查询' : `⏰ 自动刷新 #${currentCount - 1}`;
      
      const startTime = Date.now();
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[价格查询] ${queryType} - 时间: ${timestamp}, 资产数量: ${assets.length}, 法币: ${currency}`);
      
      try {
        const result = await fetchTokenPrices(assets, currency as Currency);
        const duration = Date.now() - startTime;
        const priceCount = Object.keys(result).length;
        console.log(`[价格查询] ✅ ${queryType}完成 - 时间: ${timestamp}, 耗时: ${duration}ms, 获取到 ${priceCount} 个价格`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[价格查询] ❌ ${queryType}失败 - 时间: ${timestamp}, 耗时: ${duration}ms`, error);
        throw error;
      }
    },
    enabled: finalEnabled, 
    staleTime: 0, 
    gcTime: cache.enabled ? cache.gcTime : 0,
    refetchInterval: finalEnabled ? refresh.price : false, 
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

export const usePortfolio = (address?: string, isConnected?: boolean) => {
  
  const currency = useSettingsStore((state) => state.currency);

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

  useEffect(() => {
    if (portfolioQuery.isSuccess && assets.length > 0) {
      console.log(`[usePortfolio] ✅ 价格查询已启用 - portfolioQuery.isSuccess: ${portfolioQuery.isSuccess}, assets.length: ${assets.length}`);
    } else {
      console.log(`[usePortfolio] ⏸️ 价格查询未启用 - portfolioQuery.isSuccess: ${portfolioQuery.isSuccess}, assets.length: ${assets.length}`);
    }
  }, [portfolioQuery.isSuccess, assets.length]);

  const pricesQuery = usePricesQuery(
    assets,
    currency,
    pricesEnabled
  );

  const prevPriceIsLoadingRef = useRef(pricesQuery.isLoading);
  const prevPriceIsSuccessRef = useRef(pricesQuery.isSuccess);
  const prevPriceIsFetchingRef = useRef(pricesQuery.isFetching);
  const prevPriceDataRef = useRef(pricesQuery.data);

  useEffect(() => {
    const loadingChanged = prevPriceIsLoadingRef.current !== pricesQuery.isLoading;
    const successChanged = prevPriceIsSuccessRef.current !== pricesQuery.isSuccess;
    const fetchingChanged = prevPriceIsFetchingRef.current !== pricesQuery.isFetching;
    const dataChanged = prevPriceDataRef.current !== pricesQuery.data;

    if (loadingChanged || successChanged || fetchingChanged || dataChanged) {
      const dataStatus = pricesQuery.data ? `有数据(${Object.keys(pricesQuery.data).length}个价格)` : '无数据';
      console.log(`[usePortfolio] 💰 价格查询状态变化 - isLoading: ${pricesQuery.isLoading}, isSuccess: ${pricesQuery.isSuccess}, isError: ${pricesQuery.isError}, isFetching: ${pricesQuery.isFetching}, ${dataStatus}`);
      prevPriceIsLoadingRef.current = pricesQuery.isLoading;
      prevPriceIsSuccessRef.current = pricesQuery.isSuccess;
      prevPriceIsFetchingRef.current = pricesQuery.isFetching;
      prevPriceDataRef.current = pricesQuery.data;
    }
  }, [pricesQuery.isLoading, pricesQuery.isSuccess, pricesQuery.isError, pricesQuery.isFetching, pricesQuery.data]);

  const assetsWithPrices = useMemo(() => {
    if (!pricesQuery.data) {
      return assets; 
    }

    const prices = pricesQuery.data;

    return assets.map((asset) => {
      const price = prices[asset.uniqueId];
      const value = price && asset.formatted
        ? parseFloat(asset.formatted) * price
        : undefined;

      return {
        ...asset,
        price,
        value,
      };
    });
  }, [assets, pricesQuery.data]);

  const totalValue = useMemo(() => {
    return assetsWithPrices.reduce((sum, asset) => {
      return sum + (asset.value ?? 0);
    }, 0);
  }, [assetsWithPrices]);

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
    
    portfolioStatus: {
      isLoading: portfolioQuery.isLoading,
      isError: portfolioQuery.isError,
      isSuccess: portfolioQuery.isSuccess,
    },
    pricesStatus: {
      isLoading: pricesQuery.isLoading,
      isError: pricesQuery.isError,
      isSuccess: pricesQuery.isSuccess,
    },
  };
};

export type { Asset };
