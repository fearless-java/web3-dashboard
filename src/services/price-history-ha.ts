import type { Asset } from '@/types';
import type { TokenPriceHistory } from './price-history';
import { NATIVE_TOKEN_MAP } from '@/constants/chains';
import { isTestnetChain } from '@/utils/asset-utils';
import { getNetworkConfig } from '@/utils/network';

// ============ 配置 ============
const CONFIG = {
  // 超时配置 - 缩短超时，快速失败
  timeout: {
    defillama: 4000,
    coingecko: 3000,
  },
};

// ============ 数据源 1: DefiLlama ============

type DefiLlamaChartResponse = {
  coins: Record<string, {
    symbol: string;
    prices: { timestamp: number; price: number }[];
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

async function fetchFromDefiLlama(asset: Asset): Promise<TokenPriceHistory | null> {
  const llamaKey = assetToLlamaKey(asset);
  if (!llamaKey) return null;

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

const COINGECKO_ID_MAP: Record<string, string> = {
  'ETH': 'ethereum', 'WETH': 'weth', 'USDC': 'usd-coin', 'USDT': 'tether',
  'DAI': 'dai', 'WBTC': 'wrapped-bitcoin', 'BTC': 'bitcoin', 'LINK': 'chainlink',
  'UNI': 'uniswap', 'AAVE': 'aave', 'MATIC': 'matic-network',
  'POL': 'polygon-ecosystem-token', 'BNB': 'binancecoin', 'AVAX': 'avalanche-2',
  'OP': 'optimism', 'ARB': 'arbitrum', 'BASE': 'base',
  'STETH': 'staked-ether', 'RETH': 'rocket-pool-eth', 'LDO': 'lido-dao',
  'CRV': 'curve-dao-token', 'GMX': 'gmx', 'PEPE': 'pepe',
  '1INCH': '1inch', 'ENJ': 'enjincoin', 'FXS': 'frax-share',
};

async function fetchFromCoinGecko(asset: Asset): Promise<TokenPriceHistory | null> {
  const coinId = COINGECKO_ID_MAP[asset.symbol.toUpperCase()] || asset.symbol.toLowerCase();
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

// ============ 辅助函数 ============

function isAssetSupported(asset: Asset): boolean {
  if (isTestnetChain(asset.chainId)) return false;
  const networkConfig = getNetworkConfig(asset.chainId);
  if (!networkConfig?.defiLlamaKey) return false;
  return true;
}

// ============ 主入口：完全并行获取 ============

/**
 * 获取单个代币历史价格
 */
export async function fetchTokenPriceHistoryHA(
  asset: Asset
): Promise<TokenPriceHistory | null> {
  if (!isAssetSupported(asset)) {
    return null;
  }

  // 先尝试 DefiLlama
  const defillamaResult = await fetchFromDefiLlama(asset);
  if (defillamaResult) {
    return defillamaResult;
  }

  // 失败则尝试 CoinGecko
  return await fetchFromCoinGecko(asset);
}

/**
 * 完全并行批量获取历史价格
 * 策略：所有代币同时发起请求，不等待批次
 */
export async function fetchTokenPriceHistoriesHABatched(
  assets: Asset[],
  _options?: { limit?: number }
): Promise<Record<string, TokenPriceHistory | null>> {
  if (assets.length === 0) {
    return {};
  }

  const supportedAssets = assets.filter(isAssetSupported);
  if (supportedAssets.length === 0) {
    return {};
  }

  console.log(`[fetchTokenPriceHistoriesHABatched] 完全并行获取 ${supportedAssets.length} 个代币历史价格`);

  // 完全并行请求所有代币
  const promises = supportedAssets.map(async (asset) => {
    try {
      const history = await fetchTokenPriceHistoryHA(asset);
      return { uniqueId: asset.uniqueId, history };
    } catch {
      return { uniqueId: asset.uniqueId, history: null };
    }
  });

  const startTime = Date.now();
  const results = await Promise.allSettled(promises);
  const elapsed = Date.now() - startTime;

  const resultMap: Record<string, TokenPriceHistory | null> = {};
  let successCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.history) {
      resultMap[result.value.uniqueId] = result.value.history;
      if (result.value.history !== null) successCount++;
    } else if (result.status === 'fulfilled') {
      resultMap[result.value.uniqueId] = result.value.history;
    }
  }

  console.log(`[fetchTokenPriceHistoriesHABatched] 完成: ${successCount}/${supportedAssets.length} 成功，耗时 ${elapsed}ms`);

  return resultMap;
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
