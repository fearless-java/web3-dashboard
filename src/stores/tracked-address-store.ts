import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TrackedAddressState {
  /** 当前追踪的地址（观察模式） */
  trackedAddress: string | null;
  /** 设置追踪地址 */
  setTrackedAddress: (address: string | null) => void;
  /** 清除追踪地址 */
  clearTrackedAddress: () => void;
}

/**
 * 追踪地址 Store - 持久化管理观察模式下的地址
 * 
 * 功能：
 * 1. 存储当前追踪的地址（Watch Mode）
 * 2. 持久化到 localStorage，页面刷新/路由切换后状态不丢失
 * 3. 被 useDashboardView hook 和 Header 组件共同使用
 */
export const useTrackedAddressStore = create<TrackedAddressState>()(
  persist(
    (set) => ({
      trackedAddress: null,
      setTrackedAddress: (address) => set({ trackedAddress: address }),
      clearTrackedAddress: () => set({ trackedAddress: null }),
    }),
    {
      name: 'chainhub-tracked-address', // localStorage key
    }
  )
);
