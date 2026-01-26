/**
 * 价格服务
 * 用于获取代币价格信息
 */

import { Asset } from "@/types/assets";

// DefiLlama 特有的链名映射
export const LLAMA_CHAIN_MAP: Record<number, string> = {
  1: 'ethereum',
  56: 'bsc',
  137: 'polygon',
  10: 'optimism',
  42161: 'arbitrum',
  8453: 'base',
  43114: 'avax',
  // Sepolia 测试网通常没有价格，可以直接忽略或返回 0
};

// 一些原生代币对应的 "Wrapped" 合约地址 (用于查询原生代币价格)
// 因为 DefiLlama 通常用 WETH 的价格来代表 ETH
export const NATIVE_TOKEN_MAP: Record<number, string> = {
  1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  42161: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH (Arb)
  10: '0x4200000000000000000000000000000000000006', // WETH (OP)
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
  137: '0x0d500b439175581773932599acf05494cf54f6a9', // WMATIC
  43114: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7', // WAVAX
  8453: '0x4200000000000000000000000000000000000006', // WETH (Base)
};

