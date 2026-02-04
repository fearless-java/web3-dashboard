"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { useSearchParams, useRouter } from "next/navigation";
import { useTrackedAddressStore } from "@/stores/tracked-address-store";

/**
 * Dashboard view mode – single source of truth for "whose portfolio we are viewing".
 */
export type DashboardViewMode =
  | "MY_PORTFOLIO"
  | "HISTORY"
  | "TOKEN_INSPECTOR";

export interface UseDashboardViewReturn {
  /** Current view mode */
  mode: DashboardViewMode;
  /** Address used for all data fetches (portfolio, gas, etc.) – "address hijacking" */
  activeAddress: string | undefined;
  /** True when viewing a tracked address (read-only) */
  isTrackedMode: boolean;
  /** Set view mode (e.g. back to Overview) */
  setMode: (mode: DashboardViewMode) => void;
  /** Currently tracked address (valid 0x), or null */
  trackedAddress: string | null;
  /**
   * Start tracking an address or clear tracking.
   * - Empty string: clears trackedAddress
   * - Valid address: sets trackedAddress
   * @returns true if input is valid (empty or valid address), false otherwise
   */
  trackAddress: (input: string) => boolean;
}

/**
 * View state hook for Dashboard secondary navigation.
 * Decides "activeAddress" so the page can pass it to all data hooks (useDashboardState, useGasSpent)
 * without changing child components (Hero, AssetTable).
 * 
 * 支持从 URL 参数 ?address=0x... 读取追踪地址
 */
export function useDashboardView(): UseDashboardViewReturn {
  const { address: userAddress } = useAccount();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<DashboardViewMode>("MY_PORTFOLIO");
  // 使用持久化的 Store 替代本地 state，确保路由切换后状态不丢失
  const { trackedAddress, setTrackedAddress, clearTrackedAddress } = useTrackedAddressStore();

  // 从 URL 参数读取地址并同步到 Store
  useEffect(() => {
    const addressFromUrl = searchParams.get("address");
    if (addressFromUrl && isAddress(addressFromUrl)) {
      setTrackedAddress(addressFromUrl.toLowerCase());
    }
  }, [searchParams, setTrackedAddress]);

  const activeAddress = useMemo((): string | undefined => {
    if (trackedAddress) {
      return trackedAddress;
    }
    return userAddress ?? undefined;
  }, [trackedAddress, userAddress]);

  const isTrackedMode = !!trackedAddress;

  const trackAddress = useCallback((input: string): boolean => {
    const trimmed = input.trim();
    // Empty string - clear tracking
    if (!trimmed) {
      clearTrackedAddress();
      return true;
    }
    // Validate address
    if (!isAddress(trimmed)) {
      return false;
    }
    const normalizedAddress = trimmed.toLowerCase();
    setTrackedAddress(normalizedAddress);
    return true;
  }, [setTrackedAddress, clearTrackedAddress]);

  return {
    mode,
    activeAddress,
    isTrackedMode,
    setMode,
    trackedAddress,
    trackAddress,
  };
}
