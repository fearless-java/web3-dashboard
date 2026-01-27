import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchTransactions } from '@/services/transactions';
import { dashboardConfig } from '@/config/dashboard.config';
import type {
  Transaction,
  FetchTransactionsParams,
  TransactionsResult,
  TransactionType,
} from '@/types/transactions';

export function getTransactionsQueryKey(
  address?: string,
  type?: TransactionType
) {
  return ['transactions', address, type] as const;
}

export function useTransactions(
  address: string | undefined,
  type: TransactionType = 'all',
  isConnected: boolean = false,
  options?: Omit<
    UseQueryOptions<TransactionsResult, Error>,
    'queryKey' | 'queryFn' | 'enabled'
  >
) {
  
  const { refresh, cache, retry } = dashboardConfig;

  return useQuery({
    queryKey: getTransactionsQueryKey(address, type),
    queryFn: () =>
      fetchTransactions({
        address: address!,
        type,
        maxCount: 100, 
      }),
    enabled: isConnected && !!address && address.length > 0, 
    staleTime: cache.enabled ? cache.staleTime : 0, 
    gcTime: cache.enabled ? cache.gcTime : 0, 
    refetchInterval: refresh.transaction, 
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

export function useBuyTransactions(
  address: string | undefined,
  isConnected: boolean = false,
  options?: Omit<
    UseQueryOptions<TransactionsResult, Error>,
    'queryKey' | 'queryFn' | 'enabled'
  >
) {
  return useTransactions(address, 'buy', isConnected, options);
}

export function useSellTransactions(
  address: string | undefined,
  isConnected: boolean = false,
  options?: Omit<
    UseQueryOptions<TransactionsResult, Error>,
    'queryKey' | 'queryFn' | 'enabled'
  >
) {
  return useTransactions(address, 'sell', isConnected, options);
}

export function useAllTransactions(
  address: string | undefined,
  isConnected: boolean = false,
  options?: Omit<
    UseQueryOptions<TransactionsResult, Error>,
    'queryKey' | 'queryFn' | 'enabled'
  >
) {
  return useTransactions(address, 'all', isConnected, options);
}

export type { Transaction, TransactionType, TransactionsResult };
