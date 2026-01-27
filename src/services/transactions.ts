import { isAddress, formatUnits, fromHex, parseUnits } from 'viem';
import { Alchemy, AssetTransfersCategory, TokenBalanceType } from 'alchemy-sdk';
import {
  dashboardConfig,
  getAlchemyNetworkEnum,
  getNetworkIconUrl,
} from '@/config/dashboard.config';
import type {
  Transaction,
  ChainTransactionResult,
  FetchTransactionsParams,
  TransactionsResult,
  TransactionType,
  AssetTransferCategory,
} from '@/types/transactions';

async function getVerifiedTokenAddresses(
  chainId: number,
  address: string
): Promise<{
  verifiedAddresses: Set<string>;
  tokenMetadataMap: Map<string, { logo?: string; symbol?: string; name?: string }>;
}> {
  try {
    const settings = {
      apiKey: dashboardConfig.alchemyApiKey,
      network: getAlchemyNetworkEnum(chainId),
    };
    const alchemy = new Alchemy(settings);

    const tokenBalancesResponse = await alchemy.core.getTokenBalances(address, {
      type: TokenBalanceType.DEFAULT_TOKENS,
    });

    const activeTokens = tokenBalancesResponse.tokenBalances.filter((token) => {
      return (
        token.tokenBalance &&
        token.tokenBalance !== '0x' &&
        BigInt(token.tokenBalance) > 0
      );
    });

    const tokenMetadataPromises = activeTokens.map((token) =>
      alchemy.core.getTokenMetadata(token.contractAddress)
    );
    const tokensMetadata = await Promise.all(tokenMetadataPromises);

    const verifiedAddresses = new Set<string>();
    const tokenMetadataMap = new Map<string, { logo?: string; symbol?: string; name?: string }>();

    activeTokens.forEach((token, index) => {
      const tokenAddress = token.contractAddress.toLowerCase();
      verifiedAddresses.add(tokenAddress);

      const meta = tokensMetadata[index];

      tokenMetadataMap.set(tokenAddress, {
        logo: meta.logo || undefined,
        symbol: meta.symbol || undefined,
        name: meta.name || undefined,
      });
    });

    return { verifiedAddresses, tokenMetadataMap };
  } catch (error) {
    
    console.warn(`[getVerifiedTokenAddresses] 鏈 ${chainId} 獲取認證代幣失敗:`, error);
    return {
      verifiedAddresses: new Set<string>(),
      tokenMetadataMap: new Map<string, { logo?: string; symbol?: string; name?: string }>(),
    };
  }
}

