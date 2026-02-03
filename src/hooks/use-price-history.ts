import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  fetchTokenPriceHistoriesHABatched,
  extract7DayTrend,
  calculatePriceChange7d,
} from '@/services/price-history-ha';
import { dashboardConfig } from '@/config/dashboard.config';
import type { Asset, PriceHistoryState, TokenPriceHistory } from '@/types';

// 查询键生成器
function getTopAssetsHistoryQueryKey(assetIds: string) {
  return ['token-price-history-top', assetIds] as const;
}

function getSmallAssetsHistoryQueryKey(assetIds: string) {
  return ['token-price-history-small', assetIds] as const;
}

// 类型已从 @/types 统一导入
export type { PriceHistoryState };

/**
 * Hook: 加载 Top Assets (价值 >= $1) 的历史价格
 * 策略：立即并行加载所有资产，不限制数量
 */
export function useTopAssetsPriceHistory(
  assets: Asset[],
  enabled: boolean = true
) {
  const { cache } = dashboardConfig;

  const queryKey = useMemo(() => {
    const assetIds = assets.map(a => a.uniqueId).sort().join(',');
    return getTopAssetsHistoryQueryKey(assetIds);
  }, [assets]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      console.log(`[useTopAssetsPriceHistory] 加载 ${assets.length} 个 Top 资产历史价格`);
      return await fetchTokenPriceHistoriesHABatched(assets);
    },
    enabled: enabled && assets.length > 0,
    staleTime: cache.enabled ? cache.staleTimeHistory : 0,
    gcTime: cache.enabled ? cache.gcTime : 0,
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // 构建状态映射
  const stateMap = useMemo(() => {
    const map = new Map<string, PriceHistoryState>();

    assets.forEach((asset) => {
      if (query.isLoading) {
        map.set(asset.uniqueId, {
          status: 'loading',
          trend: [],
          change7d: 0,
        });
        return;
      }

      const history = query.data?.[asset.uniqueId];

      if (history) {
        const trend = extract7DayTrend(history);
        const change7d = calculatePriceChange7d(history);

        map.set(asset.uniqueId, {
          status: 'success',
          history,
          trend,
          change7d,
        });
      } else {
        map.set(asset.uniqueId, {
          status: 'failed',
          trend: [],
          change7d: 0,
        });
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
 * Hook: 加载 Small Assets (价值 < $1) 的历史价格
 * 策略：
 * - enabled=false 时不加载任何数据
 * - enabled=true 时立即加载（用户展开时）
 */
export function useSmallAssetsPriceHistory(
  assets: Asset[],
  enabled: boolean = false,
  options?: { delay?: number; backgroundLoad?: boolean }
) {
  const { cache } = dashboardConfig;
  const { delay = 0, backgroundLoad = false } = options || {};
  const hasLoadedRef = useRef(false);

  const queryKey = useMemo(() => {
    const assetIds = assets.map(a => a.uniqueId).sort().join(',');
    return getSmallAssetsHistoryQueryKey(assetIds);
  }, [assets]);

  // 延迟加载：等待 Top Assets 渲染完成后再加载 Small Assets
  const shouldFetch = enabled && (backgroundLoad || hasLoadedRef.current);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!shouldFetch) return {};

      console.log(`[useSmallAssetsPriceHistory] 加载 ${assets.length} 个 Small 资产历史价格`);

      // 如果设置了延迟，先等待
      if (delay > 0 && !hasLoadedRef.current) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      hasLoadedRef.current = true;
      return await fetchTokenPriceHistoriesHABatched(assets);
    },
    enabled: shouldFetch && assets.length > 0,
    staleTime: cache.enabled ? cache.staleTimeHistory : 0,
    gcTime: cache.enabled ? cache.gcTime : 0,
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // 构建状态映射
  const stateMap = useMemo(() => {
    const map = new Map<string, PriceHistoryState>();

    assets.forEach((asset) => {
      // 未启用加载 = pending
      if (!shouldFetch) {
        map.set(asset.uniqueId, {
          status: 'pending',
          trend: [],
          change7d: 0,
        });
        return;
      }

      if (query.isLoading) {
        map.set(asset.uniqueId, {
          status: 'loading',
          trend: [],
          change7d: 0,
        });
        return;
      }

      const history = query.data?.[asset.uniqueId];

      if (history) {
        const trend = extract7DayTrend(history);
        const change7d = calculatePriceChange7d(history);

        map.set(asset.uniqueId, {
          status: 'success',
          history,
          trend,
          change7d,
        });
      } else {
        map.set(asset.uniqueId, {
          status: 'failed',
          trend: [],
          change7d: 0,
        });
      }
    });

    return map;
  }, [assets, query.data, query.isLoading, shouldFetch]);

  const getState = useCallback((uniqueId: string): PriceHistoryState => {
    return stateMap.get(uniqueId) ?? { status: 'pending', trend: [], change7d: 0 };
  }, [stateMap]);

  return {
    ...query,
    getState,
    stateMap,
    isLoading: query.isLoading && shouldFetch,
  };
}

/**
 * Hook: 聚合资产历史价格（按 symbol 分组）
 * 合并 Top Assets 和 Small Assets 的历史价格状态
 */
export function useAggregatedPriceHistories(
  topAssets: Asset[],
  smallAssets: Asset[],
  enabled: boolean = true,
  smallAssetsEnabled: boolean = false
) {
  // Top Assets: 立即加载
  const topHistory = useTopAssetsPriceHistory(topAssets, enabled);

  // Small Assets: 按需立即加载（无延迟）
  const smallHistory = useSmallAssetsPriceHistory(
    smallAssets,
    smallAssetsEnabled,
    { delay: 0, backgroundLoad: false }
  );

  // 合并所有资产的历史价格状态
  const allAssets = useMemo(() => [...topAssets, ...smallAssets], [topAssets, smallAssets]);

  // symbol -> 状态的映射（优先返回成功的）
  const symbolToState = useMemo(() => {
    const map = new Map<string, PriceHistoryState>();

    // 按 symbol 分组
    const symbolGroups = new Map<string, Asset[]>();
    allAssets.forEach(asset => {
      const list = symbolGroups.get(asset.symbol) ?? [];
      list.push(asset);
      symbolGroups.set(asset.symbol, list);
    });

    // 每个 symbol 找一个成功的
    symbolGroups.forEach((assetList, symbol) => {
      // 优先从 Top Assets 找
      for (const asset of assetList) {
        const isTopAsset = topAssets.some(a => a.uniqueId === asset.uniqueId);
        if (isTopAsset) {
          const state = topHistory.getState(asset.uniqueId);
          if (state.status === 'success' || state.status === 'loading') {
            map.set(symbol, state);
            return;
          }
        }
      }

      // 其次从 Small Assets 找
      for (const asset of assetList) {
        const isSmallAsset = smallAssets.some(a => a.uniqueId === asset.uniqueId);
        if (isSmallAsset) {
          const state = smallHistory.getState(asset.uniqueId);
          if (state.status === 'success' || state.status === 'loading') {
            map.set(symbol, state);
            return;
          }
        }
      }

      // 都没找到 = failed 或 pending
      for (const asset of assetList) {
        const isTopAsset = topAssets.some(a => a.uniqueId === asset.uniqueId);
        const getState = isTopAsset ? topHistory.getState : smallHistory.getState;
        const state = getState(asset.uniqueId);
        if (state.status !== 'success') {
          map.set(symbol, state);
          return;
        }
      }

      map.set(symbol, { status: 'pending', trend: [], change7d: 0 });
    });

    return map;
  }, [allAssets, topAssets, smallAssets, topHistory, smallHistory]);

  const getStateBySymbol = useCallback((symbol: string): PriceHistoryState => {
    return symbolToState.get(symbol) ?? { status: 'pending', trend: [], change7d: 0 };
  }, [symbolToState]);

  // 总体加载状态
  const isLoading = topHistory.isLoading;

  return {
    getState: (uniqueId: string) => {
      const isTopAsset = topAssets.some(a => a.uniqueId === uniqueId);
      return isTopAsset
        ? topHistory.getState(uniqueId)
        : smallHistory.getState(uniqueId);
    },
    getStateBySymbol,
    symbolToState,
    isLoading,
    topHistory,
    smallHistory,
  };
}

// ============ 兼容旧接口的导出 ============

/**
 * @deprecated 使用 useTopAssetsPriceHistory 或 useAggregatedPriceHistories
 */
export function useTokenPriceHistories(
  assets: Asset[],
  enabled: boolean = true
) {
  return useTopAssetsPriceHistory(assets, enabled);
}
