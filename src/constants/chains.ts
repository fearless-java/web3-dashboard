/**
 * 链相关常量映射
 */

/**
 * 默认 Alchemy API Key
 */
export const DEFAULT_ALCHEMY_API_KEY = "cR4WnXePioePZ5fFrnSiR";

/**
 * DefiLlama 链名称映射
 * 用于获取链的图标和元数据
 */
export const LLAMA_CHAIN_MAP: Record<number, string> = {
  1: 'ethereum',
  56: 'bsc',
  137: 'polygon',
  10: 'optimism',
  42161: 'arbitrum',
  8453: 'base',
  43114: 'avax',
};

/**
 * 原生代币地址映射
 * 各链原生代币的合约地址（用于价格查询等场景）
 */
export const NATIVE_TOKEN_MAP: Record<number, string> = {
  1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // Ethereum (WETH)
  42161: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // Arbitrum (WETH)
  10: '0x4200000000000000000000000000000000000006', // Optimism (WETH)
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // BNB Chain (WBNB)
  137: '0x0d500b439175581773932599acf05494cf54f6a9', // Polygon (WMATIC)
  43114: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7', // Avalanche (WAVAX)
  8453: '0x4200000000000000000000000000000000000006', // Base (WETH)
};
