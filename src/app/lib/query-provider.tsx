'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';
import { dashboardConfig } from '@/config/dashboard.config';

// 使用模块级单例确保 QueryClient 在页面切换时不会被重新创建
// 这样可以保持缓存数据，避免用户返回页面时重新加载
let queryClientInstance: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // 服务端渲染时创建新的实例（每个请求一个）
    return createQueryClient();
  }
  
  // 浏览器端使用单例模式
  if (!queryClientInstance) {
    queryClientInstance = createQueryClient();
  }
  return queryClientInstance;
}

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

export function QueryProvider({ children }: { children: ReactNode }) {
  // 使用单例获取 QueryClient，确保页面切换时缓存不丢失
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}
