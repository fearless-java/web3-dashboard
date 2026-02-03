"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendLine, PriceChangeIndicator } from "@/components/dashboard/TrendLine";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { DashboardAsset, ChainInfo } from "@/types";
import { BlurFade } from "@/components/magicui/blur-fade";

/**
 * Hook: 获取上一个渲染周期的值
 */
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

/**
 * 排名变化指示器组件
 */
function RankChangeIndicator({
  currentRank,
  previousRank,
}: {
  currentRank: number;
  previousRank: number | undefined;
}) {
  const rankChange = previousRank !== undefined ? previousRank - currentRank : 0;

  if (rankChange === 0) return null;

  const isUp = rankChange > 0;
  const changeText = isUp ? `↑${rankChange}` : `↓${Math.abs(rankChange)}`;

  return (
    <span
      className={`ml-1 inline-flex items-center px-1.5 py-0.5 text-xs font-medium tabular-nums animate-in fade-in slide-in-from-right-2 ${
        isUp
          ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30"
          : "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30"
      }`}
    >
      {changeText}
    </span>
  );
}

/**
 * AssetTable 组件 Props
 */
interface AssetTableProps {
  /** Top Assets (价值 >= $1) - 完整数据 */
  topAssets: DashboardAsset[];
  /** Small Assets (价值 < $1) - 基础数据 */
  smallAssets: DashboardAsset[];
  /** 链信息映射 */
  chains: ChainInfo[];
  /** 主数据是否加载中 */
  isLoading?: boolean;
  /** 小资产展开状态 */
  smallAssetsExpanded?: boolean;
  /** 设置小资产展开状态 */
  setSmallAssetsExpanded?: (expanded: boolean) => void;
  /** 价格状态统计（可选） */
  priceStats?: {
    success: number;
    loading: number;
    failed: number;
  };
  /** 价格历史状态统计（可选） */
  historyStats?: {
    success: number;
    loading: number;
    failed: number;
    pending: number;
  };
}

/**
 * 格式化价格显示
 */
function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || price <= 0) {
    return "暂无价格";
  }

  if (price < 0.0001) {
    return `$${price.toExponential(4)}`;
  }

  if (price >= 1000000000) {
    return `$${price.toExponential(2)}`;
  }

  if (price >= 1000) {
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }

  return `$${price.toFixed(4)}`;
}

/**
 * 格式化价值显示
 */
