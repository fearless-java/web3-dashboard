"use client";

import React, { useState } from "react";
import { LayoutDashboard, Coins, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Custom Whale Icon (Lucide style)
 * SVG path representing a whale, styled to match lucide-react icons.
 */
function WhaleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 19c0-5 5.5-9 11.5-9 3.5 0 6 2 7.5 4.5" />
      <path d="M14 10a8 8 0 0 1 8-4 10 10 0 0 1-1 8" />
      <path d="M2.5 19c3-1 6-1 8.5 0" />
      <path d="M15 17c1.5 0 3-1 4-2.5" />
      <circle cx="15.5" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShinyButton } from "@/components/magicui/shiny-button";
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
  {
    id: "MY_PORTFOLIO",
    label: "Overview",
    Icon: LayoutDashboard,
    iconColor: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "WHALE_WATCHER",
    label: "Whale Watcher",
    Icon: WhaleIcon,
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  {
    id: "TOKEN_INSPECTOR",
    label: "Token Inspector",
    Icon: Coins,
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },
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
                  isDisabled && "cursor-not-allowed opacity-50",
                  isSelected
                    ? "bg-green-100 text-green-700 hover:bg-green-100/90 dark:bg-green-500/20 dark:text-green-800"
                    : !isDisabled &&
                        "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300",
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
                trackError && "border-destructive",
              )}
              aria-invalid={!!trackError}
              aria-describedby={trackError ? "track-error" : undefined}
            />
            <ShinyButton
              onClick={handleTrack}
              className="h-10 rounded-md bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" aria-hidden />
                Track
              </div>
            </ShinyButton>
            {trackError && (
              <p
                id="track-error"
                className="text-sm text-destructive sm:order-3"
              >
                {trackError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
