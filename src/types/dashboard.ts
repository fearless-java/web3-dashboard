/**
 * Dashboard 相关类型定义
 * 统一真理来源 (Single Source of Truth)
 */

// 链信息
export type ChainInfo = {
  id: string;
  chainId: number;
  name: string;
  shortName: string;
  logo: string;
  color: string;
};

// 链资产分布信息
export type ChainDistributionInfo = ChainInfo & {
  /** 该链的资产价值（USD） */
  value: number;
  /** 占总额的百分比 */
  percentage: number;
};

// 历史价格状态
export type PriceHistoryStatus = "loading" | "success" | "failed" | "pending";

// 当前价格状态
export type CurrentPriceStatus = "loading" | "success" | "failed";

// 资产分类
export type AssetCategory = "top" | "small";

// Dashboard 资产类型
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
  /** 资产分类：top (>= $1) 或 small (< $1) */
  category: AssetCategory;
  /** 7天价格历史数据（用于趋势图表） */
  priceHistory7d?: number[];
  /** 历史价格获取状态 */
  priceHistoryStatus: PriceHistoryStatus;
  /** 当前价格获取状态 */
  priceStatus: CurrentPriceStatus;
};

// Dashboard 状态
export type DashboardState = {
  totalNetWorth: number;
  totalChange24h: number;
  totalChangePercent: number;
  /** Top Assets (价值 >= $1) - 完整数据 */
  topAssets: DashboardAsset[];
  /** Small Assets (价值 < $1) - 基础数据 */
  smallAssets: DashboardAsset[];
  /** 所有资产（合并） */
  assets: DashboardAsset[];
  chains: ChainInfo[];
  selectedChain: string;
  isLoading: boolean;
  showTestnets: boolean;
};

// Dashboard Hook 返回类型
export type UseDashboardStateReturn = DashboardState & {
  setSelectedChain: (chainId: string) => void;
  setShowTestnets: (value: boolean) => void;
  /** 筛选后的资产（用于链筛选） */
  filteredAssets: DashboardAsset[];
  /** Top Assets (价值 >= $1) */
  filteredTopAssets: DashboardAsset[];
  /** Small Assets (价值 < $1) */
  filteredSmallAssets: DashboardAsset[];
  refetch: () => void;
  gasPrice?: string;
  /** 小资产是否展开 */
  smallAssetsExpanded: boolean;
  /** 设置小资产展开状态 */
  setSmallAssetsExpanded: (expanded: boolean) => void;
  /** 价格数据统计 */
  priceStats?: {
    success: number;
    loading: number;
    failed: number;
  };
  /** 历史价格数据统计 */
  historyStats?: {
    success: number;
    loading: number;
    failed: number;
    pending: number;
  };
  /** 链资产分布（用于显示各链占比） */
  chainDistribution: ChainDistributionInfo[];
};
