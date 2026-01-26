'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { dashboardConfig } from '@/config/dashboard.config';

/**
 * 创建共享的 QueryClient
 * 使用 dashboard 配置来初始化，整个应用共享这一个 QueryClient
 */
function createQueryClient() {
  const { cache, retry } = dashboardConfig;

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: cache.enabled ? cache.staleTime : 0,
        gcTime: cache.enabled ? cache.gcTime : 0,
        refetchOnWindowFocus: cache.refetchOnWindowFocus,
        refetchOnReconnect: cache.refetchOnReconnect,
        retry: retry.maxRetries,
        retryDelay: (attemptIndex) => {
          if (retry.exponentialBackoff) {
            return Math.min(1000 * 2 ** attemptIndex, 30000);
          }
          return retry.retryDelay;
        },
      },
    },
  });
}

/**
 * TanStack Query 的 QueryClient Provider
 * 使用 dashboard 配置来初始化 QueryClient
 * 
 * 这是整个应用唯一的 QueryClient，Wagmi 和应用查询都使用它
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
