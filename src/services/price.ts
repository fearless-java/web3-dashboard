import type { Asset } from '@/types/assets';
import { LLAMA_CHAIN_MAP, NATIVE_TOKEN_MAP } from '@/config/dashboard.config';
import type { Currency } from '@/stores/currency-store';

// DefiLlama API 基础URL
const DEFILLAMA_API_BASE = 'https://coins.llama.fi';

// DefiLlama API 响应类型定义
type DefiLlamaPriceResponse = {
  coins: Record<string, { price: number; symbol: string; timestamp: number }>;
};

/**
 * 将资产转换为DefiLlama查询键
 * 格式: <chain_name>:<token_address>
 * 例如: ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
 */
function assetToLlamaKey(asset: Asset): string | null {
  const chainName = LLAMA_CHAIN_MAP[asset.chainId];
  if (!chainName) {
    return null; // 不支持的链
  }

  let address = asset.address.toLowerCase();

  // 如果是原生代币（如ETH），使用其包装代币地址（如WETH）
  if (asset.isNative) {
    const wrappedAddress = NATIVE_TOKEN_MAP[asset.chainId];
    if (!wrappedAddress) {
      return null; // 没有找到包装代币地址
    }
    address = wrappedAddress.toLowerCase();
  }

  // 确保地址以0x开头
  if (!address.startsWith('0x')) {
    address = '0x' + address;
  }

  return `${chainName}:${address}`;
}

/**
 * 将数组分块，用于批量API请求
 * @param array 原始数组
 * @param chunkSize 每块大小
 * @returns 分块后的二维数组
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 批量获取代币价格
 * @param llamaKeys DefiLlama查询键数组
 * @returns 价格映射表 {llamaKey: price}
 */
async function fetchTokenPricesBatch(
  llamaKeys: string[]
): Promise<Record<string, number>> {
  const batchStartTime = Date.now();
  
  if (llamaKeys.length === 0) {
    return {};
  }

  const keysString = llamaKeys.join(',');
  const url = `${DEFILLAMA_API_BASE}/prices/current/${keysString}`;
  
  console.log(`[fetchTokenPricesBatch] 开始请求 DefiLlama API - 键数量: ${llamaKeys.length}, URL长度: ${url.length}`);

  try {
    const requestStartTime = Date.now();
    const response = await fetch(url, { cache: 'no-store' });
    const requestDuration = Date.now() - requestStartTime;
    
    if (!response.ok) {
      console.error(`[fetchTokenPricesBatch] API 请求失败 - 状态: ${response.status}, 耗时: ${requestDuration}ms`);
      throw new Error(`DefiLlama API 请求失败: ${response.status} ${response.statusText}`);
    }

    const parseStartTime = Date.now();
    const data: DefiLlamaPriceResponse = await response.json();
    const parseDuration = Date.now() - parseStartTime;
    
    const prices: Record<string, number> = {};

    // 提取价格数据
    Object.entries(data.coins).forEach(([key, coin]) => {
      prices[key] = coin.price;
    });

    const totalDuration = Date.now() - batchStartTime;
    console.log(`[fetchTokenPricesBatch] 请求成功 - 耗时: ${totalDuration}ms (请求: ${requestDuration}ms, 解析: ${parseDuration}ms), 获取到 ${Object.keys(prices).length} 个价格`);

    return prices;
  } catch (error) {
    const totalDuration = Date.now() - batchStartTime;
    console.error(`[fetchTokenPricesBatch] 请求失败 - 耗时: ${totalDuration}ms`, error);
    throw error;
  }
}

async function getExchangeRate(targetCurrency: Currency): Promise<number> {
  
  if (targetCurrency === 'USD') {
    return 1;
  }

  try {

    const exchangeRates: Record<Currency, number> = {
      USD: 1,
      CNY: 7.2, 
      EUR: 0.92,
      JPY: 150,
      GBP: 0.79,
    };

    return exchangeRates[targetCurrency] || 1;
  } catch (error) {
    console.error('获取汇率失败:', error);
    return 1; 
  }
}

export async function fetchTokenPrices(
  assets: Asset[],
  currency: Currency = 'USD'
): Promise<Record<string, number>> {
  const functionStartTime = Date.now();
  console.log(`[fetchTokenPrices] 开始处理 - 资产数量: ${assets.length}, 法币: ${currency}`);

  if (assets.length === 0) {
    console.log(`[fetchTokenPrices] 资产列表为空，直接返回`);
    return {};
  }

  const assetToKeyMap = new Map<string, string>(); 
  const keyToAssetsMap = new Map<string, Asset[]>(); 

  assets.forEach((asset) => {
    const llamaKey = assetToLlamaKey(asset);
    if (llamaKey) {
      assetToKeyMap.set(asset.uniqueId, llamaKey);
      
      if (!keyToAssetsMap.has(llamaKey)) {
        keyToAssetsMap.set(llamaKey, []);
      }
      keyToAssetsMap.get(llamaKey)!.push(asset);
    }
  });

  const uniqueKeys = Array.from(keyToAssetsMap.keys());
  console.log(`[fetchTokenPrices] 转换完成 - 唯一查询键数量: ${uniqueKeys.length}`);

  if (uniqueKeys.length === 0) {
    console.log(`[fetchTokenPrices] 没有有效的查询键，返回空结果`);
    return {};
  }

  const MAX_BATCH_SIZE = 60;
  const chunks = chunkArray(uniqueKeys, MAX_BATCH_SIZE);
  console.log(`[fetchTokenPrices] 分片处理 - 总键数: ${uniqueKeys.length}, 分片数: ${chunks.length}, 每片最多: ${MAX_BATCH_SIZE}`);

  const batchStartTime = Date.now();
  const pricePromises = chunks.map((chunk, index) => {
    console.log(`[fetchTokenPrices] 启动分片 ${index + 1}/${chunks.length} - 键数量: ${chunk.length}`);
    return fetchTokenPricesBatch(chunk);
  });
  const priceResults = await Promise.allSettled(pricePromises);
  const batchDuration = Date.now() - batchStartTime;
  console.log(`[fetchTokenPrices] 所有分片查询完成 - 耗时: ${batchDuration}ms`);

  const allPrices: Record<string, number> = {};
  let successCount = 0;
  let failCount = 0;
  priceResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const priceCount = Object.keys(result.value).length;
      console.log(`[fetchTokenPrices] 分片 ${index + 1} 成功 - 获取到 ${priceCount} 个价格`);
      Object.assign(allPrices, result.value);
      successCount++;
    } else {
      console.warn(`[fetchTokenPrices] 分片 ${index + 1} 失败:`, result.reason);
      failCount++;
    }
  });
  console.log(`[fetchTokenPrices] 分片结果汇总 - 成功: ${successCount}, 失败: ${failCount}, 总价格数: ${Object.keys(allPrices).length}`);

  const exchangeRate = await getExchangeRate(currency);
  console.log(`[fetchTokenPrices] 汇率获取 - 法币: ${currency}, 汇率: ${exchangeRate}`);

  const assetPrices: Record<string, number> = {};
  assets.forEach((asset) => {
    const llamaKey = assetToKeyMap.get(asset.uniqueId);
    if (llamaKey && allPrices[llamaKey]) {
      
      assetPrices[asset.uniqueId] = allPrices[llamaKey] * exchangeRate;
    }
  });

  const totalDuration = Date.now() - functionStartTime;
  console.log(`[fetchTokenPrices] 处理完成 - 总耗时: ${totalDuration}ms, 最终价格数量: ${Object.keys(assetPrices).length}`);

  return assetPrices;
}
