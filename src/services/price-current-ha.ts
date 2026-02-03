import type { Asset } from '@/types/assets';
import { LLAMA_CHAIN_MAP, NATIVE_TOKEN_MAP } from '@/constants/chains';
import { isTestnetChain } from '@/utils/asset-utils';

// ============ 配置 ============
const CONFIG = {
  retry: {
    maxRetries: 3,
    initialDelay: 300,
    backoffMultiplier: 2,
  },
  timeout: {
    defillama: 8000,
    coingecko: 6000,
  },
  // 批量请求分片大小
  batchSize: 50,
};

// ============ 类型 ============

export type TokenPrice = {
  uniqueId: string;
  symbol: string;
  price: number;
  timestamp: number;
  source: 'defillama' | 'coingecko' | 'cache';
};

export type PriceFetchState = 
  | { status: 'loading'; price?: undefined }
  | { status: 'success'; price: number; source: string }
  | { status: 'failed'; price?: undefined };

// ============ 数据源 1: DefiLlama ============

type DefiLlamaPriceResponse = {
  coins: Record<string, {
    price: number;
    symbol: string;
    timestamp: number;
    confidence?: number;
  }>;
};

function assetToLlamaKey(asset: Asset): string | null {
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
  return `${chainName}:${address}`;
}

async function fetchFromDefiLlamaBatch(assets: Asset[]): Promise<Record<string, number>> {
  if (assets.length === 0) return {};

  const assetToKeyMap = new Map<string, string>();
  const keys: string[] = [];

  assets.forEach(asset => {
    const key = assetToLlamaKey(asset);
    if (key) {
      assetToKeyMap.set(asset.uniqueId, key);
      keys.push(key);
    }
  });

  if (keys.length === 0) return {};

  const url = `https://coins.llama.fi/prices/current/${keys.join(',')}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout.defillama);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DefiLlama API error: ${response.status}`);
    }

    const data: DefiLlamaPriceResponse = await response.json();
    const prices: Record<string, number> = {};

    assets.forEach(asset => {
      const key = assetToKeyMap.get(asset.uniqueId);
      if (key && data.coins[key]) {
        prices[asset.uniqueId] = data.coins[key].price;
      }
    });

    return prices;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchFromDefiLlamaSingle(asset: Asset): Promise<number | null> {
  const result = await fetchFromDefiLlamaBatch([asset]);
  return result[asset.uniqueId] ?? null;
}

// ============ 数据源 2: CoinGecko (备选) ============

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
  'BASE': 'base',
  'SOL': 'solana',
};

async function fetchFromCoinGecko(asset: Asset): Promise<number | null> {
  const coinId = COINGECKO_ID_MAP[asset.symbol.toUpperCase()] || asset.symbol.toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout.coingecko);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`[CoinGecko] 速率限制: ${asset.symbol}`);
      }
      return null;
    }

    const data = await response.json();
    return data[coinId]?.usd ?? null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

// ============ 辅助函数 ============

function isAssetSupported(asset: Asset): boolean {
  if (isTestnetChain(asset.chainId)) return false;
  if (!LLAMA_CHAIN_MAP[asset.chainId]) return false;
  return true;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ 重试逻辑 ============

async function retryWithBackoff<T>(
  fn: () => Promise<T | null>,
  name: string,
  maxRetries: number = CONFIG.retry.maxRetries
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result !== null) {
        if (attempt > 0) {
          console.log(`[${name}] 第 ${attempt + 1} 次重试成功`);
        }
        return result;
      }
    } catch (error) {
      console.warn(`[${name}] 第 ${attempt + 1} 次尝试失败`);
    }

    if (attempt < maxRetries - 1) {
      const delay = CONFIG.retry.initialDelay * Math.pow(CONFIG.retry.backoffMultiplier, attempt);
      await sleep(delay);
    }
  }

  return null;
}

// ============ 主入口 ============

/**
 * 批量获取当前价格（第一阶段：快速批量）
 * 返回：成功价格 + 失败资产列表
 */
