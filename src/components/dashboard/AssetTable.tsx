"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TrendLine } from "@/components/dashboard/TrendLine";
import { ChevronUp } from "lucide-react";
import type { DashboardAsset, ChainInfo } from "@/hooks/use-dashboard-state";

/** 为单个资产生成 7 天 mock 价格（用于 7d Trend 预览，后端未提供历史数据时；同 assetId 同会话内稳定） */
function getMockTrendData(assetId: string): number[] {
  let seed = 0;
  for (let i = 0; i < assetId.length; i++) seed += assetId.charCodeAt(i);
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: 7 }, () => rng() * 100);
}

/**
 * AssetTable 组件 Props
 */
interface AssetTableProps {
  /** 资产列表 */
  assets: DashboardAsset[];
  /** 链信息映射（用于显示 Networks 列） */
  chains: ChainInfo[];
  /** 是否加载中 */
  isLoading?: boolean;
}

/**
 * 格式化价格显示
 */
function formatPrice(price: number): string {
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
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 格式化余额显示
 */
function formatBalance(balance: number): string {
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
 * 网络图标集群组件 - 使用 Avatar 组件
 * 显示资产所在的多个链的迷你图标
 */
function NetworkIcons({
  chainIds,
  chains,
}: {
  chainIds: string[];
  chains: ChainInfo[];
}) {
  // 获取链信息映射
  const chainMap = new Map(chains.map((c) => [c.id, c]));

  // 最多显示 4 个图标，超出显示 +N
  const visibleChains = chainIds.slice(0, 4);
  const remainingCount = chainIds.length - 4;

  return (
    <div className="flex items-center -space-x-2">
      {visibleChains.map((chainId) => {
        const chain = chainMap.get(chainId);
        if (!chain || chain.id === "all") return null;

        return (
          <Avatar
            key={chainId}
            size="sm"
            className="h-6 w-6 border-2 border-background"
            title={chain.name}
          >
            {chain.logo ? (
              <AvatarImage src={chain.logo} alt={chain.name} />
            ) : (
              <AvatarFallback
                className="text-[10px] font-bold"
                style={{ backgroundColor: `${chain.color}20`, color: chain.color }}
              >
                {chain.shortName.slice(0, 2)}
              </AvatarFallback>
            )}
          </Avatar>
        );
      })}

      {remainingCount > 0 && (
        <Avatar size="sm" className="h-6 w-6 border-2 border-background">
          <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

/**
 * 价格变化指示器
 */
function PriceChangeIndicator({ change }: { change: number }) {
  const isPositive = change >= 0;

  return (
    <span
      className={cn(
        "font-inter text-sm font-semibold tabular-nums",
        isPositive 
          ? "text-emerald-600 dark:text-emerald-400" 
          : "text-red-600 dark:text-red-400"
      )}
    >
      {isPositive ? "+" : ""}
      {change.toFixed(2)}%
    </span>
  );
}

/**
 * 资产表格组件 - CoinGecko 极简风格
 * 显示用户资产列表，包含 Asset、Price、Balance、Value、Networks 列
 * 
 * 极简化改进：
 * - 移除外边框和圆角（开放式列表）
 * - 表头背景透明
 * - 只保留行分割线
 */
export function AssetTable({ assets, chains, isLoading }: AssetTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (assets.length === 0) {
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
            <TableHead className="w-10 text-center font-inter text-xs font-medium text-muted-foreground" aria-label="Rank">
              <span className="inline-flex items-center justify-center gap-0.5">
                <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>#</span>
              </span>
            </TableHead>
            <TableHead className="font-inter text-xs font-medium text-muted-foreground">Asset</TableHead>
            <TableHead className="hidden w-[100px] min-w-[100px] font-inter text-xs font-medium text-muted-foreground md:table-cell md:text-right">7d Trend</TableHead>
            <TableHead className="text-right font-inter text-xs font-medium text-muted-foreground">Price</TableHead>
            <TableHead className="text-right font-inter text-xs font-medium text-muted-foreground">Balance</TableHead>
            <TableHead className="text-right font-inter text-xs font-medium text-muted-foreground">Value</TableHead>
            <TableHead className="font-inter text-right text-xs font-medium text-muted-foreground">Networks</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset, index) => (
            <TableRow
              key={asset.id}
              className="border-b border-border/30 transition-colors hover:bg-muted/40"
            >
              {/* 排行榜 #：按当前列表顺序 1-based */}
              <TableCell className="w-10 py-3 text-center font-inter text-sm font-medium tabular-nums text-slate-600 dark:text-slate-400" aria-label={`Rank ${index + 1}`}>
                {index + 1}
              </TableCell>
              {/* Asset 列：图标 + 符号 + 名称 */}
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {asset.logo ? (
                      <AvatarImage src={asset.logo} alt={asset.name} />
                    ) : (
                      <AvatarFallback className="text-sm font-bold">
                        {asset.symbol.slice(0, 2)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-500 text-sm">{asset.symbol}</span>
                    <span className="font-bold text-slate-900">{asset.name}</span>
                  </div>
                </div>
              </TableCell>

              {/* 7d Trend - 移动端隐藏 */}
              <TableCell className="hidden w-[100px] min-w-[100px] align-middle md:table-cell md:text-right">
                <div className="flex justify-end">
                  <TrendLine data={getMockTrendData(asset.id)} />
                </div>
              </TableCell>

              {/* Price */}
              <TableCell className="text-right">
                <div className="flex flex-col items-end">
                  <span className="font-inter font-semibold tabular-nums text-foreground">
                    {formatPrice(asset.price)}
                  </span>
                  <PriceChangeIndicator change={asset.priceChange24h} />
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
              <TableCell className="text-right">
                <div className="flex justify-end">
                  <NetworkIcons chainIds={asset.chains} chains={chains} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
