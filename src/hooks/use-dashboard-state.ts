"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { dashboardConfig } from "@/config/dashboard.config";
import { getNativeTokenLogo } from "@/utils/network";
import { isTestnetChain } from "@/utils/asset-utils";
import { useAggregatedPortfolio } from "./useAggregatedPortfolio";
import { useChainAssets } from "./use-chain-assets";
import type { GroupedAsset } from "@/types/assets";

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
  balance: number;
  value: number;
  chains: string[];
  isTestnet?: boolean;
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
  isLoading: boolean;
  showTestnets: boolean;
};

/**
 * Dashboard 状态返回类型
 */
export type UseDashboardStateReturn = DashboardState & {
  setSelectedChain: (chainId: string) => void;
  showTestnets: boolean;
  setShowTestnets: (value: boolean) => void;
  filteredAssets: DashboardAsset[];
  refetch: () => void;
  gasPrice: string;
};

/**
 * 获取链的短名称
 * 使用链名称的缩写映射
 */
function getChainShortName(chainName: string): string {
  // 常见链名到缩写的映射
  const nameMap: Record<string, string> = {
    'Ethereum': 'ETH',
    'Arbitrum One': 'ARB',
    'Optimism': 'OP',
    'OP Mainnet': 'OP',
    'Base': 'BASE',
    'Polygon': 'POLY',
    'Sepolia': 'SEP',
    'BNB Smart Chain': 'BNB',
  };
  
  return nameMap[chainName] || chainName.slice(0, 4).toUpperCase();
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
 * 将 GroupedAsset 转换为 DashboardAsset
 */
function convertGroupedAssetToDashboardAsset(
  groupedAsset: GroupedAsset
): DashboardAsset {
  return {
    id: groupedAsset.symbol,
    symbol: groupedAsset.symbol,
    name: groupedAsset.name,
    logo: groupedAsset.logo ?? "",
    price: groupedAsset.averagePrice,
    priceChange24h: 0,
    balance: parseFloat(groupedAsset.totalBalance) || 0,
    value: groupedAsset.totalValue,
    chains: groupedAsset.chains.map((chainId) => String(chainId)),
    isTestnet: groupedAsset.isTestnet,
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
  overrideAddress?: string | undefined
): UseDashboardStateReturn {
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [showTestnets, setShowTestnets] = useState<boolean>(false);

  const { address: walletAddress, isConnected } = useAccount();
  const effectiveAddress = overrideAddress ?? walletAddress ?? undefined;
  const effectiveConnected = overrideAddress ? true : isConnected;

  const {
    aggregatedData,
    isLoading,
    refetch,
  } = useAggregatedPortfolio(effectiveAddress, effectiveConnected, showTestnets);

  // 单链资产筛选：一次拉取、前端筛选，无额外请求
  const { displayedAssets, chainNetWorth } = useChainAssets(
    aggregatedData,
    selectedChain
  );

  // 全部资产（Dashboard 格式，供链筛选等使用）
  const assets: DashboardAsset[] = useMemo(() => {
    return aggregatedData.map(convertGroupedAssetToDashboardAsset);
  }, [aggregatedData]);

  // 当前展示的资产（经 useChainAssets 筛选/拆包后转 Dashboard 格式）
  const filteredAssets = useMemo(() => {
    return displayedAssets.map(convertGroupedAssetToDashboardAsset);
  }, [displayedAssets]);

  const totalNetWorth = chainNetWorth;

  // 链列表：关闭「显示测试网」时隐藏测试网选项
  const chains = useMemo(() => {
    if (showTestnets) return ALL_CHAINS;
    return ALL_CHAINS.filter(
      (c) => c.id === "all" || !isTestnetChain(c.chainId)
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

  // Gas 价格（TODO: 接入真实 Gas 价格 API）
  // 未来可以创建 useGasPrice hook 从 Etherscan/Alchemy 获取
  const gasPrice = "15 Gwei";

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
