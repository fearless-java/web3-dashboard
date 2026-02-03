"use client";

import React, { useState } from "react";
import { LayoutDashboard, History, Coins, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardViewMode } from "@/hooks/use-dashboard-view";

export interface DashboardSubNavProps {
  /** Current view mode (Overview / History / Token Inspector) */
  currentMode: DashboardViewMode;
  /** Called when user selects a tab */
  onModeChange: (mode: DashboardViewMode) => void;
  /** Called when user inputs an address (parent validates) */
  onTrackSubmit: (input: string) => void;
  /** Optional error message from parent (e.g. invalid address) */
  trackError?: string | null;
  /** Currently tracked address if any */
  trackedAddress?: string | null;
}

const MODES: {
  id: DashboardViewMode;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}[] = [
  {
    id: "MY_PORTFOLIO",
    label: "Overview",
    Icon: LayoutDashboard,
    iconColor: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "HISTORY",
    label: "History",
    Icon: History,
    iconColor: "text-purple-500 dark:text-purple-400",
  },
  {
    id: "TOKEN_INSPECTOR",
    label: "Token Inspector",
    Icon: Coins,
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },
];

/**
 * Secondary navigation – DeBank 风格
 * 左侧：选项卡（Overview / History / Token Inspector）
 * 右侧：地址输入框
 */
export function DashboardSubNav({
  currentMode,
  onModeChange,
  onTrackSubmit,
  trackError = null,
  trackedAddress = null,
}: DashboardSubNavProps) {
  const [inputValue, setInputValue] = useState("");

  const handleTrack = () => {
    onTrackSubmit(inputValue);
  };

  return (
    <div className="w-full border-b border-border/60 bg-background backdrop-blur-xl py-3">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        {/* 左侧：选项卡 */}
        <div className="flex flex-wrap items-center gap-1">
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
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
                  isDisabled && "cursor-not-allowed opacity-50",
                  isSelected
                    ? "text-foreground font-bold"
                    : !isDisabled &&
                        "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", iconColor)}
                  aria-hidden
                />
                {label}
              </button>
            );
          })}
        </div>

        {/* 右侧：地址输入框 - DeBank 风格 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="group flex items-center">
            <div className="flex items-center overflow-hidden rounded-lg border border-input bg-muted/30 px-3 py-1.5 transition-all group-hover:border-input/80 group-focus-within:border-primary/50 group-focus-within:bg-background">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder={trackedAddress ? trackedAddress : "Paste wallet address..."}
                value={trackedAddress ? trackedAddress : inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                className={cn(
                  "ml-2 w-48 border-0 bg-transparent px-0 py-0 text-sm font-mono font-medium text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors",
                  trackError && "text-destructive",
                  trackedAddress && "text-muted-foreground",
                )}
                aria-invalid={!!trackError}
                aria-describedby={trackError ? "track-error" : undefined}
              />
            </div>
          </div>
          {trackError && (
            <p id="track-error" className="text-sm text-destructive">
              {trackError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
