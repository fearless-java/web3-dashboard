import * as chains from 'viem/chains';
import { Network } from 'alchemy-sdk';
import { dashboardConfig } from '@/config/dashboard.config';
import type { NetworkConfig } from '@/types/config';

/**
 * 获取所有启用的网络链
 */
export const getEnabledNetworks = (): chains.Chain[] => {
  return dashboardConfig.networks
    .filter(network => network.enabled)
    .sort((a, b) => a.priority - b.priority)
    .map(network => network.chain);
};

/**
 * 根据链 ID 获取网络配置
 * 示例：getNetworkConfig(1) => { chain: chains.mainnet, enabled: true, priority: 1, customName: 'Ethereum', iconurl: 'https://icons.llamao.fi/icons/chains/rsz_ethereum?w=48&h=48', alchemyNetwork: Network.ETH_MAINNET }
 */
export const getNetworkConfig = (chainId: number): NetworkConfig | undefined => {
  return dashboardConfig.networks.find(network => network.chain.id === chainId);
};

/**
 * 根据链 ID 获取网络图标 URL
 */
export const getNetworkIconUrl = (chainId: number): string | undefined => {
  return dashboardConfig.networks.find(network => network.chain.id === chainId)?.iconurl;
};

/**
 * 将 Chain ID 映射到 Trust Wallet Assets 的文件夹命名
 * Trust Wallet 仓库地址: https://github.com/trustwallet/assets
 */
export const getTrustWalletChainName = (chainId: number): string | undefined => {
  const chainNameMap: Record<number, string> = {
    1: 'ethereum',           // Ethereum Mainnet
    10: 'optimism',          // Optimism
    56: 'smartchain',        // BNB Smart Chain
    137: 'polygon',          // Polygon
    8453: 'base',            // Base
    42161: 'arbitrum',       // Arbitrum One
    43114: 'avalanchec',     // Avalanche C-Chain
    250: 'fantom',           // Fantom
    42220: 'celo',           // Celo
    100: 'xdai',             // Gnosis Chain
    324: 'zksync',           // zkSync Era
    1101: 'polygonzkevm',    // Polygon zkEVM
    59144: 'linea',          // Linea
    534352: 'scroll',        // Scroll
    7777777: 'zora',         // Zora
    81457: 'blast',          // Blast
  };
  
  return chainNameMap[chainId];
};

/**
 * 获取原生代币的高清 Logo
 * 优先级:
 * 1. Trust Wallet Assets (高清原图)
 * 2. DefiLlama (去除宽高参数获取原图)
 */
export const getNativeTokenLogo = (chainId: number): string => {
  const trustWalletChain = getTrustWalletChainName(chainId);
  
  // 优先使用 Trust Wallet Assets
  if (trustWalletChain) {
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustWalletChain}/info/logo.png`;
  }
  
  // 降级到 DefiLlama (获取原图，不带宽高参数)
  const networkConfig = getNetworkConfig(chainId);
  if (networkConfig?.iconurl) {
    // 移除可能存在的 ?w=48&h=48 参数
    return networkConfig.iconurl.split('?')[0];
  }
  
  // 最终兜底
  return `https://icons.llamao.fi/icons/chains/rsz_ethereum`;
};

/**
 * 获取 Alchemy 网络名称（从配置中读取）
 * 示例：getAlchemyNetworkName(1) => 'eth-mainnet'
 */
const getAlchemyNetworkName = (chainId: number): string => {
  const networkConfig = getNetworkConfig(chainId);
  
  if (!networkConfig?.alchemyNetwork) {
    return 'eth-mainnet'; // 默认值
  }

  // 从 Alchemy Network 枚举值映射到网络名称
  // 只映射我们实际使用的网络
  const networkNameMap: Partial<Record<Network, string>> = {
    [Network.ETH_MAINNET]: 'eth-mainnet',
    [Network.ETH_GOERLI]: 'eth-goerli',
    [Network.ETH_SEPOLIA]: 'eth-sepolia',
    [Network.OPT_MAINNET]: 'opt-mainnet',
    [Network.OPT_GOERLI]: 'opt-goerli',
    [Network.ARB_MAINNET]: 'arb-mainnet',
    [Network.ARB_GOERLI]: 'arb-goerli',
    [Network.MATIC_MAINNET]: 'polygon-mainnet',
    [Network.MATIC_MUMBAI]: 'polygon-mumbai',
    [Network.BASE_MAINNET]: 'base-mainnet',
    [Network.BASE_GOERLI]: 'base-goerli',
    [Network.AVAX_MAINNET]: 'avax-mainnet',
    [Network.AVAX_FUJI]: 'avax-fuji',
    [Network.BNB_MAINNET]: 'bnb-mainnet',
  };

  return networkNameMap[networkConfig.alchemyNetwork] || 'eth-mainnet';
};

/**
 * 根据链 ID 获取 RPC URL
 * 优先使用 rpcOverrides，否则从配置中读取 Alchemy 网络信息
 * 示例：getRpcUrl(1) => 'https://eth-mainnet.g.alchemy.com/v2/your-api-key'
 */
export const getRpcUrl = (chainId: number): string | undefined => {
  // 优先使用自定义 RPC URL
  if (dashboardConfig.rpcOverrides?.[chainId]) {
    return dashboardConfig.rpcOverrides[chainId];
  }

  // 从配置中获取 Alchemy 网络信息
  const networkConfig = getNetworkConfig(chainId);
  
  if (!networkConfig?.alchemyNetwork) {
    console.warn(`Network ${chainId} does not have Alchemy network configured`);
    return undefined;
  }

  const networkName = getAlchemyNetworkName(chainId);
  const apiKey = dashboardConfig.alchemyApiKey;

  if (!apiKey) {
    console.warn('Alchemy API Key not configured');
    return undefined;
  }

  return `https://${networkName}.g.alchemy.com/v2/${apiKey}`;
};

/**
 * 获取 Alchemy Network 枚举值
 * 从配置中读取，不再使用硬编码的 switch case
 */
export const getAlchemyNetworkEnum = (chainId: number): Network => {
  const networkConfig = getNetworkConfig(chainId);
  
  if (!networkConfig?.alchemyNetwork) {
    console.warn(`Network ${chainId} does not have Alchemy network configured, defaulting to ETH_MAINNET`);
    return Network.ETH_MAINNET;
  }

  return networkConfig.alchemyNetwork;
};
