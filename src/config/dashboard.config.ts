import * as chains from 'viem/chains';
import { Network } from 'alchemy-sdk';
import type { NetworkConfig, DashboardConfig } from '@/types/config';
import { DEFAULT_ALCHEMY_API_KEY } from '@/constants/chains';

/**
 * 创建网络配置的工具函数
 */
const createNetworkConfig = (
  chain: chains.Chain,
  enabled: boolean = true,
  priority: number = 0,
  customName?: string,
  iconurl?: string,
  alchemyNetwork?: Network
): NetworkConfig => ({
  chain,
  enabled,
  priority,
  customName,
  iconurl,
  alchemyNetwork,
});

/**
 * 初始化dashboard配置
 */
export const dashboardConfig: DashboardConfig = {
  networks: [
    createNetworkConfig(
      chains.mainnet, 
      true, 
      1, 
      'Ethereum', 
      'https://icons.llamao.fi/icons/chains/rsz_ethereum',
      Network.ETH_MAINNET
    ),
    createNetworkConfig(
      chains.arbitrum, 
      true, 
      2, 
      'Arbitrum', 
      'https://icons.llamao.fi/icons/chains/rsz_arbitrum',
      Network.ARB_MAINNET
    ),
    createNetworkConfig(
      chains.optimism, 
      true, 
      3, 
      'Optimism', 
      'https://icons.llamao.fi/icons/chains/rsz_optimism',
      Network.OPT_MAINNET
    ),
    createNetworkConfig(
      chains.base, 
      true, 
      4, 
      'Base', 
      'https://icons.llamao.fi/icons/chains/rsz_base',
      Network.BASE_MAINNET
    ), 
    createNetworkConfig(
      chains.polygon, 
      true, 
      5, 
      'Polygon', 
      'https://icons.llamao.fi/icons/chains/rsz_polygon',
      Network.MATIC_MAINNET
    ),
    createNetworkConfig(
      chains.avalanche, 
      false, 
      6, 
      'Avalanche', 
      'https://icons.llamao.fi/icons/chains/rsz_avalanche',
      Network.AVAX_MAINNET
    ),
    createNetworkConfig(
      chains.bsc, 
      false, 
      7, 
      'BNB Chain', 
      'https://icons.llamao.fi/icons/chains/rsz_binance',
      Network.BNB_MAINNET
    ),
    createNetworkConfig(
      chains.sepolia, 
      true, 
      8, 
      'Sepolia', 
      'https://icons.llamao.fi/icons/chains/rsz_ethereum',
      Network.ETH_SEPOLIA
    ),
  ],

  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,
  

  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,

  refresh: {
    portfolio: 60000, // 60s - 核心资产数据刷新间隔
    price: 15000, // 15s - 市场价格数据刷新间隔
    transaction: 60000, // 60s - 交易历史刷新间隔
    nft: 120000, // 120s - NFT 数据刷新间隔
  },

  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    timeout: 10000, 
  },

  cache: {
    enabled: true,
    staleTime: 30000, 
    gcTime: 300000, 
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  features: {
    multiChain: true,
    nftSupport: true,
    defiProtocols: true,
    analytics: true,
    exportData: true,
    notifications: true,
  },

  rateLimit: {
    enabled: true,
    requestsPerSecond: 10,
    requestsPerMinute: 300,
    requestsPerHour: 10000,
  },

  logging: {
    enabled: process.env.NODE_ENV === 'development',
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    console: true,
  },

  ui: {
    defaultTheme: 'light', // 改为浅色主题作为默认
    defaultThemeColor: 'blue',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    numberFormat: {
      decimals: 18,
      useGrouping: true,
    },
  },
};

// 重新导出类型，保持向后兼容
export type { NetworkConfig, DashboardConfig } from '@/types/config';
