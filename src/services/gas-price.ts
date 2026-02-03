import type { Chain } from 'viem';
import type { GasPriceData, GasPriceOptions } from '@/types/gas';

export type { GasPriceData, GasPriceOptions };

/**
 * Etherscan Gas Oracle API V2 响应类型
 */
interface EtherscanGasOracleResponse {
  status: string;
  message: string;
  result: {
    SafeGasPrice: string;
    ProposeGasPrice: string;
    FastGasPrice: string;
    gasUsedRatio: string;
    LastBlock: string;
  };
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * Etherscan API 域名映射
 */
const ETHERSCAN_DOMAINS: Record<number, string> = {
  1: 'api.etherscan.io',
  5: 'api-goerli.etherscan.io',
  11155111: 'api-sepolia.etherscan.io',
};

/**
 * 支持的链 ID
 */
const SUPPORTED_CHAINS = new Set([
  1,          // Ethereum Mainnet
  5,          // Goerli
  11155111,   // Sepolia
]);

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 将 Gwei 转换为 ETH
 *
 * 1 Gwei = 10^9 Wei = 0.000000001 ETH
 *
 * @param gwei - Gwei 值
 * @returns ETH 值
 */
function gweiToEth(gwei: number): number {
  return gwei / 1e9;
}

/**
 * 将 Wei 转换为 ETH
 *
 * 1 ETH = 10^18 Wei
 *
 * @param wei - Wei 值 (BigInt 或 number)
 * @returns ETH 值
 */
function weiToEth(wei: bigint | number): number {
  const weiValue = typeof wei === 'bigint' ? wei : BigInt(Math.floor(wei));
  return Number(weiValue) / 1e18;
}

/**
 * 延迟函数
 *
 * @param ms - 延迟毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带超时的 fetch 请求
 *
 * @param url - 请求 URL
 * @param options - 请求选项
 * @param timeout - 超时时间（毫秒）
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// ============================================================================
// RPC URL 获取
// ============================================================================

/**
 * 获取 RPC URL
 *
 * 从项目配置中获取 RPC URL
 *
 * @param chainId - 链 ID
 * @returns RPC URL 或 undefined
 */
function getRpcUrl(chainId: number): string | undefined {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!apiKey) {
    console.warn('[GasPrice] Alchemy API key not configured');
    return undefined;
  }

  const rpcUrls: Record<number, string> = {
    1: `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
    5: `https://eth-goerli.g.alchemy.com/v2/${apiKey}`,
    11155111: `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`,
    42161: `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`,
    10: `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`,
    8453: `https://base-mainnet.g.alchemy.com/v2/${apiKey}`,
    137: `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`,
    56: `https://bnb-mainnet.g.alchemy.com/v2/${apiKey}`,
    43114: `https://avax-mainnet.g.alchemy.com/v2/${apiKey}`,
    250: `https://fantom-mainnet.g.alchemy.com/v2/${apiKey}`,
    324: `https://zksync-mainnet.g.alchemy.com/v2/${apiKey}`,
    59144: `https://linea-mainnet.g.alchemy.com/v2/${apiKey}`,
    5000: `https://mantle-mainnet.g.alchemy.com/v2/${apiKey}`,
  };

  return rpcUrls[chainId];
}

// ============================================================================
// Etherscan API 查询
// ============================================================================

/**
 * 从 Etherscan 获取 Gas 价格
 *
 * Gas Oracle API 返回的三档价格（单位：Gwei）：
 * - SafeGasPrice: 低优先级交易价格
 * - ProposeGasPrice: 标准/平均价格
 * - FastGasPrice: 高优先级交易价格
 *
 * @param chainId - 链 ID
 * @returns Gas 价格数据或 null
 */
