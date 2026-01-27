
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

export type ChainQueryResult = {
  success: boolean;
  chainId: number;
  chainName: string;
  assets: Asset[];
  error?: string;
};

export type FetchPortfolioParams = {
  address: string;
};

export type GroupedAsset = {
  symbol: string; 
  name: string; 
  logo?: string; 
  totalValue: number; 
  totalBalance: string; 
  averagePrice: number; 
  chains: number[]; 
  assets: Asset[]; 
};
