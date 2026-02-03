"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ChainInfo } from "@/types";

/**
 * 链资产信息（扩展 ChainInfo）
 */
interface ChainAssetInfo extends ChainInfo {
  /** 该链的资产价值（USD） */
  value: number;
  /** 占总额的百分比 */
  percentage: number;
}

/**
 * ChainDistribution 组件 Props
 */
interface ChainDistributionProps {
  /** 链资产列表（已按价值排序） */
  chains: ChainAssetInfo[];
  /** 总资产价值 */
  totalValue: number;
  /** 是否加载中 */
  isLoading?: boolean;
}

/**
 * 格式化货币显示
 */
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

/**
 * 格式化百分比显示
 */
function formatPercentage(value: number): string {
  if (value < 0.01) return "<0.01%";
  if (value < 1) return `${value.toFixed(2)}%`;
  return `${Math.round(value)}%`;
}

/**
 * 链资产卡片组件
 */
function ChainCard({ chain, index }: { chain: ChainAssetInfo; index: number }) {
  const isTop3 = index < 3;

  return (
    <div className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/50">
      {/* 链图标 */}
      <Avatar className="h-10 w-10 shrink-0 rounded-lg">
        {chain.logo ? (
          <AvatarImage
            src={chain.logo}
            alt={chain.name}
            className="rounded-lg object-cover"
          />
        ) : (
          <AvatarFallback
            className="rounded-lg text-sm font-bold"
            style={{
              backgroundColor: `${chain.color}20`,
              color: chain.color,
            }}
          >
            {chain.shortName.slice(0, 2)}
          </AvatarFallback>
        )}
      </Avatar>

      {/* 链名称和资产价值 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">
            {chain.name}
          </span>
          {isTop3 && chain.value > 1000000 && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="rounded-lg border border-border/50 bg-popover px-3 py-1.5 text-xs"
                >
                  <p>Top chain by value</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-space text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(chain.value)}
          </span>
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              chain.percentage >= 10
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            {formatPercentage(chain.percentage)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 加载状态骨架屏
 */
function ChainDistributionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="flex items-baseline gap-2">
              <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-8 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 链资产分布组件
 * 显示每个链的资产价值和占总额的比例（DeBank 风格）
 */
export function ChainDistribution({
  chains,
  totalValue,
  isLoading,
}: ChainDistributionProps) {
  if (isLoading) {
    return <ChainDistributionSkeleton />;
  }

  // 过滤掉价值为0的链，并按价值排序
  const activeChains = chains
    .filter((chain) => chain.value > 0)
    .sort((a, b) => b.value - a.value);

  if (activeChains.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {activeChains.map((chain, index) => (
          <ChainCard key={chain.id} chain={chain} index={index} />
        ))}
      </div>
    </div>
  );
}
