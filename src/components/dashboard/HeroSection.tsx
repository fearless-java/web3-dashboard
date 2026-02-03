"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Fuel } from "lucide-react";
import { GasWidget } from "@/components/dashboard/GasWidget";
import { NumberTicker } from "@/components/magicui/number-ticker";

/**
 * HeroSection 组件 Props
 */
interface HeroSectionProps {
  /** 总资产净值 */
  totalNetWorth: number;
  /** 24小时变化金额 (Deprecated) */
  totalChange24h: number;
  /** 24小时变化百分比 (Deprecated) */
  totalChangePercent: number;
  /** Gas 价格（例如："0.0000032 ETH"） */
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
 * 包含：当前 Gas 价格、历史 Gas 消耗（Gas Burned）
 */
function HeroStats({
  gasPrice,
  totalGasSpent,
  isGasSpentLoading,
}: {
  gasPrice: string;
  totalGasSpent?: string;
  isGasSpentLoading?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
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
            <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-background via-muted/30 to-background py-8 px-6">
      <div className="relative z-10 flex items-end justify-between">
        {/* 左侧：总资产信息 */}
        <div className="flex-1">
          {/* 标题 */}
          <p className="font-inter text-sm font-medium text-muted-foreground">
            Total Net Worth
          </p>

          {/* 总资产 - 使用 Space Grotesk 字体 */}
          <div className="font-space mt-2 flex items-baseline text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            <span>$</span>
            <NumberTicker
              value={totalNetWorth}
              decimalPlaces={2}
              className="font-space text-foreground"
            />
          </div>
        </div>

        {/* 右侧：统计信息 - PnL / Gas 价格 / Gas 消耗（有任一项或已连接时显示） */}
        {(totalChange24h !== 0 ||
          totalChangePercent !== 0 ||
          gasPrice ||
          totalGasSpent != null) && (
          <div className="hidden lg:flex lg:items-center">
            <HeroStats
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
