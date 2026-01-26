'use client';

import { ReactNode, useMemo } from 'react';
import { WagmiProvider, http } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { useQueryClient } from '@tanstack/react-query';
import { getEnabledNetworks, dashboardConfig, getRpcUrl } from '@/config/dashboard.config';
import '@rainbow-me/rainbowkit/styles.css';

/**
 * Wallet Provider 组件
 * 包装 WagmiProvider 和 RainbowKitProvider
 * 使用 dashboard 配置中的网络和 WalletConnect 设置
 * 
 * 注意：使用共享的 QueryClient（由外层的 QueryProvider 提供）
 * 这样 Wagmi 和应用查询可以共享缓存，符合 TanStack Query 最佳实践
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  // 获取共享的 QueryClient（由 QueryProvider 提供）
  const queryClient = useQueryClient();
  
  const enabledChains = getEnabledNetworks();

  // 确保至少有一个链
  if (enabledChains.length === 0) {
    throw new Error('至少需要启用一个网络才能初始化 RainbowKit');
  }

  // 为每个启用的链动态配置 RPC transports
  const transports = useMemo(
    () =>
      enabledChains.reduce((acc, chain) => {
        const rpcUrl = getRpcUrl(chain.id);
        if (rpcUrl) {
          acc[chain.id] = http(rpcUrl);
        }
        return acc;
      }, {} as Record<number, ReturnType<typeof http>>),
    [enabledChains]
  );

  // 创建 Wagmi 配置，传入共享的 QueryClient
  const wagmiConfig = useMemo(
    () =>
      getDefaultConfig({
        appName: 'Crypto Dashboard',
        projectId: dashboardConfig.walletConnectProjectId || 'default-project-id', // WalletConnect Project ID
        // @ts-expect-error - RainbowKit 的类型定义要求元组类型，但 viem chains 是数组，运行时兼容
        chains: enabledChains,
        ssr: true, // 支持 SSR (Next.js)
        transports, // 使用动态配置的 RPC transports
        queryClient, // 传入共享的 QueryClient
      }),
    [enabledChains, transports, queryClient]
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
