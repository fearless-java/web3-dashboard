"use client";

import { useState, Suspense } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { ChainFilter } from "@/components/dashboard/ChainFilter";
import { AssetTable } from "@/components/dashboard/AssetTable";
import { useDashboardView } from "@/hooks/use-dashboard-view";
import { useDashboardState } from "@/hooks/use-dashboard-state";
import { ChainDistribution } from "@/components/dashboard/ChainDistribution";
import { useGasSpent } from "@/hooks/use-gas-spent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard 加载状态组件
 */
function DashboardLoading() {
  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Hero Section Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-16 w-full" />
        </div>
        {/* Chain Filter Skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
        {/* Asset Table Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </PortalLayout>
  );
}

/**
 * Dashboard 内容组件 - 使用 useSearchParams，需要 Suspense 包裹
 */
function DashboardContent() {
  const [trackError, setTrackError] = useState<string | null>(null);

  const {
    activeAddress,
    isTrackedMode,
    trackAddress,
    trackedAddress,
  } = useDashboardView();

  const {
    totalNetWorth,
    totalChange24h,
    totalChangePercent,
    chains,
    selectedChain,
    setSelectedChain,
    showTestnets,
    setShowTestnets,
    filteredTopAssets,
    filteredSmallAssets,
    isLoading,
    gasPrice,
    smallAssetsExpanded,
    setSmallAssetsExpanded,
    priceStats,
    historyStats,
    chainDistribution,
  } = useDashboardState(activeAddress);

  const { totalGasSpent, isLoading: isGasSpentLoading } = useGasSpent(activeAddress);

  const handleTrackSubmit = (input: string) => {
    setTrackError(null);
    const ok = trackAddress(input);
    if (!ok) {
      setTrackError("Invalid address");
    }
  };

  const shortAddress =
    isTrackedMode && activeAddress
      ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
      : "";

  return (
    <PortalLayout>
      {isTrackedMode && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/50">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            👀 Viewing portfolio: {shortAddress}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleTrackSubmit("")}
            className="rounded-lg border-blue-300 text-blue-800 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/50"
          >
            Clear
          </Button>
        </div>
      )}

      <HeroSection
        totalNetWorth={totalNetWorth}
        totalChange24h={totalChange24h}
        totalChangePercent={totalChangePercent}
        gasPrice={gasPrice}
        isLoading={isLoading}
        totalGasSpent={activeAddress ? totalGasSpent : undefined}
        isGasSpentLoading={!!activeAddress && isGasSpentLoading}
      />

      {/* 链资产分布 - 显示各链占比 */}
      <ChainDistribution
        chains={chainDistribution}
        totalValue={totalNetWorth}
        isLoading={isLoading}
      />

      <ChainFilter
        chains={chains}
        selectedChain={selectedChain}
        onChainSelect={setSelectedChain}
        showTestnets={showTestnets}
        onShowTestnetsChange={setShowTestnets}
      />

      <AssetTable
        topAssets={filteredTopAssets}
        smallAssets={filteredSmallAssets}
        chains={chains}
        isLoading={isLoading}
        smallAssetsExpanded={smallAssetsExpanded}
        setSmallAssetsExpanded={setSmallAssetsExpanded}
        priceStats={priceStats}
        historyStats={historyStats}
      />
    </PortalLayout>
  );
}

/**
 * Dashboard page – CoinGecko-style centered portal layout.
 *
 * 分层加载优化：
 * - Top Assets (>= $1): 完整数据，包括趋势图
 * - Small Assets (< $1): 基础数据，默认折叠，展开后才加载完整数据
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
