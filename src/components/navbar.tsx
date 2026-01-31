'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * 不显示全局导航栏的路径列表
 * 这些页面使用自己的布局和导航
 */
const PORTAL_LAYOUT_PATHS = ['/dashboard'];

export function Navbar() {
  const pathname = usePathname();
  
  // 检查当前路径是否使用 Portal 布局
  const isPortalLayout = PORTAL_LAYOUT_PATHS.some(path => pathname.startsWith(path));
  
  // Portal 布局页面不显示全局导航栏
  if (isPortalLayout) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* 左侧：Logo + 项目名称 */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex items-center justify-center rounded-lg bg-primary/10 p-2">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Crypto Dashboard
            </span>
          </Link>
        </div>

        {/* 右侧：主题切换 + 钱包连接 */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <ConnectButton 
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
            chainStatus={{
              smallScreen: 'icon',
              largeScreen: 'full',
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
