/**
 * 价格相关类型定义
 * 统一真理来源 (Single Source of Truth)
 */

// Token 价格信息
export type TokenPrice = {
  uniqueId: string;
  symbol: string;
  price: number;
  timestamp: number;
  source: "defillama" | "coingecko" | "cache";
};

// 价格获取状态
export type PriceFetchState =
  | { status: "loading"; price?: undefined }
  | { status: "success"; price: number; source: string }
  | { status: "failed"; price?: undefined };

// Hook 使用的简化状态
export type PriceState =
  | { status: "loading"; price?: undefined }
  | { status: "success"; price: number }
  | { status: "failed"; price?: undefined };

// 历史价格数据点
export type PriceHistoryPoint = {
  timestamp: number; // 秒级时间戳
  price: number;
};

// 代币历史价格数据
export type TokenPriceHistory = {
  symbol: string;
  chainId: number;
  address: string;
  prices: PriceHistoryPoint[];
};

// 历史价格状态
export type PriceHistoryState =
  | { status: "loading"; history?: undefined; trend: []; change7d: 0 }
  | { status: "success"; history: TokenPriceHistory; trend: number[]; change7d: number }
  | { status: "pending"; trend: []; change7d: 0 }
  | { status: "failed"; history?: undefined; trend: []; change7d: 0 };

// DefiLlama API 响应
export type DefiLlamaPriceResponse = {
  coins: Record<string, {
    price: number;
    symbol: string;
    timestamp: number;
    confidence?: number;
  }>;
};
