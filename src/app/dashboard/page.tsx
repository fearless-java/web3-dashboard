"use client";

import { useAccount } from "wagmi";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { ChainFilter } from "@/components/dashboard/ChainFilter";
import { AssetTable } from "@/components/dashboard/AssetTable";
import { useDashboardState } from "@/hooks/use-dashboard-state";
import { useGasSpent } from "@/hooks/use-gas-spent";

/**
 * Dashboard 页面
 * CoinGecko 风格的居中门户布局
 */
export default function DashboardPage() {
  const { address } = useAccount();
  const {
    totalNetWorth,
    totalChange24h,
    totalChangePercent,
    chains,
    selectedChain,
    setSelectedChain,
    filteredAssets,
    isLoading,
    gasPrice,
  } = useDashboardState();

  // 用户历史 Gas 消耗（Etherscan API，仅在有地址时请求）
  const { totalGasSpent, isLoading: isGasSpentLoading } = useGasSpent(address);

  return (
    <PortalLayout>
      {/* Hero Section - 总资产展示 + Gas 消耗统计 */}
      <HeroSection
        totalNetWorth={totalNetWorth}
        totalChange24h={totalChange24h}
        totalChangePercent={totalChangePercent}
        gasPrice={gasPrice}
        isLoading={isLoading}
        totalGasSpent={address ? totalGasSpent : undefined}
        isGasSpentLoading={!!address && isGasSpentLoading}
      />

      {/* Chain Filter - 链筛选栏 */}
      <ChainFilter
        chains={chains}
        selectedChain={selectedChain}
        onChainSelect={setSelectedChain}
      />

      {/* Asset Table - 资产表格 */}
      <AssetTable
        assets={filteredAssets}
        chains={chains}
        isLoading={isLoading}
      />
    </PortalLayout>
  );
}
