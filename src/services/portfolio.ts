import { isAddress, formatUnits } from 'viem';
import { Alchemy, TokenBalanceType } from 'alchemy-sdk';
import {
  dashboardConfig,
  getAlchemyNetworkEnum,
  getNetworkIconUrl
} from '@/config/dashboard.config';
import type { Asset, ChainQueryResult, FetchPortfolioParams } from '@/types/assets';

/**
 * 查询单个链的资产
 */
async function fetchChainAssets(
  chainId: number,
  chainName: string,
  address: string
): Promise<ChainQueryResult> {
  try {
    // 初始化单链的 Alchemy 实例
    const settings = {
      apiKey: dashboardConfig.alchemyApiKey,
      network: getAlchemyNetworkEnum(chainId),
    };
    const alchemy = new Alchemy(settings);

    // 获取网络配置
    const networkConfig = dashboardConfig.networks.find(n => n.chain.id === chainId);
    if (!networkConfig) {
      throw new Error(`未找到链 ${chainId} 的配置`);
    }

    // 并行查询原生代币和 ERC20 列表
    const [nativeBalance, tokenBalancesResponse] = await Promise.all([
      alchemy.core.getBalance(address),
      alchemy.core.getTokenBalances(address, { type: TokenBalanceType.DEFAULT_TOKENS }),
    ]);

    // --- 处理 ERC20 代币 ---

    // 过滤掉余额为 0 的代币
    const activeTokens = tokenBalancesResponse.tokenBalances.filter(token => {
      return token.tokenBalance && token.tokenBalance !== "0x" && BigInt(token.tokenBalance) > 0;
    });

    // 获取 Metadata (只针对有余额的)
    const tokenMetadataPromises = activeTokens.map(token =>
      alchemy.core.getTokenMetadata(token.contractAddress)
    );
    const tokensMetadata = await Promise.all(tokenMetadataPromises);

    // 组装 ERC20 数据
    const erc20Assets: Asset[] = activeTokens.map((token, index) => {
      const meta = tokensMetadata[index];
      // Logo 优先级：Alchemy 返回的 logo > DefiLlama 图标 CDN
      // 如果 meta.logo 不存在、为空字符串或无效，使用 DefiLlama 作为兜底
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

    // --- 处理原生代币 (ETH, MATIC, AVAX) ---
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

    // 只有当原生代币余额 > 0 才放入列表
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
    // 单个链失败，记录错误但继续处理其他链
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

/**
 * 查询所有链的资产
 * 这是核心查询函数，会被 TanStack Query 调用
 */
export async function fetchPortfolio({ address }: FetchPortfolioParams): Promise<Asset[]> {
  // 1. 基础校验
  if (!address) {
    throw new Error("地址不能为空");
  }

  if (!isAddress(address)) {
    throw new Error("无效的钱包地址");
  }

  const targetAddress = address.toLowerCase();

  // 2. 检查 API Key
  if (!dashboardConfig.alchemyApiKey || dashboardConfig.alchemyApiKey === '') {
    throw new Error("Alchemy API Key 未配置，请在 dashboard.config.ts 中设置");
  }

  // 3. 获取所有启用的网络配置
  const networks = dashboardConfig.networks.filter(n => n.enabled);

  if (networks.length === 0) {
    throw new Error("没有启用的网络，请在配置中启用至少一个网络");
  }

  // 4. 并行查询所有链 (使用 Promise.allSettled，单个链失败不影响其他链)
  const promises = networks.map(async (networkConfig) => {
    const chainId = networkConfig.chain.id;
    const chainName = networkConfig.customName || networkConfig.chain.name;
    return fetchChainAssets(chainId, chainName, targetAddress);
  });

  // 5. 等待所有链的结果
  const results = await Promise.allSettled(promises);

  // 6. 处理结果
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

  // 7. 如果有错误且没有成功的数据，抛出错误
  if (errors.length > 0 && allAssets.length === 0) {
    throw new Error(`所有链获取失败: ${errors.join('; ')}`);
  }

  // 8. 如果有部分错误，记录警告但不阻止返回数据
  
  if (errors.length > 0) {
    console.warn(`部分链获取失败: ${errors.join('; ')}`);
  }

  return allAssets;
}