async function fetchGasPriceFromEtherscan(chainId: number): Promise<GasPriceData | null> {
  const domain = ETHERSCAN_DOMAINS[chainId];
  if (!domain) {
    return null;
  }

  const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.warn('[GasPrice] Etherscan API key not configured');
    return null;
  }

  const url = `https://${domain}/api?module=gastracker&action=gasoracle&apikey=${apiKey}`;

  try {
    const response = await fetchWithTimeout(url, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    }, 10000);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: EtherscanGasOracleResponse = await response.json();

    if (data.status !== '1' || !data.result) {
      console.warn('[GasPrice] Etherscan API returned error:', data.message);
      return null;
    }

    const result = data.result;

    // Etherscan 仅支持 Ethereum 主网和测试网，原生代币都是 ETH
    const nativeTokenSymbol = chainId === 1 ? 'ETH' : 'ETH';
    
    return {
      safePrice: gweiToEth(parseFloat(result.SafeGasPrice)),
      averagePrice: gweiToEth(parseFloat(result.ProposeGasPrice)),
      fastPrice: gweiToEth(parseFloat(result.FastGasPrice)),
      nativeTokenSymbol,
      utilization: parseFloat(result.gasUsedRatio) * 100,
      lastBlock: parseInt(result.LastBlock, 10),
      source: 'etherscan',
    };
  } catch (error) {
    console.error('[GasPrice] Etherscan API request failed:', error);
    return null;
  }
}

// ============================================================================
// RPC 查询（降级方案）
// ============================================================================

/**
 * 链原生代币信息
 * 每个链有其特定的原生代币符号和精度
 */
const NATIVE_TOKEN_INFO: Record<number, { symbol: string; decimals: number }> = {
  1: { symbol: 'ETH', decimals: 18 },       // Ethereum
  5: { symbol: 'ETH', decimals: 18 },       // Goerli
  11155111: { symbol: 'ETH', decimals: 18 }, // Sepolia
  42161: { symbol: 'ETH', decimals: 18 },   // Arbitrum (使用 ETH)
  10: { symbol: 'ETH', decimals: 18 },      // Optimism (使用 ETH)
  8453: { symbol: 'ETH', decimals: 18 },    // Base (使用 ETH)
  137: { symbol: 'POL', decimals: 18 },     // Polygon (使用 POL，原 MATIC)
  56: { symbol: 'BNB', decimals: 18 },      // BNB Chain
  43114: { symbol: 'AVAX', decimals: 18 },  // Avalanche
  250: { symbol: 'FTM', decimals: 18 },     // Fantom
  324: { symbol: 'ETH', decimals: 18 },     // zkSync (使用 ETH)
  59144: { symbol: 'ETH', decimals: 18 },   // Linea (使用 ETH)
  5000: { symbol: 'MNT', decimals: 18 },    // Mantle
};

/**
 * 从 RPC 获取 Gas 价格（降级方案）
 *
 * RPC 返回的是当前网络的 gas price（单位：Wei）
 * 对于 EIP-1559 链，返回的是 legacy gas price
 *
 * @param chainId - 链 ID
 * @returns Gas 价格数据或 null
 */
async function fetchGasPriceFromRPC(chainId: number): Promise<GasPriceData | null> {
  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) {
    console.warn(`[GasPrice] No RPC URL configured for chain ${chainId}`);
    return null;
  }

  try {
    const { createPublicClient, http } = await import('viem');
    const chainsModule = await import('viem/chains');

    // 从 viem/chains 查找对应的链
    const chain = Object.values(chainsModule).find((c: any) => c.id === chainId) as Chain | undefined;
    if (!chain) {
      throw new Error(`Chain ${chainId} not found in viem chains`);
    }

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl, {
        batch: {
          wait: 50,
        },
      }),
    });

    const gasPrice = await publicClient.getGasPrice();
    
    // 获取链的原生代币信息
    const tokenInfo = NATIVE_TOKEN_INFO[chainId] ?? { symbol: 'ETH', decimals: 18 };
    const divisor = BigInt(10 ** tokenInfo.decimals);
    
    // 将 Wei 转换为原生代币单位
    const tokenPrice = Number(gasPrice) / Number(divisor);
    
    console.log(`[GasPrice] Chain ${chainId}: Raw gas price = ${gasPrice.toString()} Wei, Converted = ${tokenPrice} ${tokenInfo.symbol} (decimals: ${tokenInfo.decimals})`);

    // RPC 只返回单一价格，作为 averagePrice
    // safe 和 fast 根据 average 进行推算
    return {
      safePrice: tokenPrice * 0.9,
      averagePrice: tokenPrice,
      fastPrice: tokenPrice * 1.1,
      nativeTokenSymbol: tokenInfo.symbol,
      source: 'rpc',
    };
  } catch (error) {
    console.error('[GasPrice] RPC request failed:', error);
    return null;
  }
}

// ============================================================================
// 主查询函数（HA 模式）
// ============================================================================

