"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { ChainInfo } from "@/hooks/use-dashboard-state";

/**
 * ChainFilter 组件 Props
 */
interface ChainFilterProps {
  /** 可选的链列表 */
  chains: ChainInfo[];
  /** 当前选中的链 ID */
  selectedChain: string;
  /** 选中链变化回调 */
  onChainSelect: (chainId: string) => void;
}

/**
 * 链筛选芯片组件
 * 单个链的筛选按钮 - 使用 Avatar + Button 极简风格
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
      variant={isSelected ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full transition-all",
        isSelected
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "border-border/50 bg-background hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {/* 链图标 - 使用 Avatar */}
      <Avatar size="sm" className="h-5 w-5">
        {isAllChains ? (
          <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
            All
          </AvatarFallback>
        ) : chain.logo ? (
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

      {/* 链名称 */}
      <span className="text-xs font-medium">{chain.shortName}</span>
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
}: ChainFilterProps) {
  return (
    <div className="border-b border-border/50 py-4">
      {/* 水平滚动容器 */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {chains.map((chain) => (
          <ChainChip
            key={chain.id}
            chain={chain}
            isSelected={selectedChain === chain.id}
            onClick={() => onChainSelect(chain.id)}
          />
        ))}
      </div>
    </div>
  );
}
