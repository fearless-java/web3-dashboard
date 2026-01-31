import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { fetchTotalGasSpent } from '@/services/gas';
import { dashboardConfig } from '@/config/dashboard.config';

/**
 * Query Key 生成器
 */
export function getGasSpentQueryKey(address?: string) {
  return ['gas-spent', address] as const;
}

/**
 * 自定义 Hook: 获取用户历史 Gas 消耗
 * 
 * 技术要点：
 * 1. 使用 React Query 管理异步状态
 * 2. StaleTime 设置为 5 分钟（Gas 消耗总量变化不频繁）
 * 3. 只有当地址存在时才启用查询
 * 4. 遵循项目配置的 cache 和 retry 策略
 * 
 * @param address 用户钱包地址
 * @returns React Query 结果对象
 */
export function useGasSpent(
  address?: string
): UseQueryResult<string, Error> & {
  totalGasSpent: string;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
} {
  const { cache, retry } = dashboardConfig;

  // 配置 React Query
  const query = useQuery({
    queryKey: getGasSpentQueryKey(address),
    queryFn: () => fetchTotalGasSpent(address!),
    
    // 只有当地址存在时才启用查询
    enabled: !!address && address.length > 0,
    
    // StaleTime: 5 分钟（300000ms）
    // Gas 消耗总量不需要频繁刷新
    staleTime: 5 * 60 * 1000,
    
    // 缓存时间：使用项目配置
    gcTime: cache.enabled ? cache.gcTime : 0,
    
    // 重试配置：使用项目配置
    retry: retry.maxRetries,
    retryDelay: (attemptIndex) => {
      if (retry.exponentialBackoff) {
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      }
      return retry.retryDelay;
    },
    
    // 窗口焦点和重连时的重新获取：使用项目配置
    refetchOnWindowFocus: cache.refetchOnWindowFocus,
    refetchOnReconnect: cache.refetchOnReconnect,
  });

  // 返回增强的查询结果
  return {
    ...query,
    totalGasSpent: query.data ?? '0',
    isLoading: query.isLoading,
    isError: query.isError,
    isSuccess: query.isSuccess,
  };
}
