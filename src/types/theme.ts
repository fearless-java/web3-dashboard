/**
 * 主题相关类型
 * 统一真理来源 (Single Source of Truth)
 */

export type Theme = "light" | "dark" | "system";
export type ThemeColor = "blue" | "green" | "purple" | "orange" | "pink" | "cyan";

export const THEME_COLOR_NAMES: Record<ThemeColor, string> = {
  blue: "蓝色",
  green: "绿色",
  purple: "紫色",
  orange: "橙色",
  pink: "粉色",
  cyan: "青色",
};

// Settings Store 接口
export interface SettingsStore {
  // State
  theme: Theme;
  themeColor: ThemeColor;
  hideSmallBalances: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  setThemeColor: (themeColor: ThemeColor) => void;
  toggleHideSmallBalances: () => void;

  // Helper: 获取实际生效的主题（当 theme === 'system' 时，返回系统偏好）
  getEffectiveTheme: () => "light" | "dark";
}
