# 交易歷史功能使用指南

## 概述

本項目已實現使用 Alchemy SDK 查詢用戶交易歷史列表的功能，支持區分買入、賣出和所有歷史交易。

## 功能特點

- ✅ 多鏈聚合查詢（支持所有配置的區塊鏈網絡）
- ✅ 區分買入、賣出和所有交易
- ✅ 自動刷新（30秒間隔，可配置）
- ✅ 錯誤處理（單鏈失敗不影響其他鏈）
- ✅ 使用 TanStack Query 進行狀態管理

## 使用方式

### 1. 基本使用

```typescript
import { useTransactions, useBuyTransactions, useSellTransactions, useAllTransactions } from '@/hooks/useTransactions';

function MyComponent() {
  const address = '0x...'; // 錢包地址
  const isConnected = true;

  // 查詢所有交易
  const { data, isLoading, error } = useAllTransactions(address, isConnected);

  // 查詢買入交易
  const { data: buyData } = useBuyTransactions(address, isConnected);

  // 查詢賣出交易
  const { data: sellData } = useSellTransactions(address, isConnected);

  // 或者使用通用 hook 指定類型
  const { data: allData } = useTransactions(address, 'all', isConnected);
  const { data: buyData2 } = useTransactions(address, 'buy', isConnected);
  const { data: sellData2 } = useTransactions(address, 'sell', isConnected);
}
```

### 2. 數據結構

```typescript
interface Transaction {
  uniqueId: string;              // 唯一標識符
  chainId: number;               // 鏈 ID
  hash: string;                  // 交易哈希
  blockNum: string;              // 區塊號
  from: string;                  // 發送地址
  to: string;                     // 接收地址
  value: string;                  // 轉賬金額（原始格式）
  formattedValue: string;         // 格式化後的金額
  asset: string;                  // 資產符號（如 ETH, USDC）
  category: AssetTransferCategory; // 轉賬類型
  direction: 'in' | 'out';        // 方向：in（收到）或 out（發出）
  transactionType: 'buy' | 'sell' | 'all'; // 交易類型
  timestamp: string;              // 時間戳
  logo?: string;                  // 資產 Logo
  decimals?: number;              // 小數位數
  tokenAddress?: string;          // 代幣合約地址
  isNative: boolean;              // 是否為原生代幣
}
```

### 3. 完整示例

```typescript
'use client';

import { useState } from 'react';
import { useTransactions, Transaction } from '@/hooks/useTransactions';

export default function TransactionsPage() {
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'buy' | 'sell' | 'all'>('all');
  const isConnected = !!address;

  const { data, isLoading, error, refetch } = useTransactions(
    address || undefined,
    type,
    isConnected
  );

  if (isLoading) {
    return <div>加載中...</div>;
  }

  if (error) {
    return <div>錯誤: {error.message}</div>;
  }

  return (
    <div>
      <h1>交易歷史</h1>
      
      <div>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="輸入錢包地址"
        />
        
        <select value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="all">所有交易</option>
          <option value="buy">買入</option>
          <option value="sell">賣出</option>
        </select>
        
        <button onClick={() => refetch()}>刷新</button>
      </div>

      <div>
        <h2>交易列表 ({data?.transactions.length || 0})</h2>
        {data?.transactions.map((tx: Transaction) => (
          <div key={tx.uniqueId}>
            <p>
              {tx.transactionType === 'buy' ? '買入' : '賣出'} - {tx.asset}
            </p>
            <p>金額: {tx.formattedValue} {tx.asset}</p>
            <p>時間: {new Date(tx.timestamp).toLocaleString()}</p>
            <p>鏈: {tx.chainId}</p>
            <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank">
              查看交易
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## API 說明

### useTransactions

通用交易查詢 Hook，可以指定交易類型。

**參數：**
- `address: string | undefined` - 錢包地址
- `type: 'buy' | 'sell' | 'all'` - 交易類型（默認：'all'）
- `isConnected: boolean` - 是否已連接（默認：false）
- `options?: UseQueryOptions` - 可選的查詢配置

**返回：**
- `data: TransactionsResult` - 交易數據
- `isLoading: boolean` - 加載狀態
- `error: Error | null` - 錯誤信息
- `refetch: () => void` - 手動刷新函數

### useBuyTransactions

專門查詢買入交易的 Hook。

### useSellTransactions

專門查詢賣出交易的 Hook。

### useAllTransactions

查詢所有交易的 Hook。

## 配置

交易刷新間隔在 `src/config/dashboard.config.ts` 中配置：

```typescript
refresh: {
  transaction: 30000, // 30秒
  // ...
}
```

## 注意事項

1. **API 限制**：Alchemy API 有速率限制，請注意不要過於頻繁地請求
2. **數據量**：默認每鏈最多返回 100 筆交易，可以通過 `maxCount` 參數調整
3. **多鏈查詢**：會並行查詢所有啟用的鏈，單個鏈失敗不會影響其他鏈
4. **去重處理**：當查詢類型為 'all' 時，會自動去除重複的交易記錄

## 錯誤處理

- 單個鏈查詢失敗時，會記錄錯誤但繼續處理其他鏈
- 如果所有鏈都失敗，會拋出錯誤
- 如果部分鏈失敗，會記錄警告但返回成功鏈的數據
