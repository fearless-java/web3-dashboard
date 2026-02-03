import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  fetchTokenPriceHistoryHA,
} from '@/services/price-history-ha';
import type { TokenPriceHistory } from '@/services/price-history';
import { dashboardConfig } from '@/config/dashboard.config';
import type { Asset } from '@/types/assets';

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 500,
  backoffMultiplier: 2,
};

// 查询键
export function getPriceHistoryQueryKey(assetIds: string) {
  return ['token-price-history-ha-v2', assetIds] as const;
}

export function getSinglePriceHistoryQueryKey(uniqueId: string) {
  return ['token-price-history-single-ha', uniqueId] as const;
}

/**
 * 单个资产的历史价格状态
 */
export type PriceHistoryState = 
  | { status: 'loading'; history?: undefined; trend: []; change7d: 0 }
  | { status: 'success'; history: TokenPriceHistory; trend: number[]; change7d: number }
  | { status: 'failed'; history?: undefined; trend: []; change7d: 0 };

/**
 * 批量获取历史价格，失败隔离 + 后台重试
 */
export function useTokenPriceHistories(
  assets: Asset[],
  enabled: boolean = true
) {
  const { cache } = dashboardConfig;
  const queryClient = useQueryClient();
  const retryingAssetsRef = useRef(new Set<string>());

  const queryKey = useMemo(() => {
    const assetIds = assets.map(a => a.uniqueId).sort().join(',');
    return getPriceHistoryQueryKey(assetIds);
  }, [assets]);

  // 批量获取（第一次）
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      console.log(`[useTokenPriceHistories] 批量获取 ${assets.length} 个代币`);
      
      const results: Record<string, TokenPriceHistory | null> = {};
      
      // 串行获取避免限流
      for (const asset of assets) {
        try {
          const history = await fetchTokenPriceHistoryHA(asset);
          results[asset.uniqueId] = history;
        } catch (error) {
          console.warn(`[useTokenPriceHistories] ${asset.symbol} 初始获取失败`);
          results[asset.uniqueId] = null;
        }
        // 小延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return results;
    },
    enabled: enabled && assets.length > 0,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: cache.enabled ? cache.gcTime : 0,
    retry: false, // 我们自己处理重试
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // 后台重试失败的代币
  const retryFailedAssets = useCallback(async (failedAssets: Asset[]) => {
    if (failedAssets.length === 0) return;
    
    console.log(`[useTokenPriceHistories] 后台重试 ${failedAssets.length} 个失败代币`);

    for (const asset of failedAssets) {
      // 避免重复重试
      if (retryingAssetsRef.current.has(asset.uniqueId)) continue;
      retryingAssetsRef.current.add(asset.uniqueId);

      // 阶梯式重试
      let history: TokenPriceHistory | null = null;
      
      for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
        try {
          history = await fetchTokenPriceHistoryHA(asset);
          if (history) break; // 成功，退出重试循环
        } catch (error) {
          console.warn(`[useTokenPriceHistories] ${asset.symbol} 重试 ${attempt + 1}/${RETRY_CONFIG.maxRetries} 失败`);
        }

        // 延迟后再次重试
        if (attempt < RETRY_CONFIG.maxRetries - 1) {
          const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // 更新缓存（触发UI更新）
      if (history) {
        console.log(`[useTokenPriceHistories] ${asset.symbol} 重试成功`);
        queryClient.setQueryData(queryKey, (oldData: Record<string, TokenPriceHistory | null> | undefined) => ({
          ...oldData,
          [asset.uniqueId]: history,
        }));
      } else {
        console.log(`[useTokenPriceHistories] ${asset.symbol} 重试${RETRY_CONFIG.maxRetries}次后仍失败`);
      }

      retryingAssetsRef.current.delete(asset.uniqueId);
      
      // 每个代币重试后小延迟
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, [queryClient, queryKey]);

  // 初始加载完成后，后台重试失败的
  useEffect(() => {
    if (query.isSuccess && !query.isFetching) {
      const failedAssets = assets.filter(asset => !query.data?.[asset.uniqueId]);
      if (failedAssets.length > 0) {
        retryFailedAssets(failedAssets);
      }
    }
  }, [query.isSuccess, query.isFetching, assets, query.data, retryFailedAssets]);

  // 构建状态映射
  const stateMap = useMemo(() => {
    const map = new Map<string, PriceHistoryState>();

    assets.forEach((asset) => {
      // 正在重试中 = loading
      if (retryingAssetsRef.current.has(asset.uniqueId)) {
        map.set(asset.uniqueId, { status: 'loading', trend: [], change7d: 0 });
        return;
      }

      // 数据未加载 = loading
      if (query.isLoading) {
        map.set(asset.uniqueId, { status: 'loading', trend: [], change7d: 0 });
        return;
      }

      const history = query.data?.[asset.uniqueId];
      
      if (history) {
        // 计算趋势数据
        const prices = history.prices.map(p => p.price);
        const trend = prices.length <= 7 
          ? prices 
          : Array.from({ length: 7 }, (_, i) => {
              const index = Math.round(i * (prices.length - 1) / 6);
              return prices[index];
            });
        
        // 计算变化百分比
        const change7d = prices.length >= 2
          ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
          : 0;

        map.set(asset.uniqueId, { 
          status: 'success', 
          history, 
          trend, 
          change7d 
        });
      } else {
        // 数据加载完成但没有结果 = failed
        map.set(asset.uniqueId, { status: 'failed', trend: [], change7d: 0 });
      }
    });

    return map;
  }, [assets, query.data, query.isLoading]);

  const getState = useCallback((uniqueId: string): PriceHistoryState => {
    return stateMap.get(uniqueId) ?? { status: 'failed', trend: [], change7d: 0 };
  }, [stateMap]);

  return {
    ...query,
    getState,
    stateMap,
  };
}

/**
 * Hook: 聚合资产历史价格（按 symbol 分组）
 */
export function useAggregatedPriceHistories(
  assets: Asset[],
  enabled: boolean = true
) {
  const { stateMap, getState, isLoading } = useTokenPriceHistories(assets, enabled);

  // symbol -> 状态的映射（优先返回成功的）
  const symbolToState = useMemo(() => {
    const map = new Map<string, PriceHistoryState>();
    
    // 按 symbol 分组，只要有成功的就用成功的
    const symbolGroups = new Map<string, Asset[]>();
    assets.forEach(asset => {
      const list = symbolGroups.get(asset.symbol) ?? [];
      list.push(asset);
      symbolGroups.set(asset.symbol, list);
    });

    // 每个 symbol 找一个成功的
    symbolGroups.forEach((assetList, symbol) => {
      // 优先找成功的
      for (const asset of assetList) {
        const state = getState(asset.uniqueId);
        if (state.status === 'success') {
          map.set(symbol, state);
          return;
        }
      }
      // 其次找 loading 的
      for (const asset of assetList) {
        const state = getState(asset.uniqueId);
        if (state.status === 'loading') {
          map.set(symbol, state);
          return;
        }
      }
      // 都没成功就是 failed
      map.set(symbol, { status: 'failed', trend: [], change7d: 0 });
    });

    return map;
  }, [assets, getState]);

  const getStateBySymbol = useCallback((symbol: string): PriceHistoryState => {
    return symbolToState.get(symbol) ?? { status: 'failed', trend: [], change7d: 0 };
  }, [symbolToState]);

  return {
    getState,
    getStateBySymbol,
    symbolToState,
    isLoading,
  };
}
