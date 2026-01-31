"use client";

import React from "react";
import { Header } from "./Header";

/**
 * PortalLayout 组件 Props
 */
interface PortalLayoutProps {
  /** 子组件 */
  children: React.ReactNode;
}

/**
 * 居中门户布局组件
 * CoinGecko 风格的居中单列流式布局
 *
 * 结构：
 * - 根容器：min-h-screen bg-background text-foreground
 * - Header：全屏宽度，内容居中
 * - 主容器：max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
 * - 内容区：在主容器内渲染 children
 */
export function PortalLayout({ children }: PortalLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 粘性页眉 - 全屏宽度 */}
      <Header />

      {/* 主容器：居中 + 响应式内边距 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 主内容区 */}
        <main className="py-6">{children}</main>
      </div>
    </div>
  );
}
