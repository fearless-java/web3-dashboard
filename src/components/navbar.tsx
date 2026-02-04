'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isAddress } from 'viem';
import { Logo } from '@/components/Logo';
import { useTrackedAddressStore } from '@/stores/tracked-address-store';

/**
 * 全局导航栏组件 - 所有页面统一使用
 * 包含 Logo、导航链接、地址输入框和钱包连接按钮
 */
export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { trackedAddress, setTrackedAddress, clearTrackedAddress } = useTrackedAddressStore();
  const [addressInput, setAddressInput] = useState('');
  const [addressError, setAddressError] = useState(false);

  // 与全局 Store 同步：组件挂载或 trackedAddress 变化时更新输入框
  useEffect(() => {
    if (trackedAddress) {
      setAddressInput(trackedAddress);
    } else {
      setAddressInput('');
    }
  }, [trackedAddress]);

  const navItems = [
    { href: '/dashboard', label: 'Assets' },
    { href: '/nfts', label: 'NFTs' },
    { href: '/history', label: 'History' },
    { href: '/community', label: 'Community' },
    { href: '/contact', label: 'Contact' },
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
      // 导航到 dashboard 并带上地址参数
      router.push(`/dashboard?address=${trimmed}`);
    } else {
      setAddressError(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddressSubmit();
    }
  };

  const isActivePath = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard?');
    }
    return pathname === href || pathname.startsWith(`${href}?`);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        {/* 左侧：Logo */}
        <div className="flex flex-shrink-0 items-center">
          <Link 
            href="/" 
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Logo size={32} />
            <span 
              className="text-lg font-semibold tracking-tight text-foreground"
              style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}
            >
              ChainHub
            </span>
          </Link>
        </div>

        {/* 中间：导航链接 */}
        <nav className="hidden flex-1 items-center justify-center md:flex">
          <div className="flex w-full max-w-lg items-center justify-between">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 text-center rounded-lg px-6 py-1.5 text-sm font-semibold transition-all',
                  isActivePath(item.href)
                    ? 'text-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* 右侧：地址输入框 + 钱包连接按钮 */}
        <div className="flex flex-shrink-0 items-center gap-3">
          {/* 地址输入框 */}
          <div className="relative hidden sm:block">
            <div className="group flex items-center">
              <div className={cn(
                "flex items-center overflow-hidden rounded-full border px-4 py-2 transition-all",
                addressError 
                  ? "border-destructive/60 bg-destructive/5 group-focus-within:border-destructive group-focus-within:ring-2 group-focus-within:ring-destructive/10"
                  : "border-input/60 bg-muted/20 group-hover:border-input group-focus-within:border-primary/60 group-focus-within:bg-background/80 group-focus-within:ring-2 group-focus-within:ring-primary/10"
              )}>
                <Search className={cn(
                  "h-4 w-4 shrink-0",
                  addressError ? "text-destructive" : "text-muted-foreground"
                )} />
                <input
                  type="text"
                  placeholder="Search address..."
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    if (addressError) setAddressError(false);
                  }}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    'ml-2 w-56 border-0 bg-transparent px-0 py-0 text-sm font-mono font-medium placeholder:text-muted-foreground/60 outline-none transition-colors',
                    addressError ? 'text-destructive placeholder:text-destructive/60' : 'text-foreground'
                  )}
                />
                {addressInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddressInput('');
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
            {/* 错误提示 */}
            {addressError && (
              <div className="absolute -bottom-5 left-0 text-xs text-destructive font-medium">
                Invalid address format
              </div>
            )}
          </div>

          <ConnectButton
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
            chainStatus="none"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
