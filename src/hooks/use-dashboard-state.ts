"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { dashboardConfig } from "@/config/dashboard.config";
import { getNativeTokenLogo } from "@/utils/network";
import { isTestnetChain } from "@/utils/asset-utils";
import { useAggregatedPortfolio } from "./useAggregatedPortfolio";
import { useChainAssets } from "./use-chain-assets";
import { useGasPrice } from "./use-gas-price";
import { useAggregatedPriceHistories } from "./use-price-history";
import type { GroupedAsset, Asset, PriceStatus } from "@/types/assets";
import type { PriceState } from "./usePortfolio";

/**
 * 链信息类型
 */
export type ChainInfo = {
  id: string;
  chainId: number;
  name: string;
  shortName: string;
  logo: string;
  color: string;
};

/**
 * 历史价格状态
 */
export type PriceHistoryStatus = 'loading' | 'success' | 'failed';

/**
 * 当前价格状态
 */
export type CurrentPriceStatus = 'loading' | 'success' | 'failed';

/**
 * Dashboard 资产类型（带 Networks 列支持）
 *
 * 说明：这是为 Dashboard UI 定制的资产类型
 * 将 GroupedAsset 转换为展示所需的格式
 */
export type DashboardAsset = {
  id: string;
  symbol: string;
  name: string;
  logo: string;
  price: number;
  priceChange24h: number;
  /** 7天价格变化百分比（根据 priceHistory7d 计算） */
  priceChange7d: number;
  balance: number;
  value: number;
  chains: string[];
  isTestnet?: boolean;
  /** 7天价格历史数据（用于趋势图表） */
  priceHistory7d?: number[];
  /** 历史价格获取状态：loading = 获取中，success = 成功，failed = 失败 */
  priceHistoryStatus: PriceHistoryStatus;
  /** 当前价格获取状态：loading = 获取中，success = 成功，failed = 失败 */
  priceStatus: CurrentPriceStatus;
};

/**
 * Dashboard 状态类型
 */
export type DashboardState = {
  totalNetWorth: number;
  totalChange24h: number;
  totalChangePercent: number;
  assets: DashboardAsset[];
  chains: ChainInfo[];
  selectedChain: string;
  /** 主数据加载状态（资产、价格等） */
  isLoading: boolean;
  showTestnets: boolean;
};

/**
 * Dashboard 状态返回类型
 */
export type UseDashboardStateReturn = DashboardState & {
  setSelectedChain: (chainId: string) => void;
  setShowTestnets: (value: boolean) => void;
  filteredAssets: DashboardAsset[];
  refetch: () => void;
  gasPrice?: string;
};

/**
 * 获取链的短名称
 * 使用链名称的缩写映射
 */
