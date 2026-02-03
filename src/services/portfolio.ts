import { isAddress, formatUnits, getAddress } from 'viem';
import { dashboardConfig } from '@/config/dashboard.config';
import { getRpcUrl, getNativeTokenLogo, getTrustWalletChainName } from '@/utils/network';
import type { Asset, ChainQueryResult, FetchPortfolioParams } from '@/types';

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

interface AlchemyTokenBalancesResponse {
  tokenBalances: AlchemyTokenBalance[];
}

interface AlchemyTokenMetadata {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
}

async function alchemyRpcCall(chainId: number, method: string, params: any[]): Promise<any> {
  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) {
    throw new Error(`无法获取链 ${chainId} 的 RPC URL`);
  }

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Alchemy API HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Alchemy API error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  return data.result;
}

async function fetchChainAssets(
  chainId: number,
  chainName: string,
  address: string
): Promise<ChainQueryResult> {
  
  try {
    const networkConfig = dashboardConfig.networks.find(n => n.chain.id === chainId);
    if (!networkConfig) {
      throw new Error(`未找到链 ${chainId} 的配置`);
    }

    const [nativeBalanceHex, tokenBalancesResponse] = await Promise.all([
      alchemyRpcCall(chainId, 'eth_getBalance', [address, 'latest']),
      alchemyRpcCall(chainId, 'alchemy_getTokenBalances', [address, 'DEFAULT_TOKENS']),
    ]);

    const nativeBalance = nativeBalanceHex;
    const tokenBalancesData = tokenBalancesResponse as AlchemyTokenBalancesResponse;

    const activeTokens = tokenBalancesData.tokenBalances.filter(token => {
      return token.tokenBalance && token.tokenBalance !== "0x" && BigInt(token.tokenBalance) > 0;
    });

    const tokensMetadata: AlchemyTokenMetadata[] = await Promise.all(
      activeTokens.map(token =>
        alchemyRpcCall(chainId, 'alchemy_getTokenMetadata', [token.contractAddress])
      )
    );

    const erc20Assets: Asset[] = activeTokens.map((token, index) => {
      const meta = tokensMetadata[index];

      let logo: string;
      const trustWalletChain = getTrustWalletChainName(chainId);
      if (trustWalletChain) {
        try {
          const checksumAddress = getAddress(token.contractAddress);
          logo = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustWalletChain}/assets/${checksumAddress}/logo.png`;
        } catch {
          logo = (meta.logo && meta.logo.trim() !== '')
            ? meta.logo
            : `https://icons.llamao.fi/icons/tokens/${chainId}/${token.contractAddress.toLowerCase()}`;
        }
      } else if (meta.logo && meta.logo.trim() !== '') {
        logo = meta.logo;
      } else {
        logo = `https://icons.llamao.fi/icons/tokens/${chainId}/${token.contractAddress.toLowerCase()}`;
      }

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
      balance: nativeBalance,
      formatted: formatUnits(BigInt(nativeBalance), networkConfig.chain.nativeCurrency.decimals),
      logo: getNativeTokenLogo(chainId),
      isNative: true,
    };

    const chainAssets: Asset[] = [];
    if (BigInt(nativeBalance) > 0) {
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
  //判断地址是否为空，是否为有效地址
  if (!address) {
    throw new Error("地址不能为空");
  }

  if (!isAddress(address)) {
    throw new Error("无效的钱包地址");
  }
  //将地址转换为小写
  const targetAddress = address.toLowerCase();

  if (!dashboardConfig.alchemyApiKey || dashboardConfig.alchemyApiKey === '') {
    throw new Error("Alchemy API Key 未配置，请在 .env.local 中设置 NEXT_PUBLIC_ALCHEMY_API_KEY");
  }

  const networks = dashboardConfig.networks.filter(n => n.enabled);

  if (networks.length === 0) {
    throw new Error("没有启用的网络，请在配置中启用至少一个网络");
  }

  //遍历所有网络，调用fetchChainAssets（获取单链资产）返回promise数组
  const promises = networks.map(async (networkConfig) => {
    const chainId = networkConfig.chain.id;
    const chainName = networkConfig.customName || networkConfig.chain.name;
    return fetchChainAssets(chainId, chainName, targetAddress);
  });
  //等待所有promise完成，返回结果数组，并且使用的是allSettled，所以不会因为其中一个失败而影响其他
  const results = await Promise.allSettled(promises);

  //定义资产数组和错误数组
  const allAssets: Asset[] = [];
  const errors: string[] = [];

  //遍历所有结果，处理成功和失败的情况
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

  //返回所有资产
  return allAssets;
}
