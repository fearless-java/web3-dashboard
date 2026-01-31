'use client';

import { useEffect } from 'react';
import { useSettingsStore, type ThemeColor } from '@/stores/settings-store';

const THEME_COLOR_CLASSES = [
  'theme-blue',
  'theme-green',
  'theme-purple',
  'theme-orange',
  'theme-pink',
  'theme-cyan',
] as const;

function applyThemeColor(color: ThemeColor) {
  const root = document.documentElement;
  THEME_COLOR_CLASSES.forEach((c) => root.classList.remove(c));
  root.classList.add(`theme-${color}`);
}

function applyDarkMode(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) root.classList.add('dark');
  else root.classList.remove('dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, themeColor, getEffectiveTheme } = useSettingsStore();

  // 初始化 + 响应 theme/themeColor 变化：应用主题与主题色
  useEffect(() => {
    const effectiveTheme = getEffectiveTheme();
    applyDarkMode(effectiveTheme === 'dark');
    applyThemeColor(themeColor);
  }, [theme, themeColor, getEffectiveTheme]);

  // 跟随系统：监听系统主题变化（仅在 theme === 'system' 时）
  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const effectiveTheme = getEffectiveTheme();
      applyDarkMode(effectiveTheme === 'dark');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, getEffectiveTheme]);

  // 订阅 store：任意设置变化时从当前 state 重新应用（避免闭包陈旧）
  useEffect(() => {
    const unsubscribe = useSettingsStore.subscribe((state) => {
      const effectiveTheme = state.getEffectiveTheme();
      applyDarkMode(effectiveTheme === 'dark');
      applyThemeColor(state.themeColor);
    });
    return unsubscribe;
  }, []);

  return <>{children}</>;
}
