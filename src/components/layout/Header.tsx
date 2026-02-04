"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAddress } from "viem";
import { Logo } from "@/components/Logo";
import { useTrackedAddressStore } from "@/stores/tracked-address-store";

/**
 * Portal Layout 头部组件 - DeBank 风格
 * 包含 Logo、导航链接、地址输入框和钱包连接按钮
 */
export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { trackedAddress, setTrackedAddress, clearTrackedAddress } = useTrackedAddressStore();
  const [addressInput, setAddressInput] = useState("");
  const [addressError, setAddressError] = useState(false);

  // 与全局 Store 同步：组件挂载或 trackedAddress 变化时更新输入框
  useEffect(() => {
    if (trackedAddress) {
      setAddressInput(trackedAddress);
    } else {
      setAddressInput("");
    }
  }, [trackedAddress]);

  const navItems = [
    { href: "/dashboard", label: "Assets" },
    { href: "/nfts", label: "NFTs" },
    { href: "/history", label: "History" },
    { href: "/community", label: "Community" },
    { href: "/contact", label: "Contact" },
  ];

  const handleAddressSubmit = () => {
    const trimmed = addressInput.trim();
    if (!trimmed) {
      setAddressError(false);
      clearTrackedAddress();
      return;
    }

    if (isAddress(trimmed)) {
      setAddressError(false);
      // 保存到全局 Store（持久化）
      setTrackedAddress(trimmed.toLowerCase());
      // Navigate to dashboard with the tracked address
      router.push(`/dashboard?address=${trimmed}`);
    } else {
      setAddressError(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddressSubmit();
    }
  };

  const isActivePath = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard?");
    }
    return pathname === href || pathname.startsWith(`${href}?`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* 左侧：Logo - DeBank 风格 */}
        <div className="flex flex-shrink-0 items-center">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Logo size={32} />
            <span 
              className="text-lg font-semibold tracking-tight text-foreground"
              style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
            >
              ChainHub
            </span>
          </Link>
        </div>

        {/* 中间：导航链接 - 平分剩余空间 */}
        <nav className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex w-full max-w-lg items-center justify-between">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 text-center rounded-lg px-6 py-1.5 text-sm font-semibold transition-all",
                  isActivePath(item.href)
                    ? "text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* 右侧：地址输入框 + 钱包连接按钮 */}
        <div className="flex flex-shrink-0 items-center gap-3">
          {/* 地址输入框 - 美化版 */}
          <div className="relative hidden sm:block">
            <div className="group flex items-center">
              <div className="flex items-center overflow-hidden rounded-full border border-input/60 bg-muted/20 px-4 py-2 transition-all group-hover:border-input group-focus-within:border-primary/60 group-focus-within:bg-background/80 group-focus-within:ring-2 group-focus-within:ring-primary/10">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search address..."
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    setAddressError(false);
                  }}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    "ml-2 w-56 border-0 bg-transparent px-0 py-0 text-sm font-mono font-medium text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors",
                    addressError && "text-destructive"
                  )}
                />
                {addressInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddressInput("");
                      setAddressError(false);
                      clearTrackedAddress();
                    }}
                    className="ml-2 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RainbowKit 钱包连接按钮 - 不显示余额 */}
          <ConnectButton
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
            chainStatus="none"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
