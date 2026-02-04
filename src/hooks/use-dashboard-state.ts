"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { useSearchParams, useRouter } from "next/navigation";
import { dashboardConfig } from "@/config/dashboard.config";
import { getNativeTokenLogo } from "@/utils/network";
import { isTestnetChain } from "@/utils/asset-utils";
import { useAggregatedPortfolio } from "./useAggregatedPortfolio";
import { useChainAssets } from "./use-chain-assets";
import { useGasPrice } from "./use-gas-price";
import { useAggregatedPriceHistories } from "./use-price-history";
import type { 
  GroupedAsset, 
  Asset, 
  PriceStatus,
  PriceState,
  PriceHistoryState,
  ChainInfo,
  ChainDistributionInfo,
  PriceHistoryStatus,
  CurrentPriceStatus,
  AssetCategory,
  DashboardAsset,
  DashboardState,
  UseDashboardStateReturn
} from "@/types";

// 类型已从 @/types 统一导入
export type {
  ChainInfo,
  ChainDistributionInfo,
  PriceHistoryStatus,
  CurrentPriceStatus,
  AssetCategory,
  DashboardAsset,
  DashboardState,
  UseDashboardStateReturn,
};

// 小资产价值阈值
const SMALL_ASSET_THRESHOLD = 1.0; // $1

/**
 * 获取链的短名称
 */
function getChainShortName(chainName: string): string {
  const nameMap: Record<string, string> = {
    Ethereum: "ETH",
    "Arbitrum One": "ARB",
    Optimism: "OP",
    "OP Mainnet": "OP",
    Base: "BASE",
    Polygon: "POLY",
    Sepolia: "SEP",
    "BNB Smart Chain": "BNB",
  };

  return nameMap[chainName] || chainName.slice(0, 4).toUpperCase();
}

/**
 * 从 dashboard 配置构建链列表（仅启用网络）
 */
function buildChainsFromConfig(): ChainInfo[] {
  const allOption: ChainInfo = {
    id: "all",
    chainId: 0,
    name: "All Networks",
    shortName: "ALL",
    logo: "",
    color: "#6366f1",
  };

  const networkChains: ChainInfo[] = dashboardConfig.networks
    .filter((n) => n.enabled)
    .map((n) => ({
      id: String(n.chain.id),
      chainId: n.chain.id,
      name: n.customName ?? n.chain.name,
      shortName: getChainShortName(n.chain.name),
      logo: getNativeTokenLogo(n.chain.id),
      color: "#6366f1",
    }));

  return [allOption, ...networkChains];
}

const ALL_CHAINS = buildChainsFromConfig();

/**
 * 获取聚合资产的价格和价值
 */
function getGroupedAssetPriceAndValue(
  groupedAsset: GroupedAsset,
  getPriceState: (uniqueId: string) => PriceState
): { price: number; value: number; priceStatus: CurrentPriceStatus } {
  if (groupedAsset.assets.length === 0) {
    return { price: 0, value: 0, priceStatus: 'failed' };
  }

  let successPrice = 0;
  let hasSuccess = false;
  let hasLoading = false;

  for (const asset of groupedAsset.assets) {
    const priceState = getPriceState(asset.uniqueId);
    if (priceState.status === 'success' && priceState.price > 0) {
      successPrice = priceState.price;
      hasSuccess = true;
      break;
    } else if (priceState.status === 'loading') {
      hasLoading = true;
    }
  }

  if (hasSuccess) {
    const totalBalance = parseFloat(groupedAsset.totalBalance) || 0;
    const value = totalBalance * successPrice;
    return {
      price: successPrice,
      value,
      priceStatus: 'success' as CurrentPriceStatus,
    };
  }

  if (hasLoading) {
    return { price: 0, value: 0, priceStatus: 'loading' as CurrentPriceStatus };
  }

  return {
    price: 0,
    value: groupedAsset.totalValue,
    priceStatus: 'failed' as CurrentPriceStatus,
  };
}

