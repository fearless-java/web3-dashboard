"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Minus, AlertCircle, RefreshCw } from "lucide-react";

const SPARKLINE_HEIGHT = 32;
const SPARKLINE_WIDTH = 100;
const PADDING = 2;

/** 绿色：上涨 #16a34a */
const STROKE_UP = "#16a34a";
/** 红色：下跌 #dc2626 */
const STROKE_DOWN = "#dc2626";

export type PriceHistoryStatus = 'loading' | 'success' | 'failed' | 'pending';

// 状态文本映射
const STATUS_TEXT = {
  loading: '正在获取走势...',
  success: '7天价格走势',
  failed: '走势获取失败',
  pending: '待加载',
};

const STATUS_TITLES = {
  loading: '正在从服务器获取7天价格走势数据',
  success: '显示最近7天的价格走势',
  failed: '无法获取价格走势数据，可能该代币不支持历史数据查询',
  pending: '该资产的历史价格数据将在需要时加载',
};

export interface TrendLineProps {
  /** 7 天价格数组，顺序为 [7d ago, ..., today] */
  data: number[];
  /** 可选：强制涨跌色，不传则根据 data[last] >= data[0] 自动判断 */
  isPositive?: boolean;
  className?: string;
  /** 获取状态：loading = 加载中，success = 成功，failed = 失败，pending = 待加载 */
  status: PriceHistoryStatus;
}

/**
 * 失败状态组件 - 增强提示，让用户明确知道请求失败
 */
function FailedState({ className }: { className?: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-md bg-muted/40 border border-dashed border-muted-foreground/30 cursor-help transition-all hover:border-amber-500/50 hover:bg-amber-50/30 dark:hover:bg-amber-950/20",
        className
      )}
      style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
      title={STATUS_TITLES.failed}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AlertCircle className="h-3.5 w-3.5 text-amber-600/70 dark:text-amber-500/70" />
      <span className="text-[8px] text-amber-700/60 dark:text-amber-500/60 mt-0.5 font-medium">无走势</span>

      {/* 悬停时显示的详细提示 */}
      {isHovered && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 rounded-lg bg-popover border border-border shadow-lg z-50 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">价格走势获取失败</span>
            <br />
            该代币可能不支持历史数据查询
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border" />
        </div>
      )}
    </div>
  );
}

/**
 * 加载状态组件 - 显示加载动画和提示
 */
function LoadingState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded bg-muted/30 relative group cursor-help",
        className
      )}
      style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
      title={STATUS_TITLES.loading}
    >
      {/* 脉冲圆圈 */}
      <div className="h-3 w-3 animate-pulse rounded-full bg-primary/50" />
      <div className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-primary/20" />

      {/* 悬停提示 */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-popover border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        <p className="text-xs text-muted-foreground">正在加载走势...</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border" />
      </div>
    </div>
  );
}

/**
 * 待加载状态（Small Assets 未展开时显示）
 */
function PendingState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded group cursor-help",
        className
      )}
      style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
      title={STATUS_TITLES.pending}
    >
      <span className="text-[10px] text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors">
 —
      </span>
      {/* 悬停提示 */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-popover border border-border shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        <p className="text-xs text-muted-foreground">展开后加载走势</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border" />
      </div>
    </div>
  );
}

/**
 * 纯 SVG 轻量级趋势线组件
 * 不依赖 Recharts，渲染性能更高
 */
function SVGTrendLine({
  data,
  isPositive,
  width,
  height,
}: {
  data: number[];
  isPositive: boolean;
  width: number;
  height: number;
}) {
  const strokeColor = isPositive ? STROKE_UP : STROKE_DOWN;

  // 计算 SVG 路径
  const pathData = useMemo(() => {
    if (data.length < 2) return "";

    const innerWidth = width - PADDING * 2;
    const innerHeight = height - PADDING * 2;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // 避免除以 0

    // 将数据点转换为 SVG 坐标
    const points = data.map((value, index) => {
      const x = PADDING + (index / (data.length - 1)) * innerWidth;
      // Y 轴翻转：数值大在上面
      const normalizedY = (value - min) / range;
      const y = PADDING + innerHeight - normalizedY * innerHeight;
      return `${x},${y}`;
    });

    // 使用 L (直线) 连接点，避免贝塞尔曲线计算开销
    return `M ${points.join(" L ")}`;
  }, [data, width, height]);

  // 添加渐变填充区域（可选）
  const areaPath = useMemo(() => {
    if (data.length < 2) return "";
    const lines = pathData.replace("M ", "").split(" L ");
    if (lines.length < 2) return "";

    const firstPoint = lines[0];
    const lastPoint = lines[lines.length - 1];

    return `M ${firstPoint} L ${lines.slice(1).join(" L ")} L ${lastPoint.split(",")[0]},${height - PADDING} L ${firstPoint.split(",")[0]},${height - PADDING} Z`;
  }, [pathData, height]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={`gradient-${strokeColor}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 填充区域 */}
      <path
        d={areaPath}
        fill={`url(#gradient-${strokeColor})`}
        stroke="none"
      />
      {/* 折线 */}
      <path
        d={pathData}
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * 微型折线图 (Sparkline) - 7d Trend
 * 轻量级实现：使用纯 SVG，不依赖 Recharts
 */
export function TrendLine({ data, isPositive, className, status }: TrendLineProps) {
  // 加载中
  if (status === 'loading') {
    return <LoadingState className={className} />;
  }

  // 待加载（不显示任何内容）
  if (status === 'pending') {
    return <PendingState className={className} />;
  }

  // 获取失败
  if (status === 'failed') {
    return <FailedState className={className} />;
  }

  const isEmpty = !data || data.length < 2;

  if (isEmpty) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded bg-muted/50 group cursor-help",
          className
        )}
        style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
        title="数据不足，无法显示走势"
      >
        <svg
          width="60%"
          height="20"
          viewBox="0 0 60 20"
          fill="none"
          className="text-muted-foreground/40"
        >
          <path
            d="M0 10 Q15 5 30 10 T60 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="3 2"
          />
        </svg>
      </div>
    );
  }

  const last = data.length - 1;
  const autoPositive = data[last] >= data[0];
  const up = isPositive !== undefined ? isPositive : autoPositive;

  // 计算变化百分比
  const changePercent = useMemo(() => {
    if (data.length < 2) return 0;
    const first = data[0];
    const last = data[data.length - 1];
    return ((last - first) / first) * 100;
  }, [data]);

  return (
    <div
      className={cn("overflow-hidden rounded group relative", className)}
      style={{ width: SPARKLINE_WIDTH, height: SPARKLINE_HEIGHT }}
      title={`${STATUS_TITLES.success} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`}
    >
      <SVGTrendLine
        data={data}
        isPositive={up}
        width={SPARKLINE_WIDTH}
        height={SPARKLINE_HEIGHT}
      />
      {/* 悬停时显示具体变化百分比 */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className={cn(
          "text-xs font-bold tabular-nums",
          up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}>
          {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/**
 * 价格变化指示器组件
 */
export interface PriceChangeIndicatorProps {
  change: number;
  status?: PriceHistoryStatus;
}

export function PriceChangeIndicator({ change, status }: PriceChangeIndicatorProps) {
  // 显示状态而非变化值
  if (status === 'loading') {
    return (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <span className="animate-pulse">加载中...</span>
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span
        className="text-sm text-amber-600/70 dark:text-amber-500/70 cursor-help"
        title="7天价格变化数据获取失败"
      >
        —
      </span>
    );
  }

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
