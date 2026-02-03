import type { Asset } from '@/types/assets';
import type { TokenPriceHistory, PriceHistoryPoint } from './price-history';
import { LLAMA_CHAIN_MAP, NATIVE_TOKEN_MAP } from '@/constants/chains';
import { isTestnetChain } from '@/utils/asset-utils';

// ============ 配置 ============
const CONFIG = {
  // 重试配置
  retry: {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  },
  // 超时配置
  timeout: {
    defillama: 10000,
    coingecko: 8000,
  },
};

// ============ 数据源 1: DefiLlama ============

/**
 * DefiLlama 图表 API 响应类型
 */
type DefiLlamaChartResponse = {
  coins: Record<string, {
    symbol: string;
    decimals?: number;
    confidence?: number;
    prices: { timestamp: number; price: number }[];
  }>;
};

async function fetchFromDefiLlama(asset: Asset): Promise<TokenPriceHistory | null> {
  const chainName = LLAMA_CHAIN_MAP[asset.chainId];
  if (!chainName) return null;

  let address = asset.address.toLowerCase();
  if (asset.isNative) {
    const wrappedAddress = NATIVE_TOKEN_MAP[asset.chainId];
    if (!wrappedAddress) return null;
    address = wrappedAddress.toLowerCase();
  }
  if (!address.startsWith('0x')) {
    address = '0x' + address;
  }

  const llamaKey = `${chainName}:${address}`;
  const url = `https://coins.llama.fi/chart/${llamaKey}?span=7`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout.defillama);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data: DefiLlamaChartResponse = await response.json();
    const coinData = data.coins[llamaKey];

    if (!coinData?.prices?.length) return null;

    return {
      symbol: asset.symbol,
      chainId: asset.chainId,
      address: asset.address,
      prices: coinData.prices.map(p => ({
        timestamp: Math.floor(p.timestamp / 1000),
        price: p.price,
      })),
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// ============ 数据源 2: CoinGecko (备选) ============

/**
 * CoinGecko 平台映射
 */
const COINGECKO_PLATFORM_MAP: Record<number, string> = {
  1: 'ethereum',
  56: 'binance-smart-chain',
  137: 'polygon-pos',
  10: 'optimistic-ethereum',
  42161: 'arbitrum-one',
  8453: 'base',
  43114: 'avalanche',
};

/**
 * 常见代币的 CoinGecko ID 映射
 */
const COINGECKO_ID_MAP: Record<string, string> = {
  'ETH': 'ethereum',
  'WETH': 'weth',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'WBTC': 'wrapped-bitcoin',
  'BTC': 'bitcoin',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'CRV': 'curve-dao-token',
  'MATIC': 'matic-network',
  'POL': 'polygon-ecosystem-token',
  'BNB': 'binancecoin',
  'AVAX': 'avalanche-2',
  'OP': 'optimism',
  'ARB': 'arbitrum',
};

async function fetchFromCoinGecko(asset: Asset): Promise<TokenPriceHistory | null> {
  // 1. 获取 CoinGecko ID
  let coinId = COINGECKO_ID_MAP[asset.symbol.toUpperCase()];
  
  // 2. 如果映射中没有，尝试使用 symbol 小写
  if (!coinId) {
    coinId = asset.symbol.toLowerCase();
  }

  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout.coingecko);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // 429 = 速率限制
      if (response.status === 429) {
        console.warn(`[CoinGecko] 速率限制: ${asset.symbol}`);
      }
      return null;
    }

    const data = await response.json();
    const prices: [number, number][] = data.prices;

    if (!prices?.length) return null;

    return {
      symbol: asset.symbol,
      chainId: asset.chainId,
      address: asset.address,
      prices: prices.map(([timestamp, price]) => ({
        timestamp: Math.floor(timestamp / 1000),
        price,
      })),
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// ============ 带重试的获取 ============

async function fetchWithRetry<T>(
  fn: () => Promise<T | null>,
  name: string,
  maxRetries: number = CONFIG.retry.maxRetries
): Promise<T | null> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result !== null) {
        if (attempt > 0) {
          console.log(`[${name}] 第 ${attempt + 1} 次尝试成功`);
        }
        return result;
      }
      // 返回 null 但不是错误，继续重试
      console.warn(`[${name}] 第 ${attempt + 1} 次尝试返回空数据`);
    } catch (error) {
      lastError = error;
      console.warn(`[${name}] 第 ${attempt + 1} 次尝试失败:`, error);
    }

    // 计算延迟（指数退避）
    if (attempt < maxRetries - 1) {
      const delay = CONFIG.retry.delayMs * Math.pow(CONFIG.retry.backoffMultiplier, attempt);
      console.log(`[${name}] ${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(`[${name}] 所有 ${maxRetries} 次尝试均失败`);
  return null;
}

// ============ 主入口 ============

/**
 * 检查资产是否支持历史价格查询
 */
function isAssetSupported(asset: Asset): boolean {
  if (isTestnetChain(asset.chainId)) return false;
  if (!LLAMA_CHAIN_MAP[asset.chainId]) return false;
  return true;
}

/**
 * 高可用：获取代币 7 天历史价格
 * 策略：
 * 1. 首先尝试 DefiLlama（带 3 次重试）
 * 2. 如果失败，尝试 CoinGecko（带 2 次重试）
 * 3. 如果都失败，返回 null
 */
export async function fetchTokenPriceHistoryHA(
  asset: Asset
): Promise<TokenPriceHistory | null> {
  // 前置过滤
  if (!isAssetSupported(asset)) {
    return null;
  }

  console.log(`[fetchTokenPriceHistoryHA] 开始获取 ${asset.symbol} 历史价格`);

  // 数据源 1: DefiLlama (主要)
  const defillamaResult = await fetchWithRetry(
    () => fetchFromDefiLlama(asset),
    `DefiLlama-${asset.symbol}`,
    3
  );

  if (defillamaResult) {
    console.log(`[fetchTokenPriceHistoryHA] ${asset.symbol} 从 DefiLlama 获取成功`);
    return defillamaResult;
  }

  // 数据源 2: CoinGecko (备选)
  console.log(`[fetchTokenPriceHistoryHA] ${asset.symbol} DefiLlama 失败，尝试 CoinGecko...`);
  const coingeckoResult = await fetchWithRetry(
    () => fetchFromCoinGecko(asset),
    `CoinGecko-${asset.symbol}`,
    2
  );

  if (coingeckoResult) {
    console.log(`[fetchTokenPriceHistoryHA] ${asset.symbol} 从 CoinGecko 获取成功`);
    return coingeckoResult;
  }

  console.error(`[fetchTokenPriceHistoryHA] ${asset.symbol} 所有数据源均失败`);
  return null;
}

/**
 * 批量获取（使用 HA 版本）
 */
export async function fetchTokenPriceHistoriesHA(
  assets: Asset[]
): Promise<Record<string, TokenPriceHistory>> {
  if (assets.length === 0) {
    return {};
  }

  const supportedAssets = assets.filter(isAssetSupported);
  if (supportedAssets.length === 0) {
    return {};
  }

  console.log(`[fetchTokenPriceHistoriesHA] 批量获取 ${supportedAssets.length} 个代币`);

  // 串行获取避免触发速率限制
  const histories: Record<string, TokenPriceHistory> = {};
  let successCount = 0;
  let failCount = 0;

  for (const asset of supportedAssets) {
    const history = await fetchTokenPriceHistoryHA(asset);
    if (history) {
      histories[asset.uniqueId] = history;
      successCount++;
    } else {
      failCount++;
    }
    // 添加小延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[fetchTokenPriceHistoriesHA] 完成: 成功 ${successCount}, 失败 ${failCount}`);
  return histories;
}

// ============ 辅助函数 ============

/**
 * 提取 7 天趋势的简化数据
 */
export function extract7DayTrend(history: TokenPriceHistory | null | undefined): number[] {
  if (!history?.prices?.length) return [];

  const { prices } = history;
  if (prices.length <= 7) {
    return prices.map(p => p.price);
  }

  const result: number[] = [];
  const step = (prices.length - 1) / 6;

  for (let i = 0; i < 7; i++) {
    const index = Math.round(i * step);
    result.push(prices[index].price);
  }

  return result;
}

/**
 * 计算7天价格变化百分比
 */
export function calculatePriceChange7d(history: TokenPriceHistory | null | undefined): number {
  if (!history?.prices?.length || history.prices.length < 2) {
    return 0;
  }
  const firstPrice = history.prices[0].price;
  const lastPrice = history.prices[history.prices.length - 1].price;
  if (firstPrice === 0) return 0;
  return ((lastPrice - firstPrice) / firstPrice) * 100;
}