/**
 * 将 GroupedAsset 转换为 DashboardAsset
 */
function convertGroupedAssetToDashboardAsset(
  groupedAsset: GroupedAsset,
  historyState: PriceHistoryState,
  getPriceState: (uniqueId: string) => PriceState,
  category: AssetCategory
): DashboardAsset {
  const { price, value, priceStatus } = getGroupedAssetPriceAndValue(groupedAsset, getPriceState);

  return {
    id: groupedAsset.symbol,
    symbol: groupedAsset.symbol,
    name: groupedAsset.name,
    logo: groupedAsset.logo ?? "",
    price: priceStatus === 'success' ? price : groupedAsset.averagePrice,
    priceChange24h: 0,
    priceChange7d: historyState.change7d ?? 0,
    balance: parseFloat(groupedAsset.totalBalance) || 0,
    value: value,
    chains: groupedAsset.chains.map((chainId) => String(chainId)),
    isTestnet: groupedAsset.isTestnet,
    category,
    priceHistory7d: historyState.trend,
    priceHistoryStatus: historyState.status,
    priceStatus,
  };
}

/**
 * 自定义钩子：Dashboard 状态管理（分层加载优化版）
 *
 * 核心策略：
 * 1. Top Assets (value >= $1): 立即加载完整数据（当前价格 + 历史价格）
 * 2. Small Assets (value < $1): 只加载当前价格，历史价格按需加载
 * 
 * UI 状态持久化：
 * - 通过 URL 参数保存当前视图状态（链选择、测试网开关、小资产展开）
 * - 页面切换后返回时自动恢复状态
 */
