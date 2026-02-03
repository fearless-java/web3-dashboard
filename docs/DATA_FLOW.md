# Web3 Dashboard 数据流与架构文档

## 概述

本文档详细描述了 Web3 Dashboard 看板项目的核心数据流、架构设计和实现逻辑。项目使用 Next.js + React + TanStack Query 构建，实现了多链资产聚合和价格高可用查询。

---

## 目录

1. [项目架构概览](#项目架构概览)
2. [数据源与 API](#数据源与-api)
3. [核心数据流](#核心数据流)
4. [高可用价格查询机制](#高可用价格查询机制)
5. [资产聚合逻辑](#资产聚合逻辑)
6. [状态管理](#状态管理)
7. [UI 渲染流程](#ui-渲染流程)
8. [配置说明](#配置说明)

---

## 项目架构概览

### 技术栈

```
├── 前端框架: Next.js 16 (App Router)
├── 状态管理: TanStack Query v5 + React Hooks
├── 链交互: wagmi + viem + alchemy-sdk
├── UI 组件: shadcn/ui + Tailwind CSS
├── 图表: Recharts
├── 钱包连接: WalletConnect + MetaMask
```

### 项目结构

```
src/
├── app/                    # Next.js 页面
├── components/
│   └── dashboard/         # 看板相关组件
│       ├── AssetTable.tsx
│       ├── TrendLine.tsx
│       └── ...
├── config/
│   └── dashboard.config.ts # 全局配置
├── constants/
│   └── chains.ts          # 链配置常量
├── hooks/
│   ├── usePortfolio.ts           # 资产与价格数据
│   ├── useAggregatedPortfolio.ts # 资产聚合
│   ├── use-dashboard-state.ts    # 看板状态管理
│   ├── use-price-history.ts      # 历史价格
│   ├── use-chain-assets.ts       # 链筛选
│   └── use-gas-price.ts          # Gas 价格
├── services/
│   ├── portfolio.ts              # 资产获取服务
│   ├── price-current-ha.ts       # 当前价格 HA
│   └── price-history-ha.ts       # 历史价格 HA
├── types/
│   └── assets.ts          # 类型定义
└── utils/
    ├── asset-utils.ts     # 资产工具函数
    └── network.ts         # 网络工具函数
```

---

## 数据源与 API

### 1. Alchemy API - 资产数据

| 功能 | API | 用途 |
|------|-----|------|
| 原生代币余额 | `alchemy.core.getBalance()` | 获取 ETH 等原生币余额 |
| 代币余额 | `alchemy.core.getTokenBalances()` | 获取用户 ERC20 代币持仓 |
| 代币元数据 | `alchemy.core.getTokenMetadata()` | 获取代币 symbol、decimals、logo |

**配置来源**: `dashboardConfig.networks[].alchemyNetwork`

### 2. DefiLlama API - 价格数据

| 用途 | 端点 | 说明 |
|------|------|------|
| 当前价格 | `https://coins.llama.fi/prices/current/{keys}` | 批量获取当前价格 |
| 历史价格 | `https://coins.llama.fi/chart/{key}?span=7` | 7天价格走势 |

**链映射** (`LLAMA_CHAIN_MAP`):
```typescript
1 → 'ethereum'
10 → 'optimism'
42161 → 'arbitrum'
8453 → 'base'
137 → 'polygon'
...
```

### 3. CoinGecko API - 备选价格源

| 用途 | 端点 | 说明 |
|------|------|------|
| 当前价格 | `https://api.coingecko.com/api/v3/simple/price` | 单一代币价格 |
| 历史价格 | `https://api.coingecko.com/api/v3/coins/{id}/market_chart` | 7天价格走势 |

**限制**: 有速率限制 (429)，用于 DefiLlama 失败时的兜底

---

## 核心数据流

### 整体数据流图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户连接钱包                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           wagmi useAccount()                                │
│                    获取 address, isConnected 状态                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
           ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
           │ usePortfolio   │  │ useDashboard   │  │ useGasPrice    │
           │ 资产数据       │  │ State          │  │ Gas 费用       │
           └────────────────┘  └────────────────┘  └────────────────┘
                    │                 │                 │
                    ▼                 │                 ▼
           ┌────────────────┐         │         ┌────────────────┐
           │ fetchPortfolio │         │         │ Gas API        │
           │ Alchemy API    │         │         │ (多链聚合)     │
           └────────────────┘         │         └────────────────┘
                    │                 │
                    ▼                 │
           ┌────────────────┐         │
           │ usePricesQueryHA        │
           │ 价格数据 (HA)  │         │
           └────────────────┘         │
                    │                 │
                    ▼                 │
           ┌────────────────┐         │
           │ price-current- │◄────────┘
           │ ha.ts 服务     │
           └────────────────┘
                    │
          ┌────────┴────────┐
          ▼                 ▼
   ┌──────────────┐  ┌──────────────┐
   │ DefiLlama    │  │ CoinGecko    │
   │ (主数据源)   │  │ (备选)       │
   └──────────────┘  └──────────────┘
```

### 详细数据流步骤

#### 步骤 1: 钱包连接检测
```typescript
// use-dashboard-state.ts
const { address: walletAddress, isConnected } = useAccount();
const effectiveAddress = overrideAddress ?? walletAddress ?? undefined;
```

#### 步骤 2: 获取多链资产数据
```typescript
// fetchPortfolio() 遍历所有启用的网络
const networks = dashboardConfig.networks.filter(n => n.enabled);
const promises = networks.map(async (networkConfig) => {
  return fetchChainAssets(chainId, chainName, address);
});
const results = await Promise.allSettled(promises);
```

#### 步骤 3: 聚合资产 (按 Symbol)
```typescript
// groupAssetsBySymbol() 将多链同符号资产合并
const mainnetMap = new Map<string, Asset[]>();
mainnetAssets.forEach((asset) => {
  const symbol = asset.symbol.toUpperCase();
  mainnetMap.get(symbol)!.push(asset);
});
```

#### 步骤 4: 获取当前价格 (高可用)
```typescript
// usePricesQueryHA() 批量获取 + 后台重试
const { prices, failedAssets } = await fetchCurrentPricesBatch(assets);
if (failedAssets.length > 0) {
  startBackgroundRetry(failedAssets);
}
```

#### 步骤 5: 获取历史价格 (7天)
```typescript
// useAggregatedPriceHistories() 串行获取 + 后台重试
const results = await Promise.all(
  assets.map(asset => fetchTokenPriceHistoryHA(asset))
);
```

#### 步骤 6: 计算总净值
```typescript
const totalValue = assetsWithPrices.reduce((sum, asset) => {
  return sum + (asset.value ?? 0);
}, 0);
```

---

## 高可用价格查询机制

### 当前价格 HA (`price-current-ha.ts`)

#### 设计原则
1. **批量获取**: 最多 50 个代币/请求，不阻塞渲染
2. **失败隔离**: 单个代币失败不影响其他
3. **后台重试**: 失败代币异步重试，UI 实时更新
4. **多数据源兜底**: DefiLlama → CoinGecko

#### 流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                    fetchCurrentPricesHA(assets)                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 第一阶段: 批量获取 (fetchCurrentPricesBatch)          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ for chunk in assets.batch(50):                               │  │
│  │   fetchFromDefiLlamaBatch(chunk)                             │  │
│  │   → 成功: prices[uniqueId] = price                           │  │
│  │   → 失败: failedAssets.push(asset)                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
           ┌────────────────┐              ┌────────────────┐
           │ 有失败代币     │              │ 全部成功       │
           │ 启动后台重试   │              │ 直接返回       │
           └────────────────┘              └────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 第二阶段: 后台重试 (retryFailedPrices)                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ for asset in failedAssets:                                   │  │
│  │   retryWithBackoff(fetchFromDefiLlama, max=3)               │  │
│  │   → 成功: onSuccess(uniqueId, price) → 更新缓存             │  │
│  │   → 失败: retryWithBackoff(fetchFromCoinGecko, max=2)       │  │
│  │   → 成功: onSuccess(uniqueId, price) → 更新缓存             │  │
│  │   → 失败: 放弃，标记为 failed                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

#### 代码实现

```typescript
// 批量获取
async function fetchCurrentPricesBatch(assets: Asset[]) {
  const chunks = chunkArray(supportedAssets, 50);
  for (const chunk of chunks) {
    const batchPrices = await fetchFromDefiLlamaBatch(chunk);
    chunk.forEach(asset => {
      if (batchPrices[asset.uniqueId]) {
        prices[asset.uniqueId] = batchPrices[asset.uniqueId];
      } else {
        failedAssets.push(asset);
      }
    });
    await sleep(50); // 分片间隔
  }
}

// 后台重试
async function retryFailedPrices(failedAssets, onSuccess) {
  for (const asset of failedAssets) {
    let price = await retryWithBackoff(
      () => fetchFromDefiLlamaSingle(asset),
      `DefiLlama-${asset.symbol}`,
      3
    );
    
    if (price === null) {
      price = await retryWithBackoff(
        () => fetchFromCoinGecko(asset),
        `CoinGecko-${asset.symbol}`,
        2
      );
    }
    
    if (price !== null) {
      onSuccess(asset.uniqueId, { price, ... });
    }
  }
}
```

### 历史价格 HA (`price-history-ha.ts`)

#### 流程

```
fetchTokenPriceHistoryHA(asset)
         │
         ▼
┌─────────────────────────────────────────┐
│  1. fetchFromDefiLlama(asset) × 3      │
│  (指数退避: 1000ms, 2000ms, 4000ms)     │
└─────────────────────────────────────────┘
         │
    ✓ 成功?
    ├── 是 → 返回数据
    │
    └── 否 → 继续
         ▼
┌─────────────────────────────────────────┐
│  2. fetchFromCoinGecko(asset) × 2       │
│  (指数退避: 1000ms, 2000ms)             │
└─────────────────────────────────────────┘
         │
    ✓ 成功?
    ├── 是 → 返回数据
    │
    └── 否 → 返回 null (failed)
```

#### 7天趋势数据处理

```typescript
// 将每日数据压缩为 7 个点
function extract7DayTrend(prices) {
  if (prices.length <= 7) return prices.map(p => p.price);
  
  const step = (prices.length - 1) / 6;
  return Array.from({ length: 7 }, (_, i) => {
    const index = Math.round(i * step);
    return prices[index].price;
  });
}

// 计算 7 天变化百分比
function calculatePriceChange7d(history) {
  const firstPrice = history.prices[0].price;
  const lastPrice = history.prices[history.prices.length - 1].price;
  return ((lastPrice - firstPrice) / firstPrice) * 100;
}
```

---

## 资产聚合逻辑

### 按 Symbol 聚合 (`asset-utils.ts`)

```typescript
function groupAssetsBySymbol(assets, showTestnets) {
  // 主网: 按 symbol 聚合
  const mainnetMap = new Map<string, Asset[]>();
  mainnetAssets.forEach(asset => {
    const symbol = asset.symbol.toUpperCase();
    mainnetMap.set(symbol, [...(mainnetMap.get(symbol) || []), asset]);
  });
  
  // 构建 GroupedAsset
  mainnetMap.forEach((assetList, symbol) => {
    const totalValue = assetList.reduce((sum, a) => sum + (a.value ?? 0), 0);
    const totalBalance = assetList.reduce((sum, a) => sum + parseFloat(a.formatted), 0);
    const averagePrice = totalBalance > 0 ? totalValue / totalBalance : 0;
    
    result.push({
      symbol,
      name: assetList[0].name,
      logo: assetList[0].logo,
      totalValue,
      totalBalance: totalBalance.toFixed(18),
      averagePrice,
      chains: [...new Set(assetList.map(a => a.chainId))],
      assets: assetList,
      isTestnet: false,
    });
  });
}
```

### 测试网隔离

```typescript
if (showTestnets) {
  // 测试网资产不与主网合并，单独一行
  // 展示名带后缀: "ETH (Sepolia)"
  const testnetMap = new Map<string, Asset[]>();
  testnetAssets.forEach(asset => {
    const label = CHAIN_ID_TO_LABEL[asset.chainId];
    const symbolKey = `${asset.symbol} (${label})`;
    testnetMap.set(symbolKey, [...(testnetMap.get(symbolKey) || []), asset]);
  });
}
```

---

## 状态管理

### 价格状态类型

```typescript
// 单个资产价格状态
type PriceState = 
  | { status: 'loading'; price?: undefined }
  | { status: 'success'; price: number }
  | { status: 'failed'; price?: undefined };

// 聚合后资产价格状态
type CurrentPriceStatus = 'loading' | 'success' | 'failed';

// 历史价格状态
type PriceHistoryStatus = 'loading' | 'success' | 'failed';
```

### 状态计算逻辑

```typescript
// 聚合资产价格状态: success > loading > failed
function getGroupedAssetPriceAndValue(groupedAsset, getPriceState) {
  for (const asset of groupedAsset.assets) {
    const state = getPriceState(asset.uniqueId);
    if (state.status === 'success' && state.price > 0) {
      return { price: state.price, value: balance * price, priceStatus: 'success' };
    } else if (state.status === 'loading') {
      hasLoading = true;
    }
  }
  
  if (hasLoading) return { priceStatus: 'loading' };
  return { priceStatus: 'failed' };
}
```

### React Query 缓存策略

```typescript
const query = useQuery({
  queryKey,
  queryFn: async () => { /* ... */ },
  staleTime: 30000,      // 30秒内不重新获取
  gcTime: 300000,        // 5分钟后清理缓存
  refetchInterval: 15000, // 每15秒自动刷新
  refetchOnWindowFocus: true,
  retry: 1,              // 重试1次（服务层处理更多重试）
});
```

---

## UI 渲染流程

### AssetTable 组件数据流

```
┌─────────────────────────────────────────────────────────────────────┐
│                         useDashboardState()                         │
│  返回: { assets, filteredAssets, chains, isLoading, ... }           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
           ┌────────────────┐              ┌────────────────┐
           │ assets         │              │ filteredAssets │
           │ (全部资产)     │              │ (筛选后资产)   │
           └────────────────┘              └────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          AssetTable                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ for asset in filteredAssets:                                  │  │
│  │   <TableRow>                                                  │  │
│  │     <TableCell>#{index + 1}</TableCell>                       │  │
│  │     <TableCell>{asset.symbol}</TableCell>                     │  │
│  │     <TableCell><TrendLine data={asset.priceHistory7d} /></TableCell>  │  │
│  │     <TableCell>{formatPrice(asset.price)}</TableCell>         │  │
│  │     <TableCell>{formatBalance(asset.balance)}</TableCell>     │  │
│  │     <TableCell>{formatValue(asset.value)}</TableCell>         │  │
│  │     <TableCell><NetworkIcons chains={asset.chains} /></TableCell>     │  │
│  │   </TableRow>                                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 价格格式化规则

```typescript
// formatPrice() - 支持科学记数法
function formatPrice(price) {
  if (!price || price <= 0) return "暂无价格";
  if (price < 0.0001) return `$${price.toExponential(4)}`;  // 极小值
  if (price >= 1000000000) return `$${price.toExponential(2)}`; // 极大值
  if (price >= 1000) return `$${price.toLocaleString()}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

// formatValue() - 同理
// formatBalance() - 同理
```

### 状态展示

```typescript
{asset.priceStatus === 'loading' && (
  <Skeleton className="h-4 w-16" />
)}

{asset.priceStatus === 'failed' && (
  <span className="text-muted-foreground/60">暂无价格</span>
)}

{asset.priceStatus === 'success' && (
  <span className="text-foreground">{formatPrice(asset.price)}</span>
)}
```

### 趋势图组件

```typescript
<TrendLine 
  data={asset.priceHistory7d ?? []}
  status={asset.priceHistoryStatus}
  // status === 'loading': 显示骨架屏
  // status === 'failed': 显示虚线占位
  // status === 'success': 显示 7 天趋势图
/>
```

---

## 配置说明

### dashboard.config.ts

```typescript
export const dashboardConfig = {
  // 支持的网络
  networks: [
    { chain: chains.mainnet, enabled: true, priority: 1 },
    { chain: chains.arbitrum, enabled: true, priority: 2 },
    { chain: chains.optimism, enabled: true, priority: 3 },
    { chain: chains.base, enabled: true, priority: 4 },
    { chain: chains.polygon, enabled: true, priority: 5 },
    { chain: chains.sepolia, enabled: true, priority: 8 },
    // ... Avalanche, BSC (默认禁用)
  ],
  
  // 刷新间隔 (毫秒)
  refresh: {
    portfolio: 60000,  // 资产 60s
    price: 15000,      // 价格 15s
    transaction: 60000,
    nft: 120000,
  },
  
  // 重试配置
  retry: {
    maxRetries: 3,
    exponentialBackoff: true,
  },
  
  // 缓存配置
  cache: {
    enabled: true,
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: true,
  },
  
  // 速率限制
  rateLimit: {
    enabled: true,
    requestsPerSecond: 10,
  },
};
```

---

## 关键文件索引

| 文件 | 职责 |
|------|------|
| `src/services/portfolio.ts` | Alchemy API 资产获取 |
| `src/services/price-current-ha.ts` | 当前价格 HA 查询 |
| `src/services/price-history-ha.ts` | 历史价格 HA 查询 |
| `src/hooks/usePortfolio.ts` | 资产 + 价格数据整合 |
| `src/hooks/useAggregatedPortfolio.ts` | 按 Symbol 聚合资产 |
| `src/hooks/use-dashboard-state.ts` | Dashboard 状态管理 |
| `src/hooks/use-price-history.ts` | 历史价格状态管理 |
| `src/components/dashboard/AssetTable.tsx` | 资产表格展示 |
| `src/components/dashboard/TrendLine.tsx` | 7天趋势图 |
| `src/utils/asset-utils.ts` | 资产聚合工具 |
| `src/config/dashboard.config.ts` | 全局配置 |

---

## 总结

1. **数据流**: 钱包 → Alchemy → 资产聚合 → 价格 HA 查询 → UI 展示
2. **高可用**: DefiLlama 主数据源 + CoinGecko 兜底 + 后台重试
3. **状态管理**: React Query 缓存 + 状态分层 (loading/success/failed)
4. **性能优化**: 批量请求 + 分片 + 后台异步处理
5. **UI 体验**: 实时更新 + 科学记数法 + 清晰的错误状态