async function fetchChainTransactions(
  chainId: number,
  chainName: string,
  address: string,
  type: TransactionType,
  maxCount: number = 100,
  verifiedTokenAddresses?: Set<string>,
  tokenMetadataMap?: Map<string, { logo?: string; symbol?: string; name?: string }>
): Promise<ChainTransactionResult> {
  try {
    
    const settings = {
      apiKey: dashboardConfig.alchemyApiKey,
      network: getAlchemyNetworkEnum(chainId),
    };
    const alchemy = new Alchemy(settings);

    const networkConfig = dashboardConfig.networks.find((n) => n.chain.id === chainId);
    if (!networkConfig) {
      throw new Error(`未找到鏈 ${chainId} 的配置`);
    }

    const targetAddress = address.toLowerCase();
    const transactions: Transaction[] = [];

    if (type === 'buy' || type === 'all') {
      
      const buyTransfers = await alchemy.core.getAssetTransfers({
        toAddress: targetAddress,
        category: [
          AssetTransfersCategory.EXTERNAL,
          AssetTransfersCategory.INTERNAL,
          AssetTransfersCategory.ERC20,
        ],
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: maxCount,
      });

      for (const transfer of buyTransfers.transfers) {
        const isNative = !transfer.rawContract?.address;
        const tokenAddress = transfer.rawContract?.address || '0x0000000000000000000000000000000000000000';

        if (!isNative && verifiedTokenAddresses) {
          const tokenAddressLower = tokenAddress.toLowerCase();
          if (!verifiedTokenAddresses.has(tokenAddressLower)) {
            
            continue;
          }
        }
        const rawDecimal = transfer.rawContract?.decimal;
        const decimals = (typeof rawDecimal === 'number' ? rawDecimal : undefined) ?? networkConfig.chain.nativeCurrency.decimals;

        let valueBigInt: bigint = BigInt(0);
        let valueStr: string;

        if (transfer.rawContract?.value) {
          
          try {
            valueBigInt = fromHex(transfer.rawContract.value as `0x${string}`, 'bigint');
            valueStr = transfer.rawContract.value;
          } catch {
            valueBigInt = BigInt(0);
            valueStr = '0';
          }
        } else if (transfer.value !== null && transfer.value !== undefined) {

          try {
            valueBigInt = parseUnits(transfer.value.toString(), decimals);
            valueStr = valueBigInt.toString();
          } catch {
            valueBigInt = BigInt(0);
            valueStr = '0';
          }
        } else {
          valueBigInt = BigInt(0);
          valueStr = '0';
        }

        if (valueBigInt === BigInt(0)) {
          continue; 
        }

        const formattedValue = formatUnits(valueBigInt, decimals);

        let logo: string | undefined;
        if (isNative) {
          
          logo = getNetworkIconUrl(chainId);
        } else {
          
          const tokenAddressLower = tokenAddress.toLowerCase();
          const metadata = tokenMetadataMap?.get(tokenAddressLower);
          if (metadata?.logo && metadata.logo.trim() !== '') {
            logo = metadata.logo;
          } else {
            
            logo = `https://icons.llamao.fi/icons/tokens/${chainId}/${tokenAddressLower}`;
          }
        }

        transactions.push({
          uniqueId: `${chainId}-${transfer.hash}-${transfer.uniqueId || Date.now()}`,
          chainId,
          hash: transfer.hash,
          blockNum: transfer.blockNum || '',
          from: transfer.from || '',
          to: transfer.to || '',
          value: valueStr,
          formattedValue,
          asset: transfer.asset || networkConfig.chain.nativeCurrency.symbol,
          category: transfer.category as AssetTransferCategory,
          direction: 'in',
          transactionType: 'buy',
          timestamp: transfer.metadata?.blockTimestamp || new Date().toISOString(),
          logo,
          decimals,
          tokenAddress: isNative ? undefined : tokenAddress,
          isNative,
        });
      }
    }

    if (type === 'sell' || type === 'all') {
      
      const sellTransfers = await alchemy.core.getAssetTransfers({
        fromAddress: targetAddress,
        category: [
          AssetTransfersCategory.EXTERNAL,
          AssetTransfersCategory.INTERNAL,
          AssetTransfersCategory.ERC20,
        ],
        withMetadata: true,
        excludeZeroValue: true,
        maxCount: maxCount,
      });

      for (const transfer of sellTransfers.transfers) {
        const isNative = !transfer.rawContract?.address;
        const tokenAddress = transfer.rawContract?.address || '0x0000000000000000000000000000000000000000';

        if (!isNative && verifiedTokenAddresses) {
          const tokenAddressLower = tokenAddress.toLowerCase();
          if (!verifiedTokenAddresses.has(tokenAddressLower)) {
            
            continue;
          }
        }
        const rawDecimal = transfer.rawContract?.decimal;
        const decimals = (typeof rawDecimal === 'number' ? rawDecimal : undefined) ?? networkConfig.chain.nativeCurrency.decimals;

        let valueBigInt: bigint = BigInt(0);
        let valueStr: string;

        if (transfer.rawContract?.value) {
          
          try {
            valueBigInt = fromHex(transfer.rawContract.value as `0x${string}`, 'bigint');
            valueStr = transfer.rawContract.value;
          } catch {
            valueBigInt = BigInt(0);
            valueStr = '0';
          }
        } else if (transfer.value !== null && transfer.value !== undefined) {

          try {
            valueBigInt = parseUnits(transfer.value.toString(), decimals);
            valueStr = valueBigInt.toString();
          } catch {
            valueBigInt = BigInt(0);
            valueStr = '0';
          }
        } else {
          valueBigInt = BigInt(0);
          valueStr = '0';
        }

        if (valueBigInt === BigInt(0)) {
          continue; 
        }

        const formattedValue = formatUnits(valueBigInt, decimals);

        let logo: string | undefined;
        if (isNative) {
          
          logo = getNetworkIconUrl(chainId);
        } else {
          
          const tokenAddressLower = tokenAddress.toLowerCase();
          const metadata = tokenMetadataMap?.get(tokenAddressLower);
          if (metadata?.logo && metadata.logo.trim() !== '') {
            logo = metadata.logo;
          } else {
            
            logo = `https://icons.llamao.fi/icons/tokens/${chainId}/${tokenAddressLower}`;
          }
        }

        transactions.push({
          uniqueId: `${chainId}-${transfer.hash}-${transfer.uniqueId || Date.now()}`,
          chainId,
          hash: transfer.hash,
          blockNum: transfer.blockNum || '',
          from: transfer.from || '',
          to: transfer.to || '',
          value: valueStr,
          formattedValue,
          asset: transfer.asset || networkConfig.chain.nativeCurrency.symbol,
          category: transfer.category as AssetTransferCategory,
          direction: 'out',
          transactionType: 'sell',
          timestamp: transfer.metadata?.blockTimestamp || new Date().toISOString(),
          logo,
          decimals,
          tokenAddress: isNative ? undefined : tokenAddress,
          isNative,
        });
      }
    }

    transactions.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    let finalTransactions = transactions;
    if (type === 'all') {
      const seen = new Set<string>();
      finalTransactions = transactions.filter((tx) => {
        const key = `${tx.hash}-${tx.from}-${tx.to}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }

    return {
      success: true,
      chainId,
      chainName,
      transactions: finalTransactions.slice(0, maxCount), 
    };
  } catch (chainError: unknown) {
    
    const errorMessage =
      chainError instanceof Error
        ? chainError.message
        : typeof chainError === 'string'
        ? chainError
        : '未知錯誤';

    return {
      success: false,
      chainId,
      chainName,
      error: errorMessage,
      transactions: [],
    };
  }
}

export async function fetchTransactions({
  address,
  type = 'all',
  maxCount = 100,
}: FetchTransactionsParams): Promise<TransactionsResult> {
  
  if (!address) {
    throw new Error('地址不能為空');
  }

  if (!isAddress(address)) {
    throw new Error('無效的錢包地址');
  }

  const targetAddress = address.toLowerCase();

  if (!dashboardConfig.alchemyApiKey || dashboardConfig.alchemyApiKey === '') {
    throw new Error('Alchemy API Key 未配置，請在 dashboard.config.ts 中設置');
  }

  const networks = dashboardConfig.networks.filter((n) => n.enabled);

  if (networks.length === 0) {
    throw new Error('沒有啟用的網絡，請在配置中啟用至少一個網絡');
  }

  const verifiedTokensPromises = networks.map(async (networkConfig) => {
    const chainId = networkConfig.chain.id;
    const { verifiedAddresses, tokenMetadataMap } = await getVerifiedTokenAddresses(chainId, targetAddress);
    return { chainId, verifiedAddresses, tokenMetadataMap };
  });

  const verifiedTokensResults = await Promise.allSettled(verifiedTokensPromises);

  const verifiedTokensMap = new Map<number, Set<string>>();
  const tokenMetadataMaps = new Map<number, Map<string, { logo?: string; symbol?: string; name?: string }>>();
  verifiedTokensResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { chainId, verifiedAddresses, tokenMetadataMap } = result.value;
      verifiedTokensMap.set(chainId, verifiedAddresses);
      tokenMetadataMaps.set(chainId, tokenMetadataMap);
    } else {
      
      const chainId = networks[index].chain.id;
      verifiedTokensMap.set(chainId, new Set<string>());
      tokenMetadataMaps.set(chainId, new Map<string, { logo?: string; symbol?: string; name?: string }>());
    }
  });

  const promises = networks.map(async (networkConfig) => {
    const chainId = networkConfig.chain.id;
    const chainName = networkConfig.customName || networkConfig.chain.name;
    const verifiedAddresses = verifiedTokensMap.get(chainId);
    const tokenMetadataMap = tokenMetadataMaps.get(chainId);
    return fetchChainTransactions(chainId, chainName, targetAddress, type, maxCount, verifiedAddresses, tokenMetadataMap);
  });

  const results = await Promise.allSettled(promises);

  const allTransactions: Transaction[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { success, chainName, transactions, error } = result.value;
      if (success) {
        allTransactions.push(...transactions);
      } else {
        errors.push(`${chainName}: ${error || '未知錯誤'}`);
      }
    } else {
      const networkConfig = networks[index];
      const chainName = networkConfig.customName || networkConfig.chain.name;
      const errorMsg =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason || '請求失敗');
      errors.push(`${chainName}: ${errorMsg}`);
    }
  });

  if (errors.length > 0 && allTransactions.length === 0) {
    throw new Error(`所有鏈獲取失敗: ${errors.join('; ')}`);
  }

  if (errors.length > 0) {
    console.warn(`部分鏈獲取失敗: ${errors.join('; ')}`);
  }

  const sortedTransactions = allTransactions.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA;
  });

  return {
    transactions: sortedTransactions,
    hasMore: false, 
  };
}
