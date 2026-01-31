"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { FlaskConical } from "lucide-react";
import type { ChainInfo } from "@/hooks/use-dashboard-state";

/**
 * ChainFilter 组件 Props
 */
interface ChainFilterProps {
  chains: ChainInfo[];
  selectedChain: string;
  onChainSelect: (chainId: string) => void;
  /** 是否显示测试网（开关状态） */
  showTestnets: boolean;
  /** 切换显示测试网 */
  onShowTestnetsChange: (value: boolean) => void;
}

/**
 * 链筛选芯片组件
 * 一点点圆角的长方形，无边框；All 仅文字无图标，其他链保留图标+名称
 */
function ChainChip({
  chain,
  isSelected,
  onClick,
}: {
  chain: ChainInfo;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isAllChains = chain.id === "all";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg border-0 px-4 py-2.5 text-sm transition-all",
        isSelected
          ? "bg-green-100 text-green-700 hover:bg-green-100/90 dark:bg-green-500/20 dark:text-green-800"
          : "bg-transparent text-slate-500 font-semibold hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
      )}
    >
      {!isAllChains && (
        <Avatar size="sm" className="h-5 w-5">
          {chain.logo ? (
            <AvatarImage src={chain.logo} alt={chain.name} />
          ) : (
            <AvatarFallback
              className={cn(
                "text-[10px] font-bold",
                isSelected
                  ? "bg-green-200/80 text-green-700 dark:bg-green-500/30 dark:text-green-800"
                  : ""
              )}
              style={!isSelected && chain.color ? { backgroundColor: `${chain.color}20`, color: chain.color } : undefined}
            >
              {chain.shortName.slice(0, 2)}
            </AvatarFallback>
          )}
        </Avatar>
      )}

      <span className={cn("text-sm", isSelected ? "font-bold" : "font-semibold")}>
        {chain.shortName}
      </span>
    </Button>
  );
}

/**
 * 链筛选栏组件
 * 水平可滚动的链筛选芯片列表
 */
export function ChainFilter({
  chains,
  selectedChain,
  onChainSelect,
  showTestnets,
  onShowTestnetsChange,
}: ChainFilterProps) {
  return (
    <div className="border-b border-border/50 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 水平滚动链筛选 */}
        <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {chains.map((chain) => (
            <ChainChip
              key={chain.id}
              chain={chain}
              isSelected={selectedChain === chain.id}
              onClick={() => onChainSelect(chain.id)}
            />
          ))}
        </div>
        {/* Show Testnets 开关 */}
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <FlaskConical className="h-4 w-4" aria-hidden />
          <span>Show Testnets</span>
          <Switch
            checked={showTestnets}
            onCheckedChange={onShowTestnetsChange}
            aria-label="Show testnet chains"
          />
        </label>
      </div>
    </div>
  );
}
