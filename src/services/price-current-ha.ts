import type { Asset } from '@/types';
import type { TokenPrice, PriceFetchState } from '@/types/price';
import { NATIVE_TOKEN_MAP } from '@/constants/chains';
import { isTestnetChain } from '@/utils/asset-utils';
import { getNetworkConfig } from '@/utils/network';

export type { TokenPrice, PriceFetchState };

// ============ 配置 ============
const CONFIG = {
  // 并发控制：同时请求的代币数量（提高到100，DefiLlama 支持大批量）
  batchSize: 100,
  // 批次间延迟（ms）- 设为0，无延迟批量请求
  batchDelay: 0,
  // 缓存时间：5分钟
  cacheDurationMs: 5 * 60 * 1000,
  // 重试配置
  retry: {
    maxRetries: 2,
    initialDelay: 300,
    backoffMultiplier: 2,
  },
  timeout: {
    defillama: 5000,
    coingecko: 4000,
  },
};

// ============ 内存缓存 ============
const priceCache = new Map<string, { price: number; timestamp: number }>();

function isCacheValid(cached: { price: number; timestamp: number }): boolean {
  return Date.now() - cached.timestamp < CONFIG.cacheDurationMs;
}

function getFromCache(asset: Asset): { price: number; source: 'cache' } | null {
  const cached = priceCache.get(asset.uniqueId);
  if (cached && isCacheValid(cached)) {
    return { price: cached.price, source: 'cache' };
  }
  return null;
}

function setCache(asset: Asset, price: number): void {
  priceCache.set(asset.uniqueId, { price, timestamp: Date.now() });
}

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
  const networkConfig = getNetworkConfig(asset.chainId);
  const chainName = networkConfig?.defiLlamaKey;
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

/**
 * 并行批量获取 DefiLlama 价格
 */
async function fetchFromDefiLlamaBatchParallel(
  assets: Asset[]
): Promise<Record<string, number>> {
  if (assets.length === 0) return {};

  // 构建请求
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

// ============ 数据源 2: CoinGecko (备选) ============

const COINGECKO_ID_MAP: Record<string, string> = {
  'ETH': 'ethereum', 'WETH': 'weth', 'USDC': 'usd-coin', 'USDT': 'tether',
  'DAI': 'dai', 'WBTC': 'wrapped-bitcoin', 'BTC': 'bitcoin', 'LINK': 'chainlink',
  'UNI': 'uniswap', 'AAVE': 'aave', 'CRV': 'curve-dao-token', 'MATIC': 'matic-network',
  'POL': 'polygon-ecosystem-token', 'BNB': 'binancecoin', 'AVAX': 'avalanche-2',
  'OP': 'optimism', 'ARB': 'arbitrum', 'BASE': 'base', 'SOL': 'solana',
  'STETH': 'staked-ether', 'CBETH': 'coinbase-wrapped-staked-eth', 'RETH': 'rocket-pool-eth',
  'FXS': 'frax-share', 'FRAX': 'frax', 'LDO': 'lido-dao', 'GMX': 'gmx',
  'PEPE': 'pepe', 'SHIB': 'shiba-inu', 'WOO': 'wootrade', '1INCH': '1inch',
};

async function fetchFromCoinGeckoBatch(assets: Asset[]): Promise<Record<string, number>> {
  if (assets.length === 0) return {};

  const prices: Record<string, number> = {};
  const coinIdMap = new Map<string, string>();

  assets.forEach(asset => {
    const coinId = COINGECKO_ID_MAP[asset.symbol.toUpperCase()] || asset.symbol.toLowerCase();
    coinIdMap.set(asset.uniqueId, coinId);
  });

  // CoinGecko simple price API 支持多个 ids
  const ids = Array.from(new Set(coinIdMap.values())).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

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
        console.warn('[CoinGecko] Rate limit exceeded');
      }
      return {};
    }

    const data = await response.json();

    assets.forEach(asset => {
      const coinId = coinIdMap.get(asset.uniqueId);
      if (coinId && data[coinId]?.usd) {
        prices[asset.uniqueId] = data[coinId].usd;
      }
    });

    return prices;
  } catch {
    clearTimeout(timeoutId);
    return {};
  }
}

// ============ 辅助函数 ============

function isAssetSupported(asset: Asset): boolean {
  if (isTestnetChain(asset.chainId)) return false;
  const networkConfig = getNetworkConfig(asset.chainId);
  if (!networkConfig?.defiLlamaKey) return false;
  return true;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ 重试逻辑 ============

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = CONFIG.retry.maxRetries
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fn();
      if (result !== null && typeof result !== 'undefined') {
        return result;
      }
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
    }

    if (attempt < maxRetries - 1) {
      const delay = CONFIG.retry.initialDelay * Math.pow(CONFIG.retry.backoffMultiplier, attempt);
      await sleep(delay);
    }
  }
  return null;
}

