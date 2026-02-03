import { formatUnits } from 'viem';
import type { Asset, ChainQueryResult } from '@/types';

const COVALENT_API_KEY = process.env.NEXT_PUBLIC_COVALENT_API_KEY || '';
const COVALENT_BASE_URL = 'https://api.covalenthq.com/v1';

const CHAIN_ID_TO_COVALENT: Record<number, string> = {
  1: 'eth-mainnet',
  42161: 'arbitrum-mainnet',
  10: 'optimism-mainnet',
  8453: 'base-mainnet',
  137: 'matic-mainnet',
  43114: 'avalanche-mainnet',
  56: 'bsc-mainnet',
  11155111: 'eth-sepolia',
};

interface CovalentTokenItem {
  contract_decimals: number;
  contract_name: string;
  contract_ticker_symbol: string;
  contract_address: string;
  supports_erc: string[] | null;
  logo_url: string;
  logo_urls: {
    token_logo_url: string | null;
    protocol_logo_url: string | null;
    chain_logo_url: string | null;
  };
  last_transferred_at: string | null;
  block_height: number;
  native_token: boolean;
  type: string;
  is_spam: boolean;
  balance: string;
  balance_24h: string | null;
  quote_rate: number | null;
  quote_rate_24h: number | null;
  quote: number | null;
  pretty_quote: string | null;
  quote_24h: number | null;
  pretty_quote_24h: string | null;
  protocol_metadata: any | null;
  nft_data: any | null;
}

interface CovalentBalancesResponse {
  data: {
    address: string;
    updated_at: string;
    next_update_at: string;
    quote_currency: string;
    chain_id: number;
    chain_name: string;
    chain_tip_height: number;
    chain_tip_signed_at: string;
    items: CovalentTokenItem[];
  };
  error: boolean;
  error_message: string | null;
  error_code: number | null;
}