function formatValue(value: number): string {
  if (value <= 0) {
    return "$0.00";
  }

  if (value < 0.01) {
    return "<$0.01";
  }

  if (value >= 1000000000) {
    return `$${value.toExponential(2)}`;
  }

  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 格式化余额显示
 */
function formatBalance(balance: number): string {
  if (balance <= 0) {
    return "0";
  }

  if (balance < 0.000001) {
    return balance.toExponential(4);
  }

  if (balance >= 1000000) {
    return `${(balance / 1000000).toFixed(2)}M`;
  }

  if (balance >= 1000) {
    return `${balance.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (balance >= 1) {
    return balance.toFixed(4);
  }

  return balance.toFixed(6);
}

/**
 * 网络图标集群组件
 * 图标重叠显示，整体居中对齐，无边框
 */
function NetworkIcons({
  chainIds,
  chains,
}: {
  chainIds: string[];
  chains: ChainInfo[];
}) {
  const chainMap = new Map(chains.map((c) => [c.id, c]));
  const visibleChains = chainIds.slice(0, 4);
  const remainingCount = chainIds.length - 4;

  // 计算容器宽度：第一个图标完整宽度，后续每个图标重叠后只增加部分宽度
  const overlapOffset = 14; // 重叠偏移量（px）
  const containerWidth = 24 + (visibleChains.length - 1) * overlapOffset + (remainingCount > 0 ? overlapOffset : 0);

  return (
    <div 
      className="relative inline-flex items-center justify-center align-middle"
      style={{ width: Math.max(containerWidth, 24), height: 24 }}
    >
      {visibleChains.map((chainId, index) => {
        const chain = chainMap.get(chainId);
        if (!chain || chain.id === "all") return null;

        return (
          <div
            key={chainId}
            className="absolute h-6 w-6 overflow-hidden rounded-full"
            style={{ left: index * overlapOffset, zIndex: visibleChains.length - index }}
            title={chain.name}
          >
            <ChainLogo chain={chain} />
          </div>
        );
      })}

      {remainingCount > 0 && (
        <div 
          className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
          style={{ left: visibleChains.length * overlapOffset }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

function ChainLogo({ chain }: { chain: ChainInfo }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
      {chain.logo && !imageError ? (
        <img
          src={chain.logo}
          alt={chain.name}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <img
          src="/chain-fallback.svg"
          alt="Chain"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      {imageError && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[8px] font-bold"
          style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
        >
          {chain.shortName.slice(0, 2)}
        </span>
      )}
    </div>
  );
}

/**
 * 单个资产行组件
 * @param asset - 资产数据
 * @param index - 当前排名
 * @param chains - 链信息列表
 * @param showChart - 是否显示趋势图（Small Assets 默认不显示）
 * @param previousIndex - 上一轮排名
 */
function AssetRow({
  asset,
  index,
  chains,
  showChart = true,
  previousIndex,
}: {
  asset: DashboardAsset;
  index: number;
  chains: ChainInfo[];
  showChart?: boolean;
  previousIndex?: number;
}) {
  const rankChange = previousIndex !== undefined ? previousIndex - index : 0;
  const [imageError, setImageError] = useState(false);

  return (
    <BlurFade
      as="tr"
      key={asset.id}
      delay={0.05 * index}
      className="border-b border-border/30 transition-colors hover:bg-muted/40"
      inView
    >
      {/* 排名 */}
      <TableCell className="w-10 py-3 text-center font-inter text-sm font-medium tabular-nums text-slate-600 dark:text-slate-400">
        <span className="relative">
          <span className={rankChange !== 0 ? "opacity-50" : ""}>{index + 1}</span>
          <RankChangeIndicator currentRank={index + 1} previousRank={previousIndex ? previousIndex + 1 : undefined} />
        </span>
      </TableCell>

      {/* Asset 列 */}
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
            {asset.logo && !imageError ? (
              <img
                src={asset.logo}
                alt={asset.name}
                className="h-full w-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : null}
            {(!asset.logo || asset.logo === '' || imageError) && (
              <img
                src="/token-fallback.svg"
                alt="Token"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-slate-500 text-sm">{asset.symbol}</span>
            <span className="font-bold text-slate-900">{asset.name}</span>
          </div>
        </div>
      </TableCell>

      {/* 7d Trend - Top Assets 显示，Small Assets 不显示 */}
      <TableCell className="hidden w-[100px] min-w-[100px] align-middle md:table-cell md:text-right">
        <div className="flex justify-end">
          {showChart ? (
            <TrendLine
              data={asset.priceHistory7d ?? []}
              status={asset.priceHistoryStatus}
            />
          ) : (
            <div className="h-8 w-[100px]" />
          )}
        </div>
      </TableCell>

      {/* Price */}
      <TableCell className="text-right">
        <div className="flex flex-col items-end">
          {asset.priceStatus === 'loading' ? (
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ) : asset.priceStatus === 'failed' || (asset.priceStatus === 'success' && (!asset.price || asset.price <= 0)) ? (
            <span className="font-inter font-semibold tabular-nums text-muted-foreground/60">
              暂无价格
            </span>
          ) : (
            <span className="font-inter font-semibold tabular-nums text-foreground">
              {formatPrice(asset.price)}
            </span>
          )}
          {/* 7天变化百分比 - Top Assets 显示，Small Assets 不显示 */}
          {showChart ? (
            <PriceChangeIndicator
              change={asset.priceChange7d}
              status={asset.priceHistoryStatus === 'pending' ? undefined : asset.priceHistoryStatus}
            />
          ) : (
            <span className="text-sm text-muted-foreground/50">—</span>
          )}
        </div>
      </TableCell>

      {/* Balance */}
      <TableCell className="text-right font-inter font-semibold tabular-nums text-foreground">
        {formatBalance(asset.balance)}
      </TableCell>

      {/* Value */}
      <TableCell className="text-right font-inter font-semibold tabular-nums text-foreground">
        {formatValue(asset.value)}
      </TableCell>

      {/* Networks 列 */}
      <TableCell className="text-center">
        <NetworkIcons chainIds={asset.chains} chains={chains} />
      </TableCell>
    </BlurFade>
  );
}

/**
 * 资产表格组件 - 分层加载优化版
 *
 * 核心策略：
 * 1. Top Assets (>= $1): 完整渲染，包括趋势图和价格变化
 * 2. Small Assets (< $1): 默认折叠，展开后渲染但不显示趋势图
 */
export function AssetTable({
  topAssets,
  smallAssets,
  chains,
  isLoading,
  smallAssetsExpanded,
  setSmallAssetsExpanded,
  priceStats,
  historyStats,
}: AssetTableProps) {
  // Hooks must be called before any early returns
  // 计算小资产总价值
  const smallAssetsTotal = useMemo(() => {
    return smallAssets.reduce((sum, a) => sum + (a.value ?? 0), 0);
  }, [smallAssets]);

  // 追踪上一轮的资产列表，用于计算排名变化
  const previousTopAssets = usePrevious(topAssets);
  const previousTopIndexMap = useMemo(() => {
    if (!previousTopAssets) return new Map<string, number>();
    return new Map(
      previousTopAssets.map((asset, index) => [asset.symbol, index])
    );
  }, [previousTopAssets]);

  // 内部展开状态（如果外部没有控制）
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = smallAssetsExpanded !== undefined ? smallAssetsExpanded : internalExpanded;
  const setIsExpanded = setSmallAssetsExpanded || setInternalExpanded;

  // Early returns after all hooks are called
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalAssets = topAssets.length + smallAssets.length;
  if (totalAssets === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
        <p className="text-base font-medium">No assets found</p>
        <p className="text-sm">Connect your wallet to view your portfolio</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/50 hover:bg-transparent">
            <TableHead className="w-10 text-center font-inter text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center justify-center gap-0.5">
                <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                <span>#</span>
              </span>
            </TableHead>
            <TableHead className="font-inter text-xs font-medium text-muted-foreground">Asset</TableHead>
            <TableHead className="hidden w-[100px] min-w-[100px] font-inter text-xs font-medium text-muted-foreground md:table-cell md:text-right" title="最近7天的价格走势图">7d Trend</TableHead>
            <TableHead className="text-right font-inter text-xs font-medium text-muted-foreground" title="当前市场价格">Price</TableHead>
            <TableHead className="text-right font-inter text-xs font-medium text-muted-foreground">Balance</TableHead>
            <TableHead className="text-right font-inter text-xs font-medium text-muted-foreground">Value</TableHead>
            <TableHead className="font-inter text-center text-xs font-medium text-muted-foreground">Networks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Top Assets - 完整渲染（包括趋势图） */}
          {topAssets.map((asset, index) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              index={index}
              chains={chains}
              showChart={true}
              previousIndex={previousTopIndexMap.get(asset.symbol)}
            />
          ))}

          {/* 小资产折叠按钮 */}
          {smallAssets.length > 0 && !isExpanded && (
            <TableRow>
              <TableCell colSpan={7} className="py-2">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="flex w-full items-center justify-center gap-2 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground rounded-md"
                >
                  <ChevronDown className="h-4 w-4" />
                  View {smallAssets.length} small asset{smallAssets.length !== 1 ? 's' : ''} ({formatValue(smallAssetsTotal)})
                </button>
              </TableCell>
            </TableRow>
          )}

          {/* 展开后的小资产 - 不渲染图表 */}
          {isExpanded && smallAssets.map((asset, index) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              index={topAssets.length + index}
              chains={chains}
              showChart={false}
              previousIndex={undefined}
            />
          ))}

          {/* 小资产折叠按钮 */}
          {isExpanded && smallAssets.length > 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-2">
                <button
                  onClick={() => setIsExpanded(false)}
                  className="flex w-full items-center justify-center gap-2 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground rounded-md"
                >
                  <ChevronUp className="h-4 w-4" />
                  Hide {smallAssets.length} small asset{smallAssets.length !== 1 ? 's' : ''}
                </button>
              </TableCell>
            </TableRow>
          )}

          {/* 数据加载状态栏 */}
          {(priceStats || historyStats) && (
            <TableRow className="border-t border-border/50 bg-muted/30">
              <TableCell colSpan={7} className="py-2 px-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                  {/* 价格状态 */}
                  {priceStats && (
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">价格数据:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-muted-foreground">成功 {priceStats.success}</span>
                      </span>
                      {priceStats.loading > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          <span className="text-muted-foreground">加载中 {priceStats.loading}</span>
                        </span>
                      )}
                      {priceStats.failed > 0 && (
                        <span className="flex items-center gap-1" title="部分代币可能不支持价格查询">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="text-amber-700 dark:text-amber-500">失败 {priceStats.failed}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* 历史价格状态 */}
                  {historyStats && (
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">走势数据:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-muted-foreground">成功 {historyStats.success}</span>
                      </span>
                      {historyStats.loading > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          <span className="text-muted-foreground">加载中 {historyStats.loading}</span>
                        </span>
                      )}
                      {historyStats.failed > 0 && (
                        <span className="flex items-center gap-1" title="部分代币可能不支持历史价格查询">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="text-amber-700 dark:text-amber-500">失败 {historyStats.failed}</span>
                        </span>
                      )}
                      {historyStats.pending > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground/30"></span>
                          <span className="text-muted-foreground/60">待加载 {historyStats.pending}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