// ============ 主入口：并行批量获取 ============

/**
 * 并行批量获取所有代币当前价格
 * 策略：
 * 1. 过滤测试网和不支持的资产
 * 2. 检查缓存
 * 3. 分批并行请求 DefiLlama
 * 4. 失败的代币后台重试
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

  console.log(`[fetchCurrentPricesBatch] 开始并行获取 ${assets.length} 个代币价格`);

  // 1. 过滤支持的资产
  const supportedAssets = assets.filter(isAssetSupported);
  if (supportedAssets.length === 0) {
    return { prices: {}, failedAssets: assets.filter(a => !isAssetSupported(a)) };
  }

  const prices: Record<string, TokenPrice> = {};
  const assetsToFetch: Asset[] = [];

  // 2. 检查缓存
  for (const asset of supportedAssets) {
    const cached = getFromCache(asset);
    if (cached) {
      prices[asset.uniqueId] = {
        uniqueId: asset.uniqueId,
        symbol: asset.symbol,
        price: cached.price,
        timestamp: Date.now(),
        source: cached.source,
      };
    } else {
      assetsToFetch.push(asset);
    }
  }

  console.log(`[fetchCurrentPricesBatch] 缓存命中: ${Object.keys(prices).length}, 需要获取: ${assetsToFetch.length}`);

  if (assetsToFetch.length === 0) {
    return { prices, failedAssets: [] };
  }

  // 3. 分批并行请求 DefiLlama
  const batches = chunkArray(assetsToFetch, CONFIG.batchSize);
  let batchPrices: Record<string, number> = {};

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`[fetchCurrentPricesBatch] 处理批次 ${i + 1}/${batches.length} (${batch.length} 个代币)`);

    try {
      const batchResult = await retryWithBackoff(
        () => fetchFromDefiLlamaBatchParallel(batch),
        1
      );
      if (batchResult) {
        batchPrices = { ...batchPrices, ...batchResult };
      }
    } catch (error) {
      console.warn(`[fetchCurrentPricesBatch] 批次 ${i + 1} 失败:`, error);
    }

    // 批次间延迟
    if (i < batches.length - 1) {
      await sleep(CONFIG.batchDelay);
    }
  }

  // 4. 处理结果
  const failedAssets: Asset[] = [];

  for (const asset of assetsToFetch) {
    const price = batchPrices[asset.uniqueId];
    if (price) {
      prices[asset.uniqueId] = {
        uniqueId: asset.uniqueId,
        symbol: asset.symbol,
        price,
        timestamp: Date.now(),
        source: 'defillama',
      };
      setCache(asset, price);
    } else {
      failedAssets.push(asset);
    }
  }

  console.log(`[fetchCurrentPricesBatch] 完成: 成功 ${Object.keys(prices).length}, 失败 ${failedAssets.length}`);
  return { prices, failedAssets };
}

/**
 * 后台重试失败的代币价格
 */
export async function retryFailedPrices(
  failedAssets: Asset[],
  onSuccess: (uniqueId: string, price: TokenPrice) => void
): Promise<void> {
  if (failedAssets.length === 0) return;

  console.log(`[retryFailedPrices] 后台重试 ${failedAssets.length} 个失败代币`);

  // 并行重试所有失败资产（不分批，无延迟）
  try {
    const cgPrices = await fetchFromCoinGeckoBatch(failedAssets);

    for (const asset of failedAssets) {
      const price = cgPrices[asset.uniqueId];
      if (price) {
        console.log(`[retryFailedPrices] ${asset.symbol} 从 CoinGecko 获取成功`);
        onSuccess(asset.uniqueId, {
          uniqueId: asset.uniqueId,
          symbol: asset.symbol,
          price,
          timestamp: Date.now(),
          source: 'coingecko',
        });
        setCache(asset, price);
      }
    }
  } catch (error) {
    console.warn('[retryFailedPrices] CoinGecko 批次失败:', error);
  }
}

/**
 * 高可用：获取所有代币当前价格
 */
export async function fetchCurrentPricesHA(
  assets: Asset[],
  _onProgress?: (prices: Record<string, TokenPrice>) => void
): Promise<{
  initialPrices: Record<string, TokenPrice>;
  failedAssets: Asset[];
  startBackgroundRetry: () => Promise<void>;
}> {
  const { prices, failedAssets } = await fetchCurrentPricesBatch(assets);

  const startBackgroundRetry = async () => {
    await retryFailedPrices(failedAssets, (uniqueId, price) => {
      prices[uniqueId] = price;
    });
  };

  return {
    initialPrices: prices,
    failedAssets,
    startBackgroundRetry,
  };
}
