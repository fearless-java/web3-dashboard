'use client';

import { ReactNode, useMemo } from 'react';
import { WagmiProvider, http } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { dashboardConfig } from '@/config/dashboard.config';
import { getEnabledNetworks, getRpcUrl } from '@/utils/network';
import '@rainbow-me/rainbowkit/styles.css';

export function WalletProvider({ children }: { children: ReactNode }) {
  const enabledChains = getEnabledNetworks();

  if (enabledChains.length === 0) {
    throw new Error('至少需要启用一个网络才能初始化 RainbowKit');
  }

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

  const wagmiConfig = useMemo(
    () =>
      getDefaultConfig({
        appName: 'Crypto Dashboard',
        projectId: dashboardConfig.walletConnectProjectId || 'default-project-id',
        chains: enabledChains as never,
        ssr: true,
        transports,
      }),
    [enabledChains, transports]
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
