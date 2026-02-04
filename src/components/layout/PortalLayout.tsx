"use client";

import React from "react";

interface PortalLayoutProps {
  children: React.ReactNode;
}

/**
 * PortalLayout - 居中门户布局
 * 
 * 注意：导航栏现在在全局 layout.tsx 中统一渲染，
 * 这里只保留内容容器，避免重复渲染导航栏
 */
export function PortalLayout({ children }: PortalLayoutProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <main className="py-6">{children}</main>
    </div>
  );
}
