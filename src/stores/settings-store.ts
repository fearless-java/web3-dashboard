import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dashboardConfig } from '@/config/dashboard.config';
import type { Theme, ThemeColor, SettingsStore } from '@/types';
import { THEME_COLOR_NAMES } from '@/types';

// 类型已从 @/types 统一导入
export type { Theme, ThemeColor, SettingsStore };

/**
 * 从配置中获取默认值
 */
const getDefaultTheme = (): Theme => {
  return (dashboardConfig.ui?.defaultTheme || 'system') as Theme;
};

const getDefaultThemeColor = (): ThemeColor => {
  return (dashboardConfig.ui?.defaultThemeColor || 'blue') as ThemeColor;
};

/**
 * 设置 Store
 * 
 * 功能：
 * 1. 管理用户界面设置（主题、主题色、货币、显示选项）
 * 2. 持久化用户偏好到 localStorage
 * 3. 初始值从 dashboardConfig.ui 读取
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // 初始状态：从配置读取默认值
      theme: getDefaultTheme(),
      themeColor: getDefaultThemeColor(),
      hideSmallBalances: false,

      // Actions
      setTheme: (theme) => {
        set({ theme });
      },

      setThemeColor: (themeColor) => {
        set({ themeColor });
      },

      toggleHideSmallBalances: () => {
        set((state) => ({ hideSmallBalances: !state.hideSmallBalances }));
      },

      // Helper: 获取实际生效的主题
      getEffectiveTheme: () => {
        const { theme } = get();
        if (typeof window === 'undefined') {
          return 'light'; // SSR 默认返回 light
        }
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
      },
    }),
    {
      name: 'app-settings', // localStorage key
      skipHydration: false,
    }
  )
);
