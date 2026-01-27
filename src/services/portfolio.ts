import { isAddress, formatUnits } from 'viem';
import { Alchemy, TokenBalanceType } from 'alchemy-sdk';
import {
  dashboardConfig,
  getAlchemyNetworkEnum,
  getNetworkIconUrl
} from '@/config/dashboard.config';
import type { Asset, ChainQueryResult, FetchPortfolioParams } from '@/types/assets';

async function fetchChainAssets(
  chainId: number,
  chainName: string,
  address: string
): Promise<ChainQueryResult> {
  try {
    
    const settings = {
      apiKey: dashboardConfig.alchemyApiKey,
      network: getAlchemyNetworkEnum(chainId),
    };
    const alchemy = new Alchemy(settings);

    const networkConfig = dashboardConfig.networks.find(n => n.chain.id === chainId);
    if (!networkConfig) {
      throw new Error(`未找到链 ${chainId} 的配置`);
    }

    const [nativeBalance, tokenBalancesResponse] = await Promise.all([
      alchemy.core.getBalance(address),
      alchemy.core.getTokenBalances(address, { type: TokenBalanceType.DEFAULT_TOKENS }),
    ]);

    const activeTokens = tokenBalancesResponse.tokenBalances.filter(token => {
      return token.tokenBalance && token.tokenBalance !== "0x" && BigInt(token.tokenBalance) > 0;
    });

    const tokenMetadataPromises = activeTokens.map(token =>
      alchemy.core.getTokenMetadata(token.contractAddress)
    );
    const tokensMetadata = await Promise.all(tokenMetadataPromises);

    const erc20Assets: Asset[] = activeTokens.map((token, index) => {
      const meta = tokensMetadata[index];

      const logo = (meta.logo && meta.logo.trim() !== '')
        ? meta.logo
        : `https://icons.llamao.fi/icons/tokens/${chainId}/${token.contractAddress.toLowerCase()}`;

      return {
        uniqueId: `${chainId}-${token.contractAddress}`,
        chainId: chainId,
        address: token.contractAddress,
        symbol: meta.symbol || 'Unknown',
        name: meta.name || 'Unknown Token',
        decimals: meta.decimals || 18,
        balance: token.tokenBalance || "0",
        formatted: formatUnits(BigInt(token.tokenBalance || "0"), meta.decimals || 18),
        logo: logo,
        isNative: false,
      };
    });

    const nativeAsset: Asset = {
      uniqueId: `${chainId}-native`,
      chainId: chainId,
      address: "0x0000000000000000000000000000000000000000",
      symbol: networkConfig.chain.nativeCurrency.symbol,
      name: networkConfig.chain.nativeCurrency.name,
      decimals: networkConfig.chain.nativeCurrency.decimals,
      balance: nativeBalance.toString(),
      formatted: formatUnits(BigInt(nativeBalance.toString()), networkConfig.chain.nativeCurrency.decimals),
      logo: getNetworkIconUrl(chainId),
      isNative: true,
    };

    const chainAssets: Asset[] = [];
    if (BigInt(nativeBalance.toString()) > 0) {
      chainAssets.push(nativeAsset);
    }

    return {
      success: true,
      chainId,
      chainName,
      assets: [...chainAssets, ...erc20Assets]
    };
  } catch (chainError: unknown) {
    
    const errorMessage = chainError instanceof Error
      ? chainError.message
      : typeof chainError === 'string'
      ? chainError
      : '未知错误';

    return {
      success: false,
      chainId,
      chainName,
      error: errorMessage,
      assets: []
    };
  }
}

export async function fetchPortfolio({ address }: FetchPortfolioParams): Promise<Asset[]> {
  
  if (!address) {
    throw new Error("地址不能为空");
  }

  if (!isAddress(address)) {
    throw new Error("无效的钱包地址");
  }

  const targetAddress = address.toLowerCase();

  if (!dashboardConfig.alchemyApiKey || dashboardConfig.alchemyApiKey === '') {
    throw new Error("Alchemy API Key 未配置，请在 dashboard.config.ts 中设置");
  }

  const networks = dashboardConfig.networks.filter(n => n.enabled);

  if (networks.length === 0) {
    throw new Error("没有启用的网络，请在配置中启用至少一个网络");
  }

  const promises = networks.map(async (networkConfig) => {
    const chainId = networkConfig.chain.id;
    const chainName = networkConfig.customName || networkConfig.chain.name;
    return fetchChainAssets(chainId, chainName, targetAddress);
  });

  const results = await Promise.allSettled(promises);

  const allAssets: Asset[] = [];
  const errors: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { success, chainName, assets, error } = result.value;
      if (success) {
        allAssets.push(...assets);
      } else {
        errors.push(`${chainName}: ${error || '未知错误'}`);
      }
    } else {
      const networkConfig = networks[index];
      const chainName = networkConfig.customName || networkConfig.chain.name;
      const errorMsg = result.reason instanceof Error
        ? result.reason.message
        : String(result.reason || '请求失败');
      errors.push(`${chainName}: ${errorMsg}`);
    }
  });

  if (errors.length > 0 && allAssets.length === 0) {
    throw new Error(`所有链获取失败: ${errors.join('; ')}`);
  }

  if (errors.length > 0) {
    console.warn(`部分链获取失败: ${errors.join('; ')}`);
  }

  return allAssets;
}
