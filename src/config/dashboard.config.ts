import * as chains from 'viem/chains'
import { Network } from "alchemy-sdk";

/**
 * 网络配置
 * 每个区块链网络的基本信息
 */
export type NetworkConfig = {
  chain: chains.Chain; // 链的信息（ID、名称等）
  enabled: boolean; // 是否启用该网络（可以临时关闭某个链）
  priority: number; // 显示优先级（数字越小越靠前显示）
  customName?: string; // 自定义显示名称（比如显示"以太坊主网"而不是"Ethereum"）
  iconurl?: string;
};

/**
 * 数据刷新配置
 */
export type RefreshConfig = {
  balance: number; // 余额刷新间隔（毫秒）
  transaction: number; // 交易记录刷新间隔
  token: number; // Token 列表刷新间隔
  nft: number; // NFT 刷新间隔
  price: number; // 价格刷新间隔
};

/**
 * 错误处理和重试配置
 */
export type RetryConfig = {
  maxRetries: number; // 最大重试次数
  retryDelay: number; // 重试延迟（毫秒）
  exponentialBackoff: boolean; // 是否使用指数退避
  timeout: number; // 请求超时时间（毫秒）
};

/**
 * 缓存配置
 */
export type CacheConfig = {
  enabled: boolean; // 是否启用缓存
  staleTime: number; // 数据过期时间（毫秒）
  gcTime: number; // 垃圾回收时间（毫秒），原 cacheTime
  refetchOnWindowFocus: boolean; // 窗口聚焦时重新获取
  refetchOnReconnect: boolean; // 网络重连时重新获取
};

/**
 * 功能开关配置
 */
export type FeatureFlags = {
  multiChain: boolean; // 多链支持
  nftSupport: boolean; // NFT 支持
  defiProtocols: boolean; // DeFi 协议支持
  analytics: boolean; // 分析功能
  exportData: boolean; // 数据导出
  darkMode: boolean; // 暗黑模式
  notifications: boolean; // 通知功能
};

/**
 * API 速率限制配置
 */
export type RateLimitConfig = {
  enabled: boolean; // 是否启用速率限制
  requestsPerSecond: number; // 每秒请求数
  requestsPerMinute: number; // 每分钟请求数
  requestsPerHour: number; // 每小时请求数
};

/**
 * 日志配置
 */
export type LoggingConfig = {
  enabled: boolean; // 是否启用日志
  level: 'debug' | 'info' | 'warn' | 'error'; // 日志级别
  console: boolean; // 是否输出到控制台
  remote?: {
    endpoint: string; // 远程日志端点
    apiKey?: string; // API Key
  };
};

/**
 * Dashboard 配置类型
 * 这是整个看板的所有配置，就像是一个"总控制面板"
 */
export type DashboardConfig = {
  // 网络配置：支持哪些区块链
  networks: NetworkConfig[];
  
  // RPC 配置：如何连接区块链（只支持 Alchemy）
  alchemyApiKey: string; // Alchemy 的 API 密钥
  rpcOverrides?: Record<number, string>; // 特定链的自定义 RPC 地址（可选，一般不用）
  
  // WalletConnect：钱包连接配置
  walletConnectProjectId?: string; // WalletConnect 的项目 ID（用于连接钱包）
  
  // 数据刷新配置：多久更新一次数据
  refresh: RefreshConfig;
  
  // 错误处理和重试：请求失败时怎么办
  retry: RetryConfig;
  
  // 缓存配置：数据存多久，什么时候刷新
  cache: CacheConfig;
  
  // 功能开关：哪些功能开启/关闭
  features: FeatureFlags;
  
  // API 速率限制：防止请求太频繁被限流
  rateLimit: RateLimitConfig;
  
  // 日志配置：记录什么信息，记录到哪里
  logging: LoggingConfig;
  
  // UI 配置：界面显示相关
  ui?: {
    defaultTheme: 'light' | 'dark' | 'system'; // 默认主题
    defaultCurrency: 'USD' | 'EUR' | 'CNY' | 'JPY'; // 默认货币
    dateFormat: string; // 日期格式
    numberFormat: {
      decimals: number; // 小数点后几位
      useGrouping: boolean; // 是否使用千分位分隔符（如 1,000）
    };
  };
};

// 默认配置常量
export const DEFAULT_ALCHEMY_API_KEY = "cR4WnXePioePZ5fFrnSiR";

/**
 * 创建网络配置的辅助函数
 * 就像是一个"模板"，方便批量创建网络配置
 */
const createNetworkConfig = (
  chain: chains.Chain,
  enabled: boolean = true,
  priority: number = 0,
  customName?: string,
  iconurl?: string
): NetworkConfig => ({
  chain,
  enabled,
  priority,
  customName,
  iconurl,
});

/**
 * Dashboard 配置实例
 */
