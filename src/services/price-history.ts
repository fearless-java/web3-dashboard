import type { Asset } from '@/types/assets';
import { LLAMA_CHAIN_MAP, NATIVE_TOKEN_MAP } from '@/constants/chains';
import { isTestnetChain } from '@/utils/asset-utils';

// DefiLlama API 基础URL
const DEFILLAMA_API_BASE = 'https://coins.llama.fi';

// 历史价格缓存时间（6小时）
const HISTORY_CACHE_TTL = 6 * 60 * 60 * 1000;

/**
 * 历史价格数据点
 */
export type PriceHistoryPoint = {
  timestamp: number; // 秒级时间戳
  price: number;
};

/**
 * 代币历史价格数据
 */
export type TokenPriceHistory = {
  symbol: string;
  chainId: number;
  address: string;
  prices: PriceHistoryPoint[];
};

/**
 * DefiLlama 图表 API 响应类型
 * prices 是对象数组: [{timestamp: number, price: number}]
 */
type DefiLlamaChartResponse = {
  coins: Record<string, {
    symbol: string;
    decimals?: number;
    confidence?: number;
    prices: { timestamp: number; price: number }[];
  }>;
};

/**
 * 检查资产是否支持历史价格查询
 * - 测试网不支持
 * - 链必须在 LLAMA_CHAIN_MAP 中
 */
function isAssetSupported(asset: Asset): boolean {
  // 过滤测试网
  if (isTestnetChain(asset.chainId)) {
    return false;
  }
  
  // 检查链是否在映射中
  if (!LLAMA_CHAIN_MAP[asset.chainId]) {
    return false;
  }
  
  return true;
}

/**
 * 将资产转换为DefiLlama查询键
 * 格式: <chain_name>:<token_address>
 */
function assetToLlamaKey(asset: Asset): string | null {
  const chainName = LLAMA_CHAIN_MAP[asset.chainId];
  if (!chainName) {
    return null;
  }

  let address = asset.address.toLowerCase();

  // 如果是原生代币，使用其包装代币地址
  if (asset.isNative) {
    const wrappedAddress = NATIVE_TOKEN_MAP[asset.chainId];
    if (!wrappedAddress) {
      return null;
    }
    address = wrappedAddress.toLowerCase();
  }

  if (!address.startsWith('0x')) {
    address = '0x' + address;
  }

  return `${chainName}:${address}`;
}

/**
 * 获取代币的 7 天历史价格
 * @param asset 资产信息
 * @returns 历史价格数据
 */
export async function fetchTokenPriceHistory(
  asset: Asset
): Promise<TokenPriceHistory | null> {
  // 前置过滤：检查是否支持
  if (!isAssetSupported(asset)) {
    return null;
  }
  
  const llamaKey = assetToLlamaKey(asset);
  if (!llamaKey) {
    console.warn(`[fetchTokenPriceHistory] 不支持的链或代币: ${asset.symbol} on chain ${asset.chainId}`);
    return null;
  }

  // DefiLlama API: 使用 span 参数获取最近 N 天的数据
  // span=7 表示返回 7 个时间点的数据（均匀分布）
  const url = `${DEFILLAMA_API_BASE}/chart/${llamaKey}?span=7`;

  try {
    console.log(`[fetchTokenPriceHistory] 获取 ${asset.symbol} 历史价格: ${llamaKey}`);
    
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // 400 错误可能是该代币在 DefiLlama 上没有数据，静默处理
      if (response.status === 400) {
        console.warn(`[fetchTokenPriceHistory] ${asset.symbol} 在 DefiLlama 上无历史数据 (400)`);
      } else {
        console.error(`[fetchTokenPriceHistory] API 请求失败: ${response.status} ${response.statusText}`);
      }
      return null;
    }

    const data: DefiLlamaChartResponse = await response.json();
    const coinData = data.coins[llamaKey];

    if (!coinData || !coinData.prices || coinData.prices.length === 0) {
      console.warn(`[fetchTokenPriceHistory] 无历史价格数据: ${asset.symbol}`);
      return null;
    }

    // 转换价格数据
    const prices: PriceHistoryPoint[] = coinData.prices.map((point) => ({
      timestamp: Math.floor(point.timestamp / 1000), // 转换为秒
      price: point.price,
    }));

    console.log(`[fetchTokenPriceHistory] 成功获取 ${asset.symbol} 历史价格: ${prices.length} 个点`);

    return {
      symbol: asset.symbol,
      chainId: asset.chainId,
      address: asset.address,
      prices,
    };
  } catch (error) {
    console.error(`[fetchTokenPriceHistory] 获取历史价格失败: ${asset.symbol}`, error);
    return null;
  }
}

/**
 * 批量获取代币历史价格
 * @param assets 资产列表
 * @returns 历史价格映射表 {uniqueId: TokenPriceHistory}
 */
export async function fetchTokenPriceHistories(
  assets: Asset[]
): Promise<Record<string, TokenPriceHistory>> {
  if (assets.length === 0) {
    return {};
  }

  // 过滤掉测试网和不支持的资产
  const supportedAssets = assets.filter(isAssetSupported);
  
  if (supportedAssets.length === 0) {
    console.log(`[fetchTokenPriceHistories] 没有支持的资产可查询`);
    return {};
  }

  console.log(`[fetchTokenPriceHistories] 开始批量获取 ${supportedAssets.length}/${assets.length} 个代币的历史价格`);

  // 为每个资产获取历史价格
  const promises = supportedAssets.map(async (asset) => {
    const history = await fetchTokenPriceHistory(asset);
    return { uniqueId: asset.uniqueId, history };
  });

  const results = await Promise.allSettled(promises);
  
  const histories: Record<string, TokenPriceHistory> = {};
  let successCount = 0;
  let failCount = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.history) {
      histories[result.value.uniqueId] = result.value.history;
      successCount++;
    } else {
      failCount++;
      if (result.status === 'rejected') {
        console.warn(`[fetchTokenPriceHistories] 获取失败: ${supportedAssets[index]?.symbol}`, result.reason);
      }
    }
  });

  console.log(`[fetchTokenPriceHistories] 完成: 成功 ${successCount}, 失败 ${failCount}`);
  
  return histories;
}

/**
 * 提取 7 天趋势的简化数据（用于 Sparkline 图表）
 * 返回 7 个均匀分布的价格点
 * @param history 历史价格数据
 * @returns 7 个价格数字的数组
 */
export function extract7DayTrend(history: TokenPriceHistory | null | undefined): number[] {
  if (!history || !history.prices || history.prices.length === 0) {
    return [];
  }

  const { prices } = history;
  
  // 如果数据点少于 7 个，直接返回所有价格
  if (prices.length <= 7) {
    return prices.map(p => p.price);
  }

  // 选择 7 个均匀分布的点
  const result: number[] = [];
  const step = (prices.length - 1) / 6; // 6 个间隔产生 7 个点

  for (let i = 0; i < 7; i++) {
    const index = Math.round(i * step);
    result.push(prices[index].price);
  }

  return result;
}
