"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { dashboardConfig } from "@/config/dashboard.config";
import { getNativeTokenLogo } from "@/utils/network";
import { useAggregatedPortfolio } from "./useAggregatedPortfolio";
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
  chains: string[]; // 链 ID 数组，例如 ['1', '42161', '10']
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
};

/**
 * Dashboard 状态返回类型
 */
export type UseDashboardStateReturn = DashboardState & {
  setSelectedChain: (chainId: string) => void;
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

const CHAINS = buildChainsFromConfig();

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
    priceChange24h: 0, // TODO: 需要从价格服务获取 24h 变化
    balance: parseFloat(groupedAsset.totalBalance) || 0,
    value: groupedAsset.totalValue,
    chains: groupedAsset.chains.map((chainId) => String(chainId)),
  };
}

/**
 * 自定义钩子：Dashboard 状态管理
 * 
 * 数据流：
 * 1. 从 wagmi 获取钱包连接状态和地址
 * 2. 使用 useAggregatedPortfolio 获取聚合后的资产数据
 * 3. 转换数据格式以适配 Dashboard UI
 * 4. 提供链筛选功能
 * 
 * @returns Dashboard 状态和操作函数
 */
export function useDashboardState(): UseDashboardStateReturn {
  const [selectedChain, setSelectedChain] = useState<string>("all");
  
  // 获取钱包连接状态
  const { address, isConnected } = useAccount();

  // 获取聚合的资产数据
  const {
    aggregatedData,
    totalValue,
    isLoading,
    refetch,
  } = useAggregatedPortfolio(address, isConnected);

  // 转换为 Dashboard 资产格式
  const assets: DashboardAsset[] = useMemo(() => {
    return aggregatedData.map(convertGroupedAssetToDashboardAsset);
  }, [aggregatedData]);

  // 根据选中的链筛选资产
  const filteredAssets = useMemo(() => {
    if (selectedChain === "all") {
      return assets;
    }
    return assets.filter((asset) => asset.chains.includes(selectedChain));
  }, [selectedChain, assets]);

  // 计算总资产价值（基于筛选后的资产）
  const totalNetWorth = useMemo(() => {
    if (selectedChain === "all") {
      return totalValue;
    }
    return filteredAssets.reduce((sum, asset) => sum + asset.value, 0);
  }, [selectedChain, totalValue, filteredAssets]);

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
    chains: CHAINS,
    selectedChain,
    isLoading,
    setSelectedChain,
    filteredAssets,
    refetch,
    gasPrice,
  };
}
