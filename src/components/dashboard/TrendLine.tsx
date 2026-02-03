"use client";

import React from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";

const SPARKLINE_HEIGHT = 40;
const SPARKLINE_WIDTH = 100;

/** 绿色：上涨 #16a34a */
const STROKE_UP = "#16a34a";
/** 红色：下跌 #dc2626 */
const STROKE_DOWN = "#dc2626";

export type PriceHistoryStatus = 'loading' | 'success' | 'failed';

export interface TrendLineProps {
  /** 7 天价格数组，顺序为 [7d ago, ..., today] */
  data: number[];
  /** 可选：强制涨跌色，不传则根据 data[last] >= data[0] 自动判断 */
  isPositive?: boolean;
  className?: string;
  /** 获取状态：loading = 加载中，success = 成功，failed = 失败 */
  status: PriceHistoryStatus;
}

/**
 * 失败状态组件 - 更明显的视觉提示
 */
function FailedState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md bg-muted/40 border border-dashed border-muted-foreground/20",
        className
      )}
      style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
      title="价格走势获取失败"
    >
      <Minus className="h-4 w-4 text-muted-foreground/40" />
      <span className="text-[9px] text-muted-foreground/50 mt-0.5">暂无数据</span>
    </div>
  );
}

/**
 * 加载状态组件
 */
function LoadingState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded bg-muted/30",
        className
      )}
      style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
    >
      <div className="h-4 w-4 animate-pulse rounded-full bg-muted-foreground/20" />
    </div>
  );
}

/**
 * 微型折线图 (Sparkline) - 7d Trend
 * 极简：无坐标轴、网格、Tooltip、Legend；线条 2px、无点、monotone 平滑
 */
export function TrendLine({ data, isPositive, className, status }: TrendLineProps) {
  // 加载中
  if (status === 'loading') {
    return <LoadingState className={className} />;
  }

  // 获取失败
  if (status === 'failed') {
    return <FailedState className={className} />;
  }

  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded bg-muted/50",
          className
        )}
        style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
        aria-hidden
      >
        <svg
          width="60%"
          height="24"
          viewBox="0 0 60 24"
          fill="none"
          className="text-muted-foreground/60"
        >
          <path
            d="M0 12 Q15 4 30 12 T60 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  const last = data.length - 1;
  const autoPositive = data[last] >= data[0];
  const up = isPositive !== undefined ? isPositive : autoPositive;
  const strokeColor = up ? STROKE_UP : STROKE_DOWN;

  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div
      className={cn("overflow-hidden rounded", className)}
      style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
      aria-hidden
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
        >
          <YAxis type="number" domain={["auto", "auto"]} hide width={0} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 价格变化指示器组件
 */
export interface PriceChangeIndicatorProps {
  change: number;
}

export function PriceChangeIndicator({ change }: PriceChangeIndicatorProps) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <span
      className={cn(
        "font-inter text-sm font-semibold tabular-nums",
        isPositive && "text-emerald-600 dark:text-emerald-400",
        !isPositive && !isNeutral && "text-red-600 dark:text-red-400",
        isNeutral && "text-muted-foreground"
      )}
    >
      {isPositive ? "+" : ""}
      {change.toFixed(2)}%
    </span>
  );
}