export const dashboardConfig: DashboardConfig = {
  // 网络配置
  networks: [
    // 1. Ethereum Mainnet
    createNetworkConfig(
      chains.mainnet, 
      true, 
      1, 
      'Ethereum', 
      'https://icons.llamao.fi/icons/chains/rsz_ethereum?w=48&h=48'
    ),
  
    // 2. Arbitrum One 
    createNetworkConfig(
      chains.arbitrum, 
      true, 
      2, 
      'Arbitrum', 
      'https://icons.llamao.fi/icons/chains/rsz_arbitrum?w=48&h=48'
    ),
  
    // 3. Optimism
    createNetworkConfig(
      chains.optimism, 
      true, 
      3, 
      'Optimism', 
      'https://icons.llamao.fi/icons/chains/rsz_optimism?w=48&h=48'
    ),
  
    // 4. Base
    createNetworkConfig(
      chains.base, 
      true, 
      4, 
      'Base', 
      'https://icons.llamao.fi/icons/chains/rsz_base?w=48&h=48'
    ), 
  
    // 5. Polygon 
    createNetworkConfig(
      chains.polygon, 
      true, 
      5, 
      'Polygon', 
      'https://icons.llamao.fi/icons/chains/rsz_polygon?w=48&h=48'
    ),
  
    // 6. Avalanche
    createNetworkConfig(
      chains.avalanche, 
      true, 
      6, 
      'Avalanche', 
      'https://icons.llamao.fi/icons/chains/rsz_avalanche?w=48&h=48'
    ),
  
    // 7. BNB Chain (BSC)
    createNetworkConfig(
      chains.bsc, 
      true, 
      7, 
      'BNB Chain', 
      'https://icons.llamao.fi/icons/chains/rsz_binance?w=48&h=48'
    ),
  
    // 8. Sepolia 
    createNetworkConfig(
      chains.sepolia, 
      true, 
      8, 
      'Sepolia', 
      'https://icons.llamao.fi/icons/chains/rsz_ethereum?w=48&h=48'
    ),
  ],

  // Alchemy API Key（从环境变量读取，如果没有就用默认值）
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,

  // WalletConnect
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,

  // 数据刷新配置
  refresh: {
    balance: 10000, // 10秒
    transaction: 30000, // 30秒
    token: 60000, // 1分钟
    nft: 120000, // 2分钟
    price: 5000, // 5秒（价格变化频繁）
  },

  // 错误处理和重试
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    timeout: 10000, // 10秒超时
  },

  // 缓存配置
  cache: {
    enabled: true,
    staleTime: 30000, // 30秒后数据过期
    gcTime: 300000, // 5分钟后垃圾回收
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  // 功能开关
  features: {
    multiChain: true,
    nftSupport: true,
    defiProtocols: true,
    analytics: true,
    exportData: true,
    darkMode: true,
    notifications: true,
  },

  // API 速率限制
  rateLimit: {
    enabled: true,
    requestsPerSecond: 10,
    requestsPerMinute: 300,
    requestsPerHour: 10000,
  },

  // 日志配置
  logging: {
    enabled: process.env.NODE_ENV === 'development',
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    console: true,
  },

  // UI 配置
  ui: {
    defaultTheme: 'system',
    defaultCurrency: 'USD',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    numberFormat: {
      decimals: 18,
      useGrouping: true,
    },
  },
};

/**
 * 获取启用的网络列表
 */
export const getEnabledNetworks = (): chains.Chain[] => {
  return dashboardConfig.networks
    .filter(network => network.enabled)
    .sort((a, b) => a.priority - b.priority)
    .map(network => network.chain);
};

/**
 * 根据链 ID 获取网络配置
 */
export const getNetworkConfig = (chainId: number): NetworkConfig | undefined => {
  return dashboardConfig.networks.find(network => network.chain.id === chainId);
};

export const getNetworkIconUrl = (chainId: number): string | undefined => {
  return dashboardConfig.networks.find(network => network.chain.id === chainId)?.iconurl;
};

/**
 * 获取指定网络的 Alchemy RPC URL
 * 根据链 ID 自动生成对应的 Alchemy 连接地址
 */
export const getRpcUrl = (chainId: number): string | undefined => {
  // 先检查是否有自定义的 RPC 地址
  if (dashboardConfig.rpcOverrides?.[chainId]) {
    return dashboardConfig.rpcOverrides[chainId];
  }

  // 获取 Alchemy 的网络名称（不同链有不同的名称）
  const networkName = getAlchemyNetworkName(chainId);
  const apiKey = dashboardConfig.alchemyApiKey;

  if (!apiKey) {
    console.warn('Alchemy API Key 未配置');
    return undefined;
  }

  // 构建 Alchemy 的 RPC URL
  return `https://${networkName}.g.alchemy.com/v2/${apiKey}`;
};

/**
 * 获取 Alchemy 网络名称
 * 把链 ID 转换成 Alchemy 能识别的网络名称
 */
const getAlchemyNetworkName = (chainId: number): string => {
  const networkMap: Record<number, string> = {
    1: 'eth-mainnet',        // 以太坊主网
    11155111: 'eth-sepolia', // Sepolia 测试网
    42161: 'arb-mainnet',    // Arbitrum
    10: 'opt-mainnet',       // Optimism
    8453: 'base-mainnet',    // Base
    137: 'polygon-mainnet',  // Polygon
    43114: 'avax-mainnet',   // Avalanche
    56: 'bnb-mainnet',       // BNB Chain
  };
  return networkMap[chainId] || 'eth-mainnet'; // 默认返回以太坊主网
};

/**
 * 核心功能：将 ChainID 转换为 Alchemy SDK 需要的 Network 枚举
 * 用于 fetchUserTokens 等看板数据获取函数
 */
export const getAlchemyNetworkEnum = (chainId: number): Network => {
    switch (chainId) {
      case 1: return Network.ETH_MAINNET;
      case 42161: return Network.ARB_MAINNET;
      case 10: return Network.OPT_MAINNET;
      case 8453: return Network.BASE_MAINNET;
      case 137: return Network.MATIC_MAINNET;
      case 43114: return Network.AVAX_MAINNET;
      case 56: return Network.BNB_MAINNET; 
      // 测试网处理
      case 11155111: return Network.ETH_SEPOLIA;
      default: return Network.ETH_MAINNET;
    }
  };
