import * as chains from 'viem/chains';
import { Network } from 'alchemy-sdk';

/**
 * 网络配置：1.支持的网络 2.是否启用 3.优先级 4.自定义名称 5.网络logo url 6.Alchemy网络枚举
 */
export type NetworkConfig = {
  chain: chains.Chain;
  enabled: boolean;
  priority: number;
  customName?: string;
  iconurl?: string;
  /**
   * Alchemy SDK 网络枚举值
   * 如果网络支持 Alchemy，应设置此字段
   * 用于 RPC 调用和网络识别
   */
  alchemyNetwork?: Network;
};

/**
 * 刷新配置
 */
export type RefreshConfig = {
  // 1. 核心资产数据 (RPC层)
  // 包含：代币列表 + 余额 + 代币基础元数据(Symbol/Decimals)
  // 建议：60s (1分钟)
  // 原因：除非交易，否则不变。
  portfolio: number; 

  // 2. 市场价格数据 (API层)
  // 包含：所有代币的 USD 价格
  // 建议：15s - 30s
  // 原因：需要让用户感觉到行情在跳动。
  price: number;

  // 3. 交易历史 (RPC/Indexer层)
  // 建议：60s - 120s (甚至更长)
  // 原因：历史数据只会增加，不会变。
  transaction: number;

  // 4. NFT 数据 (RPC/NFT API层)
  // 建议：120s (2分钟) 或甚至不自动刷新，只在切Tab时刷新
  // 原因：NFT 流动性低，变化频率远低于代币。
  nft: number;
};

/**
 * 失败重新请求配置：1.最大重试次数 2.重试延迟 3.是否使用指数退避 4.请求超时时间
 */
export type RetryConfig = {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  timeout: number;
};

/**
 * 缓存配置：1.是否启用 2.数据过期时间 3.垃圾回收时间 4.窗口聚焦时重新获取 5.网络重连时重新获取
 */
export type CacheConfig = {
  enabled: boolean;
  staleTime: number;
  gcTime: number;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
};

/**
 * 功能开关配置：1.多链支持 2.NFT支持 3.DeFi协议支持 4.分析功能 5.数据导出功能 6.通知功能
 * 注意：UI 默认值（如主题、货币）应配置在 ui 对象中，而非功能开关
 */
export type FeatureFlags = {
  multiChain: boolean;
  nftSupport: boolean;
  defiProtocols: boolean;
  analytics: boolean;
  exportData: boolean;
  notifications: boolean;
};

/**
 * 速率限制配置：1.是否启用 2.每秒请求数限制 3.每分钟请求数限制 4.每小时请求数限制
 */
export type RateLimitConfig = {
  enabled: boolean;
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
};

/**
 * 日志配置
 */
export type LoggingConfig = {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  console: boolean;
  remote?: {
    endpoint: string;
    apiKey?: string;
  };
};

/**
 * Dashboard 配置类型
 */
export type DashboardConfig = {
  networks: NetworkConfig[];

  alchemyApiKey: string;
  rpcOverrides?: Record<number, string>;

  walletConnectProjectId?: string;

  refresh: RefreshConfig;
  retry: RetryConfig;
  cache: CacheConfig;
  features: FeatureFlags;
  rateLimit: RateLimitConfig;
  logging: LoggingConfig;

  /**
   * UI 系统默认配置（System Defaults）
   * 这些值作为应用启动时的默认值，用户可以通过 settingsStore 覆盖
   */
  ui?: {
    defaultTheme: 'light' | 'dark' | 'system';
    defaultThemeColor: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan';
    dateFormat: string;
    numberFormat: {
      decimals: number;
      useGrouping: boolean;
    };
  };
};
