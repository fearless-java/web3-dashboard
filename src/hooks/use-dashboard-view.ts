"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";

/**
 * Dashboard view mode – single source of truth for "whose portfolio we are viewing".
 */
export type DashboardViewMode =
  | "MY_PORTFOLIO"
  | "WHALE_WATCHER"
  | "TOKEN_INSPECTOR";

export interface UseDashboardViewReturn {
  /** Current view mode */
  mode: DashboardViewMode;
  /** Address used for all data fetches (portfolio, gas, etc.) – "address hijacking" */
  activeAddress: string | undefined;
  /** True when viewing a watched whale address (read-only) */
  isWhaleMode: boolean;
  /** Set view mode (e.g. back to Overview) */
  setMode: (mode: DashboardViewMode) => void;
  /** Currently watched address in Whale Watcher mode (valid 0x), or null */
  watchedAddress: string | null;
  /**
   * Start tracking an address in Whale Watcher mode.
   * Validates with isAddress(); on success switches mode to WHALE_WATCHER and sets watchedAddress.
   * @returns true if input is valid and tracking started, false otherwise
   */
  trackAddress: (input: string) => boolean;
}

/**
 * View state hook for Dashboard secondary navigation.
 * Decides "activeAddress" so the page can pass it to all data hooks (useDashboardState, useGasSpent)
 * without changing child components (Hero, AssetTable).
 */
export function useDashboardView(): UseDashboardViewReturn {
  const { address: userAddress } = useAccount();
  const [mode, setMode] = useState<DashboardViewMode>("MY_PORTFOLIO");
  const [watchedAddress, setWatchedAddress] = useState<string | null>(null);

  const activeAddress = useMemo((): string | undefined => {
    if (mode === "WHALE_WATCHER" && watchedAddress) {
      return watchedAddress;
    }
    return userAddress ?? undefined;
  }, [mode, watchedAddress, userAddress]);

  const isWhaleMode = mode === "WHALE_WATCHER" && !!watchedAddress;

  const trackAddress = (input: string): boolean => {
    const trimmed = input.trim();
    if (!trimmed || !isAddress(trimmed)) {
      return false;
    }
    setWatchedAddress(trimmed);
    setMode("WHALE_WATCHER");
    return true;
  };

  return {
    mode,
    activeAddress,
    isWhaleMode,
    setMode,
    watchedAddress,
    trackAddress,
  };
}
