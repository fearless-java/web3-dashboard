/**
 * 资产类型定义
 * 用于表示跨链资产的基本信息
 */
export type Asset = {
  uniqueId: string; // chainId-address 唯一标识
  chainId: number;
  address: string; // 合约地址，原生代币用 "0x0000..."
  symbol: string;
  name: string;
  decimals: number;
  balance: string; // 原始 hex 或 wei
  formatted: string; // 格式化后的数字 (如 "1.5")
  logo?: string;
  isNative: boolean;
  price?: number; // 代币价格（USD）
  value?: number; // 资产价值（USD）= balance * price
};

/**
 * 单链查询结果
 */
export type ChainQueryResult = {
  success: boolean;
  chainId: number;
  chainName: string;
  assets: Asset[];
  error?: string;
};

/**
 * 查询参数
 */
export type FetchPortfolioParams = {
  address: string;
};
