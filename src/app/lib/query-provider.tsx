'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';
import { dashboardConfig } from '@/config/dashboard.config';

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
  const [queryClient] = useState(() => createQueryClient());

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