/**
 * 获取当前 Gas 价格（高可用模式）
 *
 * 查询优先级：
 * 1. Etherscan Gas Oracle API（支持 Ethereum、Goerli、Sepolia）
 * 2. 链 RPC 请求（降级方案）
 *
 * @param chainId - 链 ID
 * @param options - 查询选项
 * @returns Gas 价格数据（ETH 单位），失败返回 null
 */
export async function fetchGasPrice(
  chainId: number,
  options: GasPriceOptions = {}
): Promise<GasPriceData | null> {
  const { timeout = 10000 } = options;

  console.log(`[GasPrice] Fetching gas price for chain ${chainId}...`);

  // 优先使用 Etherscan API
  let gasData = await fetchGasPriceFromEtherscan(chainId);

  if (gasData) {
    console.log(
      `[GasPrice] ✓ Etherscan: safe=${gasData.safePrice.toExponential(2)} ETH, ` +
      `avg=${gasData.averagePrice.toExponential(2)} ETH, ` +
      `fast=${gasData.fastPrice.toExponential(2)} ETH`
    );
    return gasData;
  }

  // 降级到 RPC
  console.log(`[GasPrice] Falling back to RPC for chain ${chainId}...`);
  await sleep(100); // 避免请求过于密集

  gasData = await fetchGasPriceFromRPC(chainId);

  if (gasData) {
    console.log(
      `[GasPrice] ✓ RPC: avg=${gasData.averagePrice.toExponential(2)} ETH`
    );
    return gasData;
  }

  console.error(`[GasPrice] ✗ Failed to fetch gas price for chain ${chainId}`);
  return null;
}

/**
 * 批量获取多条链的 Gas 价格
 *
 * @param chainIds - 链 ID 数组
 * @returns Gas 价格数据映射
 */
export async function fetchMultipleGasPrices(
  chainIds: number[]
): Promise<Map<number, GasPriceData>> {
  const results = new Map<number, GasPriceData>();

  const promises = chainIds.map(async (chainId) => {
    const data = await fetchGasPrice(chainId);
    if (data) {
      results.set(chainId, data);
    }
  });

  await Promise.allSettled(promises);
  return results;
}

/**
 * 格式化 Gas 价格显示（Gwei）
 *
 * 虽然 API 返回的是 ETH 单位，但用户界面通常使用 Gwei 显示
 * 因为 ETH 数值太小（如 0.00000003），而 Gwei 更直观（如 30 Gwei）
 *
 * @param ethPrice - ETH 单位的价格
 * @returns Gwei 单位的价格字符串
 */
export function formatGasPriceInGwei(ethPrice: number): string {
  const gweiPrice = ethPrice * 1e9;

  if (gweiPrice >= 100) {
    return `${Math.round(gweiPrice)} Gwei`;
  }
  if (gweiPrice >= 10) {
    return `${gweiPrice.toFixed(1)} Gwei`;
  }
  return `${gweiPrice.toFixed(2)} Gwei`;
}

/**
 * 格式化 Gas 价格显示（原生代币单位）
 * 
 * 对于极小的数值（如 0.00000003），使用科学计数法更易读
 *
 * @param tokenPrice - 原生代币单位的价格
 * @param tokenSymbol - 代币符号（如 'ETH', 'POL', 'BNB'）
 * @returns 格式化后的价格字符串
 */
export function formatGasPrice(tokenPrice: number, tokenSymbol: string): string {
  if (!Number.isFinite(tokenPrice) || tokenPrice <= 0) {
    return 'N/A';
  }

  const abs = Math.abs(tokenPrice);

  // 对于极小的数值（小于 0.000001），使用科学计数法
  if (abs < 1e-6) {
    return `${tokenPrice.toExponential(2)} ${tokenSymbol}`;
  }
  
  // 对于较小的数值，使用固定小数位
  if (abs < 0.0001) return `${tokenPrice.toFixed(8)} ${tokenSymbol}`;
  if (abs < 0.001) return `${tokenPrice.toFixed(7)} ${tokenSymbol}`;
  if (abs < 0.01) return `${tokenPrice.toFixed(6)} ${tokenSymbol}`;
  if (abs < 0.1) return `${tokenPrice.toFixed(5)} ${tokenSymbol}`;
  
  return `${tokenPrice.toFixed(4)} ${tokenSymbol}`;
}
