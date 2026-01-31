import { isAddress, formatUnits, getAddress } from 'viem';
import { Alchemy, TokenBalanceType } from 'alchemy-sdk';
import { dashboardConfig } from '@/config/dashboard.config';
import { getAlchemyNetworkEnum, getNativeTokenLogo, getTrustWalletChainName } from '@/utils/network';
import type { Asset, ChainQueryResult, FetchPortfolioParams } from '@/types/assets';

/**
 * 获取单链资产
 * 输入：所在链id、所在链名称、地址
 * 输出：是否成功、所在链id、所在链名称、资产列表、错误信息
 * 步骤：
 * 1. 获取Alchemy实例
 * 2. 获取网络配置
 * 3. 获取原生代币余额
 * 4. 获取代币余额
 * 5. 获取代币元数据
 * 6. 构建ERC20资产
 * 7. 构建原生代币资产
 * 8. 返回资产列表
 */
async function fetchChainAssets(
  chainId: number,
  chainName: string,
  address: string
): Promise<ChainQueryResult> {
  
  try {
    // 1. 获取Alchemy实例
    const settings = {
      apiKey: dashboardConfig.alchemyApiKey,
      network: getAlchemyNetworkEnum(chainId),
    };
    const alchemy = new Alchemy(settings);

    // 2. 获取网络配置
    const networkConfig = dashboardConfig.networks.find(n => n.chain.id === chainId);
    if (!networkConfig) {
      throw new Error(`未找到链 ${chainId} 的配置`);
    }

    // 3. 获取原生代币余额
    // 4. 获取代币余额(使用type: TokenBalanceType.DEFAULT_TOKENS排除垃圾币)
    const [nativeBalance, tokenBalancesResponse] = await Promise.all([
      alchemy.core.getBalance(address),
      alchemy.core.getTokenBalances(address, { type: TokenBalanceType.DEFAULT_TOKENS }),
    ]);

    // 5. 过滤出有余额的代币
    const activeTokens = tokenBalancesResponse.tokenBalances.filter(token => {
      return token.tokenBalance && token.tokenBalance !== "0x" && BigInt(token.tokenBalance) > 0;
    });
    
    // 6. 获取代币元数据
    const tokenMetadataPromises = activeTokens.map(token =>
      alchemy.core.getTokenMetadata(token.contractAddress)
    );
    const tokensMetadata = await Promise.all(tokenMetadataPromises);

    // 7. 构建ERC20资产
    const erc20Assets: Asset[] = activeTokens.map((token, index) => {
      const meta = tokensMetadata[index];

      // 三级 Fallback 策略获取高清 Logo
      let logo: string;
      
      // Tier 1: Trust Wallet Assets (高清首选，需要 Checksum 地址)
      const trustWalletChain = getTrustWalletChainName(chainId);
      if (trustWalletChain) {
        try {
          const checksumAddress = getAddress(token.contractAddress);
          logo = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustWalletChain}/assets/${checksumAddress}/logo.png`;
        } catch {
          // 如果地址转换失败，降级到 Tier 2
          logo = (meta.logo && meta.logo.trim() !== '')
            ? meta.logo
            : `https://icons.llamao.fi/icons/tokens/${chainId}/${token.contractAddress.toLowerCase()}`;
        }
      } 
      // Tier 2: Alchemy 元数据 logo
      else if (meta.logo && meta.logo.trim() !== '') {
        logo = meta.logo;
      } 
      // Tier 3: DefiLlama 兜底
      else {
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
      balance: nativeBalance.toString(),
      formatted: formatUnits(BigInt(nativeBalance.toString()), networkConfig.chain.nativeCurrency.decimals),
      logo: getNativeTokenLogo(chainId),
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
  //判断地址是否为空，是否为有效地址
  if (!address) {
    throw new Error("地址不能为空");
  }

  if (!isAddress(address)) {
    throw new Error("无效的钱包地址");
  }
  //将地址转换为小写
  const targetAddress = address.toLowerCase();

  //判断Alchemy API Key是否为空
  if (!dashboardConfig.alchemyApiKey || dashboardConfig.alchemyApiKey === '') {
    throw new Error("Alchemy API Key 未配置，请在 dashboard.config.ts 中设置");
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