function getChainShortName(chainName: string): string {
  // 常见链名到缩写的映射
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

function formatGasPriceGwei(value: number): string {
  const abs = Math.abs(value);
  if (!Number.isFinite(abs) || abs === 0) return "0";
  if (abs >= 100) return Math.round(value).toString();
  if (abs >= 10) return value.toFixed(0);
  if (abs >= 1) return value.toFixed(1).replace(/\.0$/, "");
  if (abs >= 0.1) return value.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
  if (abs >= 0.01)
    return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return "<0.01";
}

/**
 * 从 dashboard 配置构建链列表（仅启用网络）
 * 使用高清 Logo 策略：优先 Trust Wallet，降级到 DefiLlama 原图
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
      logo: getNativeTokenLogo(n.chain.id), // 使用高清 Logo 策略
      color: "#6366f1",
    }));

  return [allOption, ...networkChains];
}

const ALL_CHAINS = buildChainsFromConfig();

/**
 * 获取聚合资产的价格和价值
 * 使用高可用价格查询的结果
 */
function getGroupedAssetPriceAndValue(
  groupedAsset: GroupedAsset,
  getPriceState: (uniqueId: string) => PriceState
): { price: number; value: number; priceStatus: CurrentPriceStatus } {
  if (groupedAsset.assets.length === 0) {
    return { price: 0, value: 0, priceStatus: 'failed' };
  }

  // 查找成功的资产价格
  let successPrice = 0;
  let hasSuccess = false;
  let hasLoading = false;

  for (const asset of groupedAsset.assets) {
    const priceState = getPriceState(asset.uniqueId);
    if (priceState.status === 'success' && priceState.price > 0) {
      successPrice = priceState.price;
      hasSuccess = true;
      break; // 找到成功的价格就使用
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

  // 所有价格都获取失败了
  return {
    price: 0,
    value: groupedAsset.totalValue,
    priceStatus: 'failed' as CurrentPriceStatus,
  };
}

/**
 * 将 GroupedAsset 转换为 DashboardAsset
 * @param groupedAsset 聚合资产
 * @param historyState 历史价格状态
 * @param getPriceState 获取单个资产价格状态的函数
 */
function convertGroupedAssetToDashboardAsset(
  groupedAsset: GroupedAsset,
  historyState: { status: PriceHistoryStatus; trend?: number[]; change7d?: number },
  getPriceState: (uniqueId: string) => PriceState,
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
    priceHistory7d: historyState.trend,
    priceHistoryStatus: historyState.status,
    priceStatus,
  };
}

/**
 * 自定义钩子：Dashboard 状态管理
 *
 * 数据流：
 * 1. 若传入 overrideAddress（如巨鲸模式），则以其为单一数据源；否则使用 wagmi 连接地址
 * 2. 使用 useAggregatedPortfolio 获取聚合后的资产数据
 * 3. 转换数据格式以适配 Dashboard UI
 * 4. 提供链筛选功能
 *
 * @param overrideAddress 可选。当提供时（如 Whale Watcher 观察地址），所有数据按此地址拉取
 * @returns Dashboard 状态和操作函数
 */
export function useDashboardState(
  overrideAddress?: string | undefined,
): UseDashboardStateReturn {
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [showTestnets, setShowTestnets] = useState<boolean>(false);

  const { address: walletAddress, isConnected } = useAccount();
  const effectiveAddress = overrideAddress ?? walletAddress ?? undefined;
  const effectiveConnected = overrideAddress ? true : isConnected;

  const { aggregatedData, isLoading, refetch, rawData, getPriceState } = useAggregatedPortfolio(
    effectiveAddress,
    effectiveConnected,
    showTestnets,
  );

  // 获取历史价格数据（用于 7d Trend 图表）
  const { getStateBySymbol } = useAggregatedPriceHistories(
    rawData,
    effectiveConnected && rawData.length > 0
  );

  // 单链资产筛选：一次拉取、前端筛选，无额外请求
  const { displayedAssets, chainNetWorth } = useChainAssets(
    aggregatedData,
    selectedChain,
  );

  const targetChainId =
    selectedChain === "all" ? undefined : Number(selectedChain);
  const {
    gasPrice: gasPriceValue,
    isLoading: isGasPriceLoading,
    error: gasPriceError,
  } = useGasPrice(targetChainId);

  // 全部资产（Dashboard 格式，供链筛选等使用）
  const assets: DashboardAsset[] = useMemo(() => {
    return aggregatedData.map((asset) => {
      const historyState = getStateBySymbol(asset.symbol);
      return convertGroupedAssetToDashboardAsset(asset, {
        status: historyState.status,
        trend: historyState.trend,
        change7d: historyState.change7d,
      }, getPriceState);
    });
  }, [aggregatedData, getStateBySymbol, getPriceState]);

  // 当前展示的资产（经 useChainAssets 筛选/拆包后转 Dashboard 格式）
  const filteredAssets = useMemo(() => {
    return displayedAssets.map((asset) => {
      const historyState = getStateBySymbol(asset.symbol);
      return convertGroupedAssetToDashboardAsset(asset, {
        status: historyState.status,
        trend: historyState.trend,
        change7d: historyState.change7d,
      }, getPriceState);
    });
  }, [displayedAssets, getStateBySymbol, getPriceState]);

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
    // TODO: 实现真实的 24h 变化计算
    // 需要：
    // 1. 获取 24h 前的价格数据
    // 2. 计算每个资产的价值变化
    // 3. 加权平均得出总变化

    return {
      totalChange24h: 0,
      totalChangePercent: 0,
    };
  }, []);

  const gasPrice = useMemo(() => {
    if (isGasPriceLoading) {
      return undefined;
    }
    if (gasPriceError) {
      return "N/A";
    }
    if (gasPriceValue === null) {
      return undefined;
    }
    return `${formatGasPriceGwei(gasPriceValue)} Gwei`;
  }, [gasPriceError, gasPriceValue, isGasPriceLoading]);

  return {
    totalNetWorth,
    totalChange24h,
    totalChangePercent,
    assets,
    chains,
    selectedChain,
    isLoading,
    setSelectedChain,
    showTestnets,
    setShowTestnets,
    filteredAssets,
    refetch,
    gasPrice,
  };
}