export async function fetchCurrentPricesBatch(
  assets: Asset[]
): Promise<{
  prices: Record<string, TokenPrice>;
  failedAssets: Asset[];
}> {
  if (assets.length === 0) {
    return { prices: {}, failedAssets: [] };
  }

  const supportedAssets = assets.filter(isAssetSupported);
  console.log(`[fetchCurrentPricesBatch] 批量获取 ${supportedAssets.length}/${assets.length} 个代币价格`);

  const prices: Record<string, TokenPrice> = {};
  const failedAssets: Asset[] = [];

  // 分片批量获取
  const chunks = chunkArray(supportedAssets, CONFIG.batchSize);

  for (const chunk of chunks) {
    try {
      const batchPrices = await fetchFromDefiLlamaBatch(chunk);

      chunk.forEach(asset => {
        const price = batchPrices[asset.uniqueId];
        if (price !== undefined) {
          prices[asset.uniqueId] = {
            uniqueId: asset.uniqueId,
            symbol: asset.symbol,
            price,
            timestamp: Date.now(),
            source: 'defillama',
          };
        } else {
          failedAssets.push(asset);
        }
      });
    } catch (error) {
      console.error(`[fetchCurrentPricesBatch] 分片获取失败`, error);
      // 整个分片失败，全部加入失败列表
      chunk.forEach(asset => failedAssets.push(asset));
    }

    // 分片间小延迟
    await sleep(50);
  }

  console.log(`[fetchCurrentPricesBatch] 完成: 成功 ${Object.keys(prices).length}, 失败 ${failedAssets.length}`);
  return { prices, failedAssets };
}

/**
 * 单独重试失败代币（后台第二阶段）
 */
export async function retryFailedPrices(
  failedAssets: Asset[],
  onSuccess: (uniqueId: string, price: TokenPrice) => void
): Promise<void> {
  if (failedAssets.length === 0) return;

  console.log(`[retryFailedPrices] 后台重试 ${failedAssets.length} 个失败代币`);

  for (const asset of failedAssets) {
    let price: number | null = null;
    let source: 'defillama' | 'coingecko' = 'defillama';

    // 1. 重试 DefiLlama
    price = await retryWithBackoff(
      () => fetchFromDefiLlamaSingle(asset),
      `DefiLlama-${asset.symbol}`,
      CONFIG.retry.maxRetries
    );

    // 2. 失败则尝试 CoinGecko
    if (price === null) {
      source = 'coingecko';
      price = await retryWithBackoff(
        () => fetchFromCoinGecko(asset),
        `CoinGecko-${asset.symbol}`,
        2
      );
    }

    // 3. 成功则回调更新
    if (price !== null) {
      console.log(`[retryFailedPrices] ${asset.symbol} 重试成功 (${source})`);
      onSuccess(asset.uniqueId, {
        uniqueId: asset.uniqueId,
        symbol: asset.symbol,
        price,
        timestamp: Date.now(),
        source,
      });
    } else {
      console.log(`[retryFailedPrices] ${asset.symbol} 重试${CONFIG.retry.maxRetries}次后仍失败`);
    }

    // 每个代币间隔
    await sleep(100);
  }
}

/**
 * 高可用：获取所有代币当前价格
 * 策略：批量获取 → 立即返回 → 后台重试失败
 */
export async function fetchCurrentPricesHA(
  assets: Asset[],
  onProgress?: (prices: Record<string, TokenPrice>) => void
): Promise<{
  initialPrices: Record<string, TokenPrice>;
  failedAssets: Asset[];
  startBackgroundRetry: () => Promise<void>;
}> {
  // 第一阶段：批量获取
  const { prices, failedAssets } = await fetchCurrentPricesBatch(assets);

  // 第二阶段：后台重试（返回函数，由调用方决定何时开始）
  const startBackgroundRetry = async () => {
    await retryFailedPrices(failedAssets, (uniqueId, price) => {
      prices[uniqueId] = price;
      onProgress?.(prices);
    });
  };

  return {
    initialPrices: prices,
    failedAssets,
    startBackgroundRetry,
  };
}
