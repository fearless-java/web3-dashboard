"use client";

import { useState } from "react";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { DashboardSubNav } from "@/components/dashboard/DashboardSubNav";
import { ChainFilter } from "@/components/dashboard/ChainFilter";
import { AssetTable } from "@/components/dashboard/AssetTable";
import { useDashboardView } from "@/hooks/use-dashboard-view";
import { useDashboardState } from "@/hooks/use-dashboard-state";
import { useGasSpent } from "@/hooks/use-gas-spent";
import { Button } from "@/components/ui/button";
import type { DashboardViewMode } from "@/hooks/use-dashboard-view";

/**
 * Dashboard page – CoinGecko-style centered portal layout.
 * Single source of truth: activeAddress from useDashboardView is passed to all data hooks;
 * Hero, AssetTable, etc. are not modified and receive data fetched for activeAddress.
 */
export default function DashboardPage() {
  const [trackError, setTrackError] = useState<string | null>(null);

  const {
    mode,
    activeAddress,
    isWhaleMode,
    setMode,
    trackAddress,
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
    filteredAssets,
    isLoading,
    gasPrice,
  } = useDashboardState(activeAddress);

  const { totalGasSpent, isLoading: isGasSpentLoading } = useGasSpent(activeAddress);

  const handleTrackSubmit = (input: string) => {
    setTrackError(null);
    const ok = trackAddress(input);
    if (!ok) {
      setTrackError("Invalid address");
    }
  };

  const handleModeChange = (newMode: DashboardViewMode) => {
    setTrackError(null);
    setMode(newMode);
  };

  const shortAddress =
    isWhaleMode && activeAddress
      ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
      : "";

  return (
    <PortalLayout
      subNav={
        <DashboardSubNav
          currentMode={mode}
          onModeChange={handleModeChange}
          onTrackSubmit={handleTrackSubmit}
          trackError={trackError}
        />
      }
    >
      {isWhaleMode && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/50">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            👀 You are viewing a read-only portfolio: {shortAddress}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMode("MY_PORTFOLIO")}
            className="rounded-lg border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/50"
          >
            Exit Watch Mode
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

      <ChainFilter
        chains={chains}
        selectedChain={selectedChain}
        onChainSelect={setSelectedChain}
        showTestnets={showTestnets}
        onShowTestnetsChange={setShowTestnets}
      />
      <AssetTable
        assets={filteredAssets}
        chains={chains}
        isLoading={isLoading}
      />
    </PortalLayout>
  );
}
