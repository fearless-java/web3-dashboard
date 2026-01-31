/**
 * @deprecated 请使用 useSettingsStore 替代
 * 此文件保留仅用于向后兼容，将在未来版本中移除
 */
import { useSettingsStore } from './settings-store';
import type { Theme } from './settings-store';

// 重新导出类型以保持向后兼容
export type { Theme };

/**
 * @deprecated 请使用 useSettingsStore 替代
 * 向后兼容的 hook，代理到新的 settings store
 */
export const useThemeStore = () => {
  return useSettingsStore();
};