export function useDashboardState(
  overrideAddress?: string | undefined,
): UseDashboardStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 从 URL 参数读取初始状态
  const getInitialChain = () => searchParams.get("chain") || "all";
  const getInitialShowTestnets = () => searchParams.get("testnets") === "true";
  const getInitialExpanded = () => searchParams.get("expanded") === "true";

  const [selectedChain, setSelectedChainState] = useState<string>(getInitialChain);
  const [showTestnets, setShowTestnetsState] = useState<boolean>(getInitialShowTestnets);
  const [smallAssetsExpanded, setSmallAssetsExpandedState] = useState<boolean>(getInitialExpanded);

  // 同步 URL 参数变化到本地状态
  useEffect(() => {
    const chainFromUrl = searchParams.get("chain");
    const testnetsFromUrl = searchParams.get("testnets");
    const expandedFromUrl = searchParams.get("expanded");

    if (chainFromUrl && chainFromUrl !== selectedChain) {
      setSelectedChainState(chainFromUrl);
    }
    if (testnetsFromUrl !== null) {
      const showTestnetsValue = testnetsFromUrl === "true";
      if (showTestnetsValue !== showTestnets) {
        setShowTestnetsState(showTestnetsValue);
      }
    }
    if (expandedFromUrl !== null) {
      const expandedValue = expandedFromUrl === "true";
      if (expandedValue !== smallAssetsExpanded) {
        setSmallAssetsExpandedState(expandedValue);
      }
    }
  }, [searchParams]);

  // 更新 URL 参数的辅助函数
  const updateUrlParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "false") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, router]);

  // 包装状态设置函数，同步更新 URL
  const setSelectedChain = useCallback((chainId: string) => {
    setSelectedChainState(chainId);
    updateUrlParams({ chain: chainId === "all" ? null : chainId });
  }, [updateUrlParams]);

  const setShowTestnets = useCallback((value: boolean) => {
    setShowTestnetsState(value);
    updateUrlParams({ testnets: value ? "true" : null });
  }, [updateUrlParams]);

  const setSmallAssetsExpanded = useCallback((value: boolean) => {
    setSmallAssetsExpandedState(value);
    updateUrlParams({ expanded: value ? "true" : null });
  }, [updateUrlParams]);

  const { address: walletAddress, isConnected } = useAccount();
  const effectiveAddress = overrideAddress ?? walletAddress ?? undefined;
  const effectiveConnected = overrideAddress ? true : isConnected;

  // 获取聚合资产数据（所有资产 + 当前价格）
  const { aggregatedData, isLoading, refetch, rawData, getPriceState } = useAggregatedPortfolio(
    effectiveAddress,
    effectiveConnected,
    showTestnets,
  );

  // 分离 Top Assets 和 Small Assets
  const { topAssetsRaw, smallAssetsRaw } = useMemo(() => {
    const top: GroupedAsset[] = [];
    const small: GroupedAsset[] = [];

    aggregatedData.forEach((asset) => {
      // 使用价格计算后的价值来判断
      const { value } = getGroupedAssetPriceAndValue(asset, getPriceState);
      if (value >= SMALL_ASSET_THRESHOLD) {
        top.push(asset);
      } else {
        small.push(asset);
      }
    });

    console.log(`[useDashboardState] 分层: Top Assets ${top.length}, Small Assets ${small.length}`);
    return { topAssetsRaw: top, smallAssetsRaw: small };
  }, [aggregatedData, getPriceState]);

  // 提取 Top Assets 和 Small Assets 的原始 Asset 数据
  const topRawAssets = useMemo(() => {
    const assets: Asset[] = [];
    topAssetsRaw.forEach(grouped => {
      assets.push(...grouped.assets);
    });
    return assets;
  }, [topAssetsRaw]);

  const smallRawAssets = useMemo(() => {
    const assets: Asset[] = [];
    smallAssetsRaw.forEach(grouped => {
      assets.push(...grouped.assets);
    });
    return assets;
  }, [smallAssetsRaw]);

  // Top Assets: 立即加载历史价格
  // Small Assets: 仅当展开时才加载历史价格
  const { getStateBySymbol, topHistory, smallHistory } = useAggregatedPriceHistories(
    topRawAssets,
    smallRawAssets,
    effectiveConnected && topRawAssets.length > 0,
    smallAssetsExpanded // 只有展开时才加载小资产历史价格
  );

  // 转换所有 GroupedAsset 为 DashboardAsset
  const topAssetsDashboard = useMemo(() => {
    return topAssetsRaw.map((asset) => {
      const historyState = getStateBySymbol(asset.symbol);
      return convertGroupedAssetToDashboardAsset(
        asset,
        historyState,
        getPriceState,
        'top'
      );
    });
  }, [topAssetsRaw, getStateBySymbol, getPriceState]);

  const smallAssetsDashboard = useMemo(() => {
    return smallAssetsRaw.map((asset) => {
      const historyState = getStateBySymbol(asset.symbol);
      return convertGroupedAssetToDashboardAsset(
        asset,
        historyState,
        getPriceState,
        'small'
      );
    });
  }, [smallAssetsRaw, getStateBySymbol, getPriceState]);

  // 合并所有资产
  const assets = useMemo(() => {
    return [...topAssetsDashboard, ...smallAssetsDashboard];
  }, [topAssetsDashboard, smallAssetsDashboard]);

  // 单链资产筛选
  const { displayedAssets, chainNetWorth } = useChainAssets(
    aggregatedData,
    selectedChain,
  );

  // 转换筛选后的资产
  const filteredAssets = useMemo(() => {
    return displayedAssets.map((asset) => {
      const historyState = getStateBySymbol(asset.symbol);
      const category = topAssetsDashboard.some(a => a.symbol === asset.symbol) ? 'top' : 'small';
      return convertGroupedAssetToDashboardAsset(
        asset,
        historyState,
        getPriceState,
        category
      );
    });
  }, [displayedAssets, getStateBySymbol, getPriceState, topAssetsDashboard]);

  // 分离筛选后的资产
  const filteredTopAssets = useMemo(() => {
    return filteredAssets.filter(a => a.category === 'top');
  }, [filteredAssets]);

  const filteredSmallAssets = useMemo(() => {
    return filteredAssets.filter(a => a.category === 'small');
  }, [filteredAssets]);

  const totalNetWorth = chainNetWorth;

  // 链列表：关闭「显示测试网」时隐藏测试网选项
  const chains = useMemo(() => {
    if (showTestnets) return ALL_CHAINS;
    return ALL_CHAINS.filter(
      (c) => c.id === "all" || !isTestnetChain(c.chainId),
    );
  }, [showTestnets]);

  // 计算24小时变化（TODO: 需要历史价格数据支持）
  const { totalChange24h, totalChangePercent } = useMemo(() => {
    return {
      totalChange24h: 0,
      totalChangePercent: 0,
    };
  }, []);

  // Gas 价格显示 - 使用链的原生代币单位
  const targetChainId = selectedChain === "all" ? 1 : Number(selectedChain);
  const {
    displayPrice,
    isLoading: isGasPriceLoading,
    error: gasPriceError,
  } = useGasPrice(targetChainId);

  const gasPrice = useMemo(() => {
    if (isGasPriceLoading) {
      return undefined;
    }
    if (gasPriceError || !displayPrice) {
      return "N/A";
    }
    return displayPrice;
  }, [isGasPriceLoading, gasPriceError, displayPrice]);

  // 计算价格数据统计
  const priceStats = useMemo(() => {
    const allAssets = [...topAssetsDashboard, ...smallAssetsDashboard];
    return {
      success: allAssets.filter(a => a.priceStatus === 'success').length,
      loading: allAssets.filter(a => a.priceStatus === 'loading').length,
      failed: allAssets.filter(a => a.priceStatus === 'failed').length,
    };
  }, [topAssetsDashboard, smallAssetsDashboard]);

  // 计算历史价格数据统计
  const historyStats = useMemo(() => {
    const allAssets = [...topAssetsDashboard, ...smallAssetsDashboard];
    return {
      success: allAssets.filter(a => a.priceHistoryStatus === 'success').length,
      loading: allAssets.filter(a => a.priceHistoryStatus === 'loading').length,
      failed: allAssets.filter(a => a.priceHistoryStatus === 'failed').length,
      pending: allAssets.filter(a => a.priceHistoryStatus === 'pending').length,
    };
  }, [topAssetsDashboard, smallAssetsDashboard]);

  const chainDistribution = useMemo((): ChainDistributionInfo[] => {
    const totalValue = aggregatedData
      .filter((g) => !g.isTestnet)
      .reduce((sum, g) => sum + g.totalValue, 0);
    
    const total = totalValue || 1;
    
    return ALL_CHAINS.filter(c => c.id !== 'all').map(chain => {
      const chainValue = aggregatedData
        .filter(group => !group.isTestnet)
        .reduce((sum, group) => {
          const chainAssets = group.assets.filter(asset => asset.chainId === chain.chainId);
          const chainAssetValue = chainAssets.reduce((assetSum, asset) => assetSum + (asset.value ?? 0), 0);
          return sum + chainAssetValue;
        }, 0);
      
      return {
        ...chain,
        value: chainValue,
        percentage: (chainValue / total) * 100,
      };
    }).sort((a, b) => b.value - a.value);
  }, [aggregatedData]);

  return {
    totalNetWorth,
    totalChange24h,
    totalChangePercent,
    topAssets: topAssetsDashboard,
    smallAssets: smallAssetsDashboard,
    assets,
    chains,
    selectedChain,
    isLoading,
    showTestnets,
    setSelectedChain,
    setShowTestnets,
    filteredAssets,
    filteredTopAssets,
    filteredSmallAssets,
    refetch,
    gasPrice,
    smallAssetsExpanded,
    setSmallAssetsExpanded,
    priceStats,
    historyStats,
    chainDistribution,
  };
}
