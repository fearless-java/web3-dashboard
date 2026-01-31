"use client";

import React from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Portal Layout 头部组件
 * 包含 Logo、导航链接、主题切换和钱包连接按钮
 * 
 * 修复：分割线全屏，内容居中对齐
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      {/* 内容容器：居中对齐 */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo 和导航 */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 p-1.5">
              <span className="text-xs font-bold text-primary">CD</span>
            </div>
            <span className="font-space text-base font-bold tracking-tight text-foreground">
              Crypto Dashboard
            </span>
          </Link>

          {/* 导航链接 */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link
              href="/market"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Market
            </Link>
            <Link
              href="/nfts"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              NFTs
            </Link>
          </nav>
        </div>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-3">
          {/* 主题切换 */}
          <ThemeToggle />

          {/* RainbowKit 钱包连接按钮 */}
          <ConnectButton
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "full",
            }}
            chainStatus={{
              smallScreen: "icon",
              largeScreen: "full",
            }}
            showBalance={{
              smallScreen: false,
              largeScreen: true,
            }}
          />
        </div>
      </div>
    </header>
  );
}