async function fetchChainAssetsFromCovalent(
  chainId: number,
  chainName: string,
  address: string
): Promise<ChainQueryResult> {
  const startTime = Date.now();
  
  try {
    const covalentChain = CHAIN_ID_TO_COVALENT[chainId];
    if (!covalentChain) {
      throw new Error(`不支持的链 ID: ${chainId}`);
    }

    const url = `${COVALENT_BASE_URL}/${covalentChain}/address/${address}/balances_v2/?key=${COVALENT_API_KEY}&quote-currency=USD`;

    console.log(`[Covalent] 查询 ${chainName} (${chainId}) - ${address}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Covalent API 错误 (${response.status}): ${errorText}`);
    }

    const data: CovalentBalancesResponse = await response.json();

    if (data.error) {
      throw new Error(`Covalent API 返回错误: ${data.error_message} (代码: ${data.error_code})`);
    }

    const items = data.data.items;
    const duration = Date.now() - startTime;

    const spamCount = items.filter(i => i.is_spam).length;
    const nonSpamCount = items.length - spamCount;

    console.log(`[Covalent] ${chainName} 成功: ${items.length} 个代币 (${spamCount} 个垃圾, ${nonSpamCount} 个正常), 耗时: ${duration}ms`);

    const validItems = items.filter(item => 
      !item.is_spam &&
      item.balance &&
      BigInt(item.balance) > 0
    );

    const assets: Asset[] = validItems.map(item => {
      const isNative = item.native_token;
      const contractAddress = isNative 
        ? '0x0000000000000000000000000000000000000000'
        : item.contract_address.toLowerCase();

      return {
        uniqueId: `${chainId}-${contractAddress}`,
        chainId: chainId,
        address: contractAddress,
        symbol: item.contract_ticker_symbol || (isNative ? getNativeSymbol(chainId) : 'UNKNOWN'),
        name: item.contract_name || (isNative ? getNativeName(chainId) : 'Unknown Token'),
        decimals: item.contract_decimals || 18,
        balance: item.balance,
        formatted: formatUnits(BigInt(item.balance), item.contract_decimals || 18),
        logo: item.logo_url || getFallbackLogo(chainId, contractAddress),
        isNative: isNative,
        price: item.quote_rate || undefined,
        value: item.quote || undefined,
      };
    });

    return {
      success: true,
      chainId,
      chainName,
      assets,
      meta: {
        source: 'covalent',
        totalTokens: items.length,
        spamTokens: spamCount,
        validTokens: assets.length,
        duration,
        updatedAt: data.data.updated_at,
      }
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[Covalent] ${chainName} 失败 (${duration}ms):`, errorMessage);

    return {
      success: false,
      chainId,
      chainName,
      error: errorMessage,
      assets: [],
    };
  }
}

export async function fetchPortfolioFromCovalent(
  address: string,
  chainIds?: number[]
): Promise<Asset[]> {
  const startTime = Date.now();

  console.log(`[Covalent] 开始获取 Portfolio - 地址: ${address}`);

  const targetChainIds = chainIds || Object.keys(CHAIN_ID_TO_COVALENT).map(Number);
  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    42161: 'Arbitrum',
    10: 'Optimism',
    8453: 'Base',
    137: 'Polygon',
    43114: 'Avalanche',
    56: 'BNB Chain',
    11155111: 'Sepolia',
  };

  const promises = targetChainIds.map(chainId => 
    fetchChainAssetsFromCovalent(chainId, chainNames[chainId] || `Chain-${chainId}`, address)
  );

  const results = await Promise.allSettled(promises);

  const allAssets: Asset[] = [];
  const errors: string[] = [];
  const stats = {
    totalChains: targetChainIds.length,
    successChains: 0,
    failedChains: 0,
    totalTokens: 0,
    spamTokens: 0,
  };

  results.forEach((result, index) => {
    const chainId = targetChainIds[index];
    const chainName = chainNames[chainId] || `Chain-${chainId}`;

    if (result.status === 'fulfilled') {
      const { success, assets, error, meta } = result.value;
      
      if (success) {
        allAssets.push(...assets);
        stats.successChains++;
        stats.totalTokens += meta?.totalTokens || 0;
        stats.spamTokens += meta?.spamTokens || 0;
      } else {
        errors.push(`${chainName}: ${error}`);
        stats.failedChains++;
      }
    } else {
      errors.push(`${chainName}: ${result.reason}`);
      stats.failedChains++;
    }
  });

  const totalDuration = Date.now() - startTime;

  console.log(`[Covalent] Portfolio 获取完成`);
  console.log(`  - 总耗时: ${totalDuration}ms`);
  console.log(`  - 成功链: ${stats.successChains}/${stats.totalChains}`);
  console.log(`  - 总代币: ${stats.totalTokens} (垃圾: ${stats.spamTokens})`);
  console.log(`  - 有效资产: ${allAssets.length}`);

  if (errors.length > 0) {
    console.warn(`[Covalent] 部分链失败:`, errors);
  }

  return allAssets;
}

function getNativeSymbol(chainId: number): string {
  const symbols: Record<number, string> = {
    1: 'ETH',
    42161: 'ETH',
    10: 'ETH',
    8453: 'ETH',
    137: 'POL',
    43114: 'AVAX',
    56: 'BNB',
    11155111: 'ETH',
  };
  return symbols[chainId] || 'ETH';
}

function getNativeName(chainId: number): string {
  const names: Record<number, string> = {
    1: 'Ether',
    42161: 'Ether',
    10: 'Ether',
    8453: 'Ether',
    137: 'Polygon',
    43114: 'Avalanche',
    56: 'BNB',
    11155111: 'Sepolia Ether',
  };
  return names[chainId] || 'Ether';
}

function getFallbackLogo(chainId: number, address: string): string {
  return `https://icons.llamao.fi/icons/tokens/${chainId}/${address.toLowerCase()}`;
}

export async function fetchTransactionsFromCovalent(
  chainId: number,
  address: string,
  options?: {
    page?: number;
    limit?: number;
  }
): Promise<any[]> {
  const covalentChain = CHAIN_ID_TO_COVALENT[chainId];
  if (!covalentChain) {
    throw new Error(`不支持的链 ID: ${chainId}`);
  }

  const page = options?.page || 0;
  const limit = options?.limit || 100;

  const url = `${COVALENT_BASE_URL}/${covalentChain}/address/${address}/transactions_v2/?key=${COVALENT_API_KEY}&page-number=${page}&page-size=${limit}`;

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Covalent Transactions API 错误: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_message || 'Covalent API 错误');
  }

  return data.data.items || [];
}

export async function fetchMultiChainTransactions(
  address: string,
  chainIds: number[],
  options?: { limit?: number }
): Promise<Record<number, any[]>> {
  const results: Record<number, any[]> = {};

  await Promise.all(
    chainIds.map(async (chainId) => {
      try {
        const txs = await fetchTransactionsFromCovalent(chainId, address, options);
        results[chainId] = txs;
      } catch (error) {
        console.error(`[Covalent] 获取链 ${chainId} 交易失败:`, error);
        results[chainId] = [];
      }
    })
  );

  return results;
}
