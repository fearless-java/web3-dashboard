import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dashboardConfig } from '@/config/dashboard.config';

/**
 * 主题类型：浅色、深色、跟随系统
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * 主题色类型
 */
export type ThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan';

/**
 * 货币类型
 */
export type Currency = 'USD' | 'EUR' | 'CNY' | 'JPY';

/**
 * 货币符号映射
 */
export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  CNY: '¥',
  JPY: '¥',
};

/**
 * 货币名称映射
 */
export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: '美元',
  EUR: '欧元',
  CNY: '人民币',
  JPY: '日元',
};

/**
 * 主题色名称映射
 */
export const THEME_COLOR_NAMES: Record<ThemeColor, string> = {
  blue: '蓝色',
  green: '绿色',
  purple: '紫色',
  orange: '橙色',
  pink: '粉色',
  cyan: '青色',
};

/**
 * 设置 Store 接口
 * 
 * 架构说明：
 * - 初始值从 dashboardConfig.ui 读取（系统默认配置）
 * - 用户修改后的值持久化到 localStorage
 * - 体现了"配置定义默认值，Store 管理当前值"的分层架构
 * 
 * 配置项为主题、主题色、货币、是否隐藏小余额
 */
interface SettingsStore {
  // State
  theme: Theme;
  themeColor: ThemeColor;
  currency: Currency;
  hideSmallBalances: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  setThemeColor: (themeColor: ThemeColor) => void;
  setCurrency: (currency: Currency) => void;
  toggleHideSmallBalances: () => void;

  // Helper: 获取实际生效的主题（当 theme === 'system' 时，返回系统偏好）
  getEffectiveTheme: () => 'light' | 'dark';
}

/**
 * 从配置中获取默认值
 */
const getDefaultTheme = (): Theme => {
  return (dashboardConfig.ui?.defaultTheme || 'system') as Theme;
};

const getDefaultThemeColor = (): ThemeColor => {
  return (dashboardConfig.ui?.defaultThemeColor || 'blue') as ThemeColor;
};

const getDefaultCurrency = (): Currency => {
  return (dashboardConfig.ui?.defaultCurrency || 'USD') as Currency;
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
      currency: getDefaultCurrency(),
      hideSmallBalances: false,

      // Actions
      setTheme: (theme) => {
        set({ theme });
      },

      setThemeColor: (themeColor) => {
        set({ themeColor });
      },

      setCurrency: (currency) => {
        set({ currency });
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
