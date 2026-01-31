"use client";

import React, { useState } from "react";
import { LayoutDashboard, Eye, Coins, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DashboardViewMode } from "@/hooks/use-dashboard-view";

export interface DashboardSubNavProps {
  /** Current view mode (Overview / Whale Watcher / Token Inspector) */
  currentMode: DashboardViewMode;
  /** Called when user selects a tab */
  onModeChange: (mode: DashboardViewMode) => void;
  /** Called when user clicks "Track" with the input value (parent validates and may set trackError) */
  onTrackSubmit: (input: string) => void;
  /** Optional error message from parent (e.g. invalid address) */
  trackError?: string | null;
}

const MODES: {
  id: DashboardViewMode;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}[] = [
  { id: "MY_PORTFOLIO", label: "Overview", Icon: LayoutDashboard, iconColor: "text-blue-500 dark:text-blue-400" },
  { id: "WHALE_WATCHER", label: "Whale Watcher", Icon: Eye, iconColor: "text-amber-500 dark:text-amber-400" },
  { id: "TOKEN_INSPECTOR", label: "Token Inspector", Icon: Coins, iconColor: "text-emerald-500 dark:text-emerald-400" },
];

/**
 * Secondary navigation – pure presentational.
 * Renders tab pills and, in Whale Watcher mode, a search bar.
 * No address validation or mode logic; all via props.
 */
export function DashboardSubNav({
  currentMode,
  onModeChange,
  onTrackSubmit,
  trackError = null,
}: DashboardSubNavProps) {
  const [inputValue, setInputValue] = useState("");

  const handleTrack = () => {
    onTrackSubmit(inputValue);
  };

  return (
    <div className="w-full border-b border-border/50 bg-transparent py-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        {/* Left: Tab pills (Overview / Whale Watcher / Token Inspector) */}
        <div className="flex flex-wrap items-center gap-2">
          {MODES.map(({ id, label, Icon, iconColor }) => {
            const isSelected = currentMode === id;
            const isDisabled = id === "TOKEN_INSPECTOR";
            return (
              <button
                key={id}
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && onModeChange(id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-0 px-4 py-2.5 text-sm font-semibold transition-all",
                  isDisabled &&
                    "cursor-not-allowed opacity-50",
                  isSelected
                    ? "bg-green-100 text-green-700 hover:bg-green-100/90 dark:bg-green-500/20 dark:text-green-800"
                    : !isDisabled &&
                      "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", iconColor)} aria-hidden />
                {label}
              </button>
            );
          })}
        </div>

        {/* Right: Search bar only in Whale Watcher mode */}
        {currentMode === "WHALE_WATCHER" && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              type="text"
              placeholder="Enter 0x address..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTrack()}
              className={cn(
                "min-w-[200px] max-w-xs font-mono text-sm",
                trackError && "border-destructive"
              )}
              aria-invalid={!!trackError}
              aria-describedby={trackError ? "track-error" : undefined}
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleTrack}
              className="flex items-center gap-2 rounded-lg font-semibold"
            >
              <Search className="h-4 w-4 text-primary-foreground" aria-hidden />
              Track
            </Button>
            {trackError && (
              <p id="track-error" className="text-sm text-destructive sm:order-3">
                {trackError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
