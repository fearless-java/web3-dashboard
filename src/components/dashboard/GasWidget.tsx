"use client";

import React from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GasWidget 组件 Props
 */
interface GasWidgetProps {
  /** 总 Gas 消耗（ETH，字符串格式，例如 "0.4521"） */
  totalGasSpent: string;
  /** 是否加载中 */
  isLoading?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 格式化 Gas 消耗显示
 * 保留 4 位小数
 */
function formatGasSpent(gasSpent: string): string {
  const value = parseFloat(gasSpent);
  
  if (isNaN(value) || value === 0) {
    return "0.0000";
  }
  
  return value.toFixed(4);
}

/**
 * Gas 消耗统计 Widget 组件
 * 
 * 设计规范：
 * - 半透明背景胶囊样式
 * - 使用火焰图标（代表"燃烧"的 Gas）
 * - 数值使用等宽字体（font-mono）
 * - 加载状态显示骨架屏
 * 
 * 使用场景：
 * 放置在 Dashboard 头部，与其他统计信息并列显示
 */
export function GasWidget({
  totalGasSpent,
  isLoading = false,
  className,
}: GasWidgetProps) {
  return (
    <div
      className={cn(
        // 基础布局
        "flex items-center gap-2 px-4 py-2",
        // 胶囊样式：截图浅米色背景 #FBF5ED，无边框
        "rounded-lg bg-[#FBF5ED] dark:bg-[#FBF5ED]/90",
        "transition-all duration-200",
        className
      )}
    >
      {/* 火焰图标 */}
      <Flame 
        className={cn(
          "h-4 w-4 text-orange-500",
          isLoading && "animate-pulse"
        )} 
      />
      
      {/* 文字内容 */}
      <div className="flex items-baseline gap-2">
        {/* 标签 */}
        <span className="text-xs font-medium text-slate-600 dark:text-slate-500">
          Gas Burned
        </span>
        
        {/* 数值 */}
        {isLoading ? (
          // 加载状态：显示骨架屏
          <div className="h-4 w-16 animate-pulse rounded bg-slate-300/50 dark:bg-slate-600/40" />
        ) : (
          // 正常状态：显示数值（浅色背景用深色字）
          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-800">
            {formatGasSpent(totalGasSpent)} ETH
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact 版本 - 更紧凑的显示
 * 适用于空间有限的场景
 */
export function GasWidgetCompact({
  totalGasSpent,
  isLoading = false,
  className,
}: GasWidgetProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5",
        className
      )}
    >
      <Flame className="h-3.5 w-3.5 text-orange-500" />
      {isLoading ? (
        <span className="text-xs text-muted-foreground">...</span>
      ) : (
        <span className="font-mono text-xs font-medium text-foreground">
          {formatGasSpent(totalGasSpent)}
        </span>
      )}
    </div>
  );
}
