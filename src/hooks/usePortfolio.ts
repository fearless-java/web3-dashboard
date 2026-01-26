import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchPortfolio } from '@/services/portfolio';
import { dashboardConfig } from '@/config/dashboard.config';
import type { Asset } from '@/types/assets';

/**
 * 获取资产查询的 Query Key
 */
export function getPortfolioQueryKey(address?: string) {
  return ['portfolio', address] as const;
}

/**
 * 使用 TanStack Query 查询资产
 */
function usePortfolioQuery(
  address: string | undefined,
  isConnected: boolean = false,
  options?: Omit<UseQueryOptions<Asset[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  // 从 dashboard 配置中读取相关配置
  const { refresh, cache, retry } = dashboardConfig;

  return useQuery({
    queryKey: getPortfolioQueryKey(address),
    queryFn: () => fetchPortfolio({ address: address! }),
    enabled: isConnected && !!address && address.length > 0, // 只有连接且有地址时才查询
    staleTime: cache.enabled ? cache.staleTime : 0, // 数据过期时间
    gcTime: cache.enabled ? cache.gcTime : 0, // 垃圾回收时间
    refetchInterval: refresh.token, // 自动刷新间隔
    refetchOnWindowFocus: cache.refetchOnWindowFocus, // 窗口聚焦时重新获取
    refetchOnReconnect: cache.refetchOnReconnect, // 网络重连时重新获取
    retry: retry.maxRetries, // 重试次数
    retryDelay: (attemptIndex) => {
      // 指数退避
      if (retry.exponentialBackoff) {
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      }
      return retry.retryDelay;
    },
    ...options, // 允许外部覆盖配置
  });
}

/**
 * usePortfolio Hook
 * 使用 TanStack Query 管理资产查询
 * 
 * @param address - 钱包地址
 * @param isConnected - 是否已连接钱包
 * @returns 资产数据、加载状态、错误信息和刷新函数
 */
export const usePortfolio = (address?: string, isConnected?: boolean) => {
  const query = usePortfolioQuery(address, isConnected ?? false);

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
    // 暴露更多 TanStack Query 的状态
    isError: query.isError,
    isSuccess: query.isSuccess,
    isFetching: query.isFetching,
  };
};

// 导出 Asset 类型以便外部使用
export type { Asset };
