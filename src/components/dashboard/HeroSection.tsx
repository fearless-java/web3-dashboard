"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Fuel } from "lucide-react";
import { GasWidget } from "@/components/dashboard/GasWidget";

/**
 * HeroSection 组件 Props
 */
interface HeroSectionProps {
  /** 总资产净值 */
  totalNetWorth: number;
  /** 24小时变化金额 */
  totalChange24h: number;
  /** 24小时变化百分比 */
  totalChangePercent: number;
  /** Gas 价格（例如："15 Gwei"） */
  gasPrice?: string;
  /** 用户历史 Gas 消耗（ETH 字符串，来自 Etherscan） */
  totalGasSpent?: string;
  /** Gas 消耗是否加载中 */
  isGasSpentLoading?: boolean;
  /** 是否加载中 */
  isLoading?: boolean;
}

/**
 * 格式化货币显示
 */
function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * HeroStats 组件 - 右侧统计信息
 * 包含：24h PnL、当前 Gas 价格、历史 Gas 消耗（Gas Burned）
 */
function HeroStats({
  pnlAmount,
  pnlPercent,
  gasPrice,
  totalGasSpent,
  isGasSpentLoading,
}: {
  pnlAmount: number;
  pnlPercent: number;
  gasPrice: string;
  totalGasSpent?: string;
  isGasSpentLoading?: boolean;
}) {
  const isPositive = pnlAmount >= 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* PnL Pill */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
          isPositive
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
        )}
      >
        <span className="font-inter tabular-nums">
          {isPositive ? "+" : ""}
          {formatCurrency(pnlAmount)}
        </span>
        <span className="font-inter tabular-nums">
          ({isPositive ? "+" : ""}
          {pnlPercent.toFixed(2)}%)
        </span>
      </div>

      {/* Gas 价格（当前网络） */}
      {gasPrice && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Fuel className="h-4 w-4" />
          <span className="font-inter text-sm tabular-nums">{gasPrice}</span>
        </div>
      )}

      {/* Gas 消耗统计（仅连接钱包时显示） */}
      {totalGasSpent !== undefined && (
        <GasWidget
          totalGasSpent={totalGasSpent}
          isLoading={isGasSpentLoading}
        />
      )}
    </div>
  );
}

/**
 * HeroSection 组件
 * 显示用户总资产净值和24小时变化
 * 
 * 架构：纯展示组件（Dumb Component）
 * - 所有数据通过 props 传入
 * - 无数据获取逻辑
 * - 无业务逻辑
 * 
 * 布局：flex justify-between，左侧总资产，右侧统计信息
 * 背景：极淡渐变效果
 */
export function HeroSection({
  totalNetWorth,
  totalChange24h,
  totalChangePercent,
  gasPrice,
  totalGasSpent,
  isGasSpentLoading,
  isLoading,
}: HeroSectionProps) {
  const isPositive = totalChangePercent >= 0;

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-background via-muted/30 to-background py-8">
        <div className="flex items-end justify-between">
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-12 w-64 animate-pulse rounded bg-muted" />
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-4">
            <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-background via-muted/30 to-background py-8 px-6">
      <div className="flex items-end justify-between">
        {/* 左侧：总资产信息 */}
        <div className="flex-1">
          {/* 标题 */}
          <p className="font-inter text-sm font-medium text-muted-foreground">
            Total Net Worth
          </p>

          {/* 总资产 - 使用 Space Grotesk 字体 */}
          <h1 className="font-space mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {formatCurrency(totalNetWorth)}
          </h1>

          {/* 24小时变化 */}
          <div className="mt-3 flex items-center gap-2">
            {/* 变化图标 */}
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full",
                isPositive
                  ? "bg-emerald-500/10 dark:bg-emerald-500/20"
                  : "bg-red-500/10 dark:bg-red-500/20"
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              )}
            </div>

            {/* 变化金额 */}
            <span
              className={cn(
                "font-inter tabular-nums text-sm font-medium",
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {formatCurrency(totalChange24h)}
            </span>

            {/* 变化百分比 */}
            <span
              className={cn(
                "font-inter tabular-nums rounded-md px-2 py-0.5 text-xs font-semibold",
                isPositive
                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {totalChangePercent.toFixed(2)}%
            </span>

            {/* 时间周期标签 */}
            <span className="font-inter text-xs text-muted-foreground">24h</span>
          </div>
        </div>

        {/* 右侧：统计信息 - PnL / Gas 价格 / Gas 消耗（有任一项或已连接时显示） */}
        {(totalChange24h !== 0 ||
          totalChangePercent !== 0 ||
          gasPrice ||
          totalGasSpent != null) && (
          <div className="hidden lg:flex lg:items-center">
            <HeroStats
              pnlAmount={totalChange24h}
              pnlPercent={totalChangePercent}
              gasPrice={gasPrice || ""}
              totalGasSpent={totalGasSpent}
              isGasSpentLoading={isGasSpentLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
