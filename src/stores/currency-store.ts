import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Currency = 'USD' | 'CNY' | 'EUR' | 'JPY' | 'GBP';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  CNY: '¥',
  EUR: '€',
  JPY: '¥',
  GBP: '£',
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: '美元',
  CNY: '人民币',
  EUR: '欧元',
  JPY: '日元',
  GBP: '英镑',
};

interface CurrencyStore {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currency: 'USD', 
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: 'crypto-dashboard-currency', 
      
      skipHydration: false,
    }
  )
);
