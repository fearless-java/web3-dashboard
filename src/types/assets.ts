/**
 * 资产类型
 * 包含：该资产唯一id(所在链id-合约地址)、所在链id、合约地址、符号、名称、小数位、余额、格式化后的余额、图标、是否原生代币、价格、价值
 */
export type Asset = {
  uniqueId: string; 
  chainId: number;
  address: string; 
  symbol: string;
  name: string;
  decimals: number;
  balance: string; 
  formatted: string; 
  logo?: string;
  isNative: boolean;
  price?: number; 
  value?: number; 
};

/**
 * 单链查询结果
 * 包含：是否成功、所在链id、所在链名称、资产列表、错误信息
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
 * 包含：地址
 */
export type FetchPortfolioParams = {
  address: string;
};

/**
 * 分组资产
 * 包含：符号、名称、图标、总价值、总余额、平均价格、所在链id、资产列表、是否测试网（用于净值与列表区分）
 */
export type GroupedAsset = {
  symbol: string;
  name: string;
  logo?: string;
  totalValue: number;
  totalBalance: string;
  averagePrice: number;
  chains: number[];
  assets: Asset[];
  /** 该分组是否全部为测试网资产（总净值不计入） */
  isTestnet?: boolean;
};
