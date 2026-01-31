"use client";

import React from "react";
import { Header } from "./Header";

/**
 * PortalLayout 组件 Props
 */
interface PortalLayoutProps {
  /** 子组件（主内容区，在 max-w-7xl 容器内） */
  children: React.ReactNode;
  /** 可选：全屏宽度的二级导航等，与 Header 一样横跨整屏，渲染在 Header 与主内容之间 */
  subNav?: React.ReactNode;
}

/**
 * 居中门户布局组件
 * CoinGecko 风格的居中单列流式布局
 *
 * 结构：
 * - 根容器：min-h-screen bg-background text-foreground
 * - Header：全屏宽度，内容居中
 * - subNav（可选）：全屏宽度，与一级导航一致
 * - 主容器：max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
 * - 内容区：在主容器内渲染 children
 */
export function PortalLayout({ children, subNav }: PortalLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {subNav != null ? subNav : null}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <main className="py-6">{children}</main>
      </div>
    </div>
  );
}
