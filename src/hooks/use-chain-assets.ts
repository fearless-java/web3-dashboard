"use client";

import { useMemo } from "react";
import type { GroupedAsset, Asset } from "@/types/assets";

export type UseChainAssetsReturn = {
  /** 经筛选/拆包后的资产列表（GroupedAsset[]，可直接转 DashboardAsset 展示） */
  displayedAssets: GroupedAsset[];
  /** 当前选中链的总价值（不含测试网） */
  chainNetWorth: number;
};

/**
 * 单链资产筛选 Hook
 *
 * 策略：一次拉取、前端筛选，不发起额外网络请求。
 * - selectedChain === 'all'：返回全部聚合资产及总价值。
 * - selectedChain !== 'all'：从每个 GroupedAsset 的 assets 中取出该链的 Token，
 *   构造“单链版”的 GroupedAsset，并汇总该链净值。
 */
export function useChainAssets(
  allAssets: GroupedAsset[],
  selectedChain: string
): UseChainAssetsReturn {
  return useMemo(() => {
    if (selectedChain === "all") {
      const displayedAssets = allAssets;
      const chainNetWorth = displayedAssets
        .filter((g) => !g.isTestnet)
        .reduce((sum, g) => sum + g.totalValue, 0);
      return { displayedAssets, chainNetWorth };
    }

    const chainIdNum = Number(selectedChain);
    const displayedAssets: GroupedAsset[] = [];

    for (const group of allAssets) {
      const token = group.assets.find((a: Asset) => a.chainId === chainIdNum);
      if (!token) continue;

      const value = token.value ?? 0;
      const balance = parseFloat(token.formatted) || 0;
      const averagePrice = balance > 0 ? value / balance : group.averagePrice;

      displayedAssets.push({
        symbol: group.symbol,
        name: group.name,
        logo: token.logo ?? group.logo,
        totalValue: value,
        totalBalance: balance.toFixed(18),
        averagePrice,
        chains: [chainIdNum],
        assets: [token],
        isTestnet: group.isTestnet,
      });
    }

    displayedAssets.sort((a, b) => b.totalValue - a.totalValue);

    const chainNetWorth = displayedAssets
      .filter((g) => !g.isTestnet)
      .reduce((sum, g) => sum + g.totalValue, 0);

    return { displayedAssets, chainNetWorth };
  }, [allAssets, selectedChain]);
}
