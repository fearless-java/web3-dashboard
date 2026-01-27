import * as chains from 'viem/chains'
import { Network } from "alchemy-sdk";

export type NetworkConfig = {
  chain: chains.Chain;
  enabled: boolean;
  priority: number;
  customName?: string;
  iconurl?: string;
};

export type RefreshConfig = {
  balance: number;
  transaction: number;
  token: number;
  nft: number;
  price: number;
};

export type RetryConfig = {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  timeout: number;
};

export type CacheConfig = {
  enabled: boolean;
  staleTime: number;
  gcTime: number;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
};

export type FeatureFlags = {
  multiChain: boolean;
  nftSupport: boolean;
  defiProtocols: boolean;
  analytics: boolean;
  exportData: boolean;
  darkMode: boolean;
  notifications: boolean;
};

export type RateLimitConfig = {
  enabled: boolean;
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
};

export type LoggingConfig = {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  console: boolean;
  remote?: {
    endpoint: string;
    apiKey?: string;
  };
};

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

  ui?: {
    defaultTheme: 'light' | 'dark' | 'system';
    defaultCurrency: 'USD' | 'EUR' | 'CNY' | 'JPY';
    dateFormat: string;
    numberFormat: {
      decimals: number;
      useGrouping: boolean;
    };
  };
};

export const DEFAULT_ALCHEMY_API_KEY = "cR4WnXePioePZ5fFrnSiR";

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

export const dashboardConfig: DashboardConfig = {
  
  networks: [
    
    createNetworkConfig(
      chains.mainnet, 
      true, 
      1, 
      'Ethereum', 
      'https://icons.llamao.fi/icons/chains/rsz_ethereum?w=48&h=48'
    ),

    createNetworkConfig(
      chains.arbitrum, 
      true, 
      2, 
      'Arbitrum', 
      'https://icons.llamao.fi/icons/chains/rsz_arbitrum?w=48&h=48'
    ),

    createNetworkConfig(
      chains.optimism, 
      true, 
      3, 
      'Optimism', 
      'https://icons.llamao.fi/icons/chains/rsz_optimism?w=48&h=48'
    ),

    createNetworkConfig(
      chains.base, 
      true, 
      4, 
      'Base', 
      'https://icons.llamao.fi/icons/chains/rsz_base?w=48&h=48'
    ), 

    createNetworkConfig(
      chains.polygon, 
      true, 
      5, 
      'Polygon', 
      'https://icons.llamao.fi/icons/chains/rsz_polygon?w=48&h=48'
    ),

    createNetworkConfig(
      chains.avalanche, 
      false, 
      6, 
      'Avalanche', 
      'https://icons.llamao.fi/icons/chains/rsz_avalanche?w=48&h=48'
    ),

    createNetworkConfig(
      chains.bsc, 
      false, 
      7, 
      'BNB Chain', 
      'https://icons.llamao.fi/icons/chains/rsz_binance?w=48&h=48'
    ),

    createNetworkConfig(
      chains.sepolia, 
      true, 
      8, 
      'Sepolia', 
      'https://icons.llamao.fi/icons/chains/rsz_ethereum?w=48&h=48'
    ),
  ],

  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,

  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,

  refresh: {
    balance: 10000, 
    transaction: 30000, 
    token: 60000, 
    nft: 120000, 
    price: 5000, 
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
    darkMode: true,
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
    defaultTheme: 'system',
    defaultCurrency: 'USD',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    numberFormat: {
      decimals: 18,
      useGrouping: true,
    },
  },
};

export const getEnabledNetworks = (): chains.Chain[] => {
  return dashboardConfig.networks
    .filter(network => network.enabled)
    .sort((a, b) => a.priority - b.priority)
    .map(network => network.chain);
};

export const getNetworkConfig = (chainId: number): NetworkConfig | undefined => {
  return dashboardConfig.networks.find(network => network.chain.id === chainId);
};

export const getNetworkIconUrl = (chainId: number): string | undefined => {
  return dashboardConfig.networks.find(network => network.chain.id === chainId)?.iconurl;
};

export const getRpcUrl = (chainId: number): string | undefined => {
  if (dashboardConfig.rpcOverrides?.[chainId]) {
    return dashboardConfig.rpcOverrides[chainId];
  }

  const networkName = getAlchemyNetworkName(chainId);
  const apiKey = dashboardConfig.alchemyApiKey;

  if (!apiKey) {
    console.warn('Alchemy API Key not configured');
    return undefined;
  }

  return `https://${networkName}.g.alchemy.com/v2/${apiKey}`;
};

const getAlchemyNetworkName = (chainId: number): string => {
  const networkMap: Record<number, string> = {
    1: 'eth-mainnet',
    11155111: 'eth-sepolia',
    42161: 'arb-mainnet',
    10: 'opt-mainnet',
    8453: 'base-mainnet',
    137: 'polygon-mainnet',
    43114: 'avax-mainnet',
    56: 'bnb-mainnet',
  };
  return networkMap[chainId] || 'eth-mainnet';
};

export const getAlchemyNetworkEnum = (chainId: number): Network => {
    switch (chainId) {
      case 1: return Network.ETH_MAINNET;
      case 42161: return Network.ARB_MAINNET;
      case 10: return Network.OPT_MAINNET;
      case 8453: return Network.BASE_MAINNET;
      case 137: return Network.MATIC_MAINNET;
      case 43114: return Network.AVAX_MAINNET;
      case 56: return Network.BNB_MAINNET;
      case 11155111: return Network.ETH_SEPOLIA;
      default: return Network.ETH_MAINNET;
    }
  };

export const LLAMA_CHAIN_MAP: Record<number, string> = {
  1: 'ethereum',
  56: 'bsc',
  137: 'polygon',
  10: 'optimism',
  42161: 'arbitrum',
  8453: 'base',
  43114: 'avax',
  };

export const NATIVE_TOKEN_MAP: Record<number, string> = {
  1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  42161: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  10: '0x4200000000000000000000000000000000000006',
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  137: '0x0d500b439175581773932599acf05494cf54f6a9',
  43114: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  8453: '0x4200000000000000000000000000000000000006',
};
