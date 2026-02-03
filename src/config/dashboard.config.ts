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
  alchemyNetwork?: Network,
  defiLlamaKey?: string
): NetworkConfig => ({
  chain,
  enabled,
  priority,
  customName,
  iconurl,
  alchemyNetwork,
  defiLlamaKey,
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
      Network.ETH_MAINNET,
      'ethereum'
    ),
    createNetworkConfig(
      chains.arbitrum,
      true,
      2,
      'Arbitrum',
      'https://icons.llamao.fi/icons/chains/rsz_arbitrum',
      Network.ARB_MAINNET,
      'arbitrum'
    ),
    createNetworkConfig(
      chains.optimism,
      true,
      3,
      'Optimism',
      'https://icons.llamao.fi/icons/chains/rsz_optimism',
      Network.OPT_MAINNET,
      'optimism'
    ),
    createNetworkConfig(
      chains.base,
      true,
      4,
      'Base',
      'https://icons.llamao.fi/icons/chains/rsz_base',
      Network.BASE_MAINNET,
      'base'
    ),
    createNetworkConfig(
      chains.polygon,
      true,
      5,
      'Polygon',
      'https://icons.llamao.fi/icons/chains/rsz_polygon',
      Network.MATIC_MAINNET,
      'polygon'
    ),
    createNetworkConfig(
      chains.avalanche,
      true,
      6,
      'Avalanche',
      'https://icons.llamao.fi/icons/chains/rsz_avalanche',
      Network.AVAX_MAINNET,
      'avax'
    ),
    createNetworkConfig(
      chains.bsc,
      true,
      7,
      'BNB Chain',
      'https://icons.llamao.fi/icons/chains/rsz_binance',
      Network.BNB_MAINNET,
      'bsc'
    ),
    createNetworkConfig(
      chains.sepolia,
      true,
      8,
      'Sepolia',
      'https://icons.llamao.fi/icons/chains/rsz_ethereum',
      Network.ETH_SEPOLIA
      // Sepolia 是测试网，不添加 defiLlamaKey（DefiLlama 主要用于主网）
    ),
  ],

  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,
  

  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,

  refresh: {
    portfolio: 60000, // 60s - 核心资产数据刷新间隔
    currentPrice: 30000, // 30s - 当前市场价格刷新间隔（降低刷新频率减少请求）
    historyPrice: false, // false - 历史价格不自动刷新（变化极慢）
    transaction: 60000, // 60s - 交易历史刷新间隔
    nft: 120000, // 120s - NFT 数据刷新间隔
  },

  retry: {
    maxRetries: 2, // 减少重试次数，快速失败
    retryDelay: 500, // 减少重试延迟
    exponentialBackoff: true,
    timeout: 5000, // 减少超时时间
  },

  cache: {
    enabled: true,
    staleTime: 60000, // 1分钟 - 当前价格数据过期时间（减少缓存时间，确保数据新鲜度）
    staleTimeHistory: 3600000, // 1h - 历史价格数据过期时间
    gcTime: 300000,
    refetchOnWindowFocus: false, // 禁用窗口聚焦刷新，避免意外请求
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
