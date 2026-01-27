export type TransactionType = 'buy' | 'sell' | 'all';

export type TransactionDirection = 'in' | 'out';

export type AssetTransferCategory = 
  | 'external'      
  | 'internal'      
  | 'erc20'         
  | 'erc721'        
  | 'erc1155'       
  | 'specialnft';   

export type Transaction = {
  uniqueId: string;              
  chainId: number;                
  hash: string;                   
  blockNum: string;              
  from: string;                  
  to: string;                    
  value: string;                  
  formattedValue: string;         
  asset: string;                  
  category: AssetTransferCategory; 
  direction: TransactionDirection; 
  transactionType: TransactionType; 
  timestamp: string;              
  logo?: string;                  
  decimals?: number;              
  tokenAddress?: string;          
  isNative: boolean;              
};

export type ChainTransactionResult = {
  success: boolean;
  chainId: number;
  chainName: string;
  transactions: Transaction[];
  error?: string;
};

export type FetchTransactionsParams = {
  address: string;
  type?: TransactionType;        
  pageKey?: string;              
  maxCount?: number;              
  fromBlock?: string;            
  toBlock?: string;              
};

export type TransactionsResult = {
  transactions: Transaction[];
  pageKey?: string;              
  hasMore: boolean;               
};
