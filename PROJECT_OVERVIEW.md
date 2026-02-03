# Crypto Dashboard - 项目文档

## 1. 项目概述

**Crypto Dashboard** 是一个现代化的加密货币资产追踪仪表板,支持多链钱包资产聚合展示。项目采用 CoinGecko 风格的极简设计,提供清新的浅色主题和完整的深色模式支持。

### 1.1 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 16.1.4 + React 19.2.3 + TypeScript 5 |
| **样式** | Tailwind CSS v4 + shadcn/ui 组件库 |
| **Web3** | Wagmi 2.19.5 + RainbowKit 2.2.10 + Viem |
| **数据获取** | TanStack Query (React Query) 5.90.20 |
| **状态管理** | Zustand 5.0.10 |
| **图表** | Recharts 3.7.0 |
| **动画** | Motion 12.29.2 |
| **数据源** | Alchemy SDK + DefiLlama API + Etherscan API |

### 1.2 核心功能

- **多链资产聚合**: 支持 Ethereum、Arbitrum、Optimism、Base、Polygon、Avalanche、BNB Chain、Sepolia 等网络
- **实时价格追踪**: 通过 DefiLlama API 获取代币价格,15秒自动刷新
- **资产分组展示**: 按代币符号聚合跨链资产,支持测试网隔离
- **Gas 统计**: 显示当前 Gas 价格和用户历史 Gas 消耗
- **巨鲸观察模式**: 支持输入任意地址查看其资产(只读模式)
- **主题定制**: 6种主题色(蓝/绿/紫/橙/粉/青) + 深浅模式切换

---

## 2. 项目架构

### 2.1 目录结构

```
src/
├── app/                          # Next.js App Router
│   ├── api/gas-spent/route.ts   # API路由:获取Gas消耗
│   ├── dashboard/               # Dashboard页面
│   │   ├── layout.tsx           # Dashboard布局(使用PortalLayout)
│   │   └── page.tsx             # Dashboard主页面
│   ├── lib/                     # 全局Provider
│   │   ├── query-provider.tsx   # TanStack Query Provider
│   │   ├── theme-provider.tsx   # 主题Provider
│   │   ├── wallet-provider.tsx  # Wagmi + RainbowKit Provider
│   │   └── utils.ts             # 工具函数
│   ├── globals.css              # 全局样式 + CSS变量
│   ├── layout.tsx               # 根布局
│   └── page.tsx                 # 首页
│
├── components/                   # 组件
│   ├── dashboard/               # Dashboard专属组件
│   │   ├── AssetTable.tsx       # 资产表格
│   │   ├── ChainFilter.tsx      # 链筛选器
│   │   ├── DashboardSubNav.tsx  # Dashboard子导航
│   │   ├── GasWidget.tsx        # Gas消耗组件
│   │   ├── HeroSection.tsx      # 总资产展示区域
│   │   └── TrendLine.tsx        # 趋势折线图
│   ├── layout/                  # 布局组件
│   │   ├── Header.tsx           # 页面头部
│   │   └── PortalLayout.tsx     # 居中Portal布局
│   ├── magicui/                 # 动画/特效组件
│   │   ├── animated-grid-pattern.tsx
│   │   ├── blur-fade.tsx
│   │   ├── number-ticker.tsx    # 数字滚动动画
│   │   └── shiny-button.tsx
│   ├── ui/                      # shadcn/ui 基础组件
│   │   ├── avatar.tsx, button.tsx, card.tsx, etc.
│   ├── navbar.tsx               # 全局导航栏
│   └── theme-toggle.tsx         # 主题切换组件
│
├── config/                       # 配置文件
│   └── dashboard.config.ts      # 全局Dashboard配置
│
├── constants/                    # 常量定义
│   └── chains.ts                # 链相关常量
│
├── hooks/                        # 自定义Hooks
│   ├── useAggregatedPortfolio.ts # 聚合资产Hook
│   ├── use-chain-assets.ts      # 单链资产筛选
│   ├── use-dashboard-state.ts   # Dashboard状态管理
│   ├── use-dashboard-view.ts    # Dashboard视图模式
│   ├── use-gas-price.ts         # Gas价格查询
│   ├── use-gas-spent.ts         # Gas消耗查询
│   ├── usePortfolio.ts          # 资产组合查询
│   └── useTransactions.ts       # 交易历史查询
│
├── lib/                          # 工具库
│   └── utils.ts                 # cn()等工具函数
│
├── services/                     # 数据服务层
│   ├── gas.ts                   # Gas相关服务(Etherscan)
│   ├── portfolio.ts             # 资产组合服务(Alchemy)
│   ├── price.ts                 # 价格服务(DefiLlama)
│   └── transactions.ts          # 交易服务
│
├── stores/                       # 状态管理(Zustand)
│   ├── settings-store.ts        # 用户设置(主题、主题色等)
│   └── theme-store.ts           # [废弃]主题Store
│
├── types/                        # TypeScript类型定义
│   ├── assets.ts                # 资产相关类型
│   ├── config.ts                # 配置类型
│   └── transactions.ts          # 交易相关类型
│
└── utils/                        # 工具函数
    ├── asset-utils.ts           # 资产处理工具
    └── network.ts               # 网络相关工具
```

### 2.2 数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                      UI Components                          │
│  HeroSection, AssetTable, ChainFilter, DashboardSubNav      │
└──────────────────────────┬──────────────────────────────────┘
                           │ uses
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Custom Hooks                           │
│  useDashboardState (核心状态聚合)                            │
│  ├─ useAggregatedPortfolio (资产聚合)                        │
│  │   └─ usePortfolio (资产查询 + 价格查询)                    │
│  ├─ useChainAssets (单链筛选)                                │
│  ├─ useGasPrice (Gas价格)                                    │
│  └─ useGasSpent (Gas消耗)                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ calls
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Services                               │
│  fetchPortfolio (Alchemy SDK)                               │
│  fetchTokenPrices (DefiLlama API)                           │
│  fetchTotalGasSpent (Etherscan API)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetches
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      External APIs                          │
│  Alchemy, DefiLlama, Etherscan                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 核心模块详解

### 3.1 配置系统 (`config/dashboard.config.ts`)

所有全局配置集中管理:

```typescript
export const dashboardConfig: DashboardConfig = {
  networks: [...],           // 支持的区块链网络
  alchemyApiKey: "...",      // Alchemy API密钥
  walletConnectProjectId: "...",
  refresh: {                 // 刷新间隔配置
    portfolio: 60000,        // 资产数据: 60秒
    price: 15000,            // 价格数据: 15秒
    transaction: 60000,
    nft: 120000,
  },
  retry: { maxRetries: 3, retryDelay: 1000 },
  cache: { staleTime: 30000, gcTime: 300000 },
  features: { multiChain: true, nftSupport: true, ... },
  ui: {                      // UI默认值
    defaultTheme: 'light',
    defaultThemeColor: 'blue',
  },
};
```

### 3.2 资产类型系统 (`types/assets.ts`)

```typescript
// 单条资产
export type Asset = {
  uniqueId: string;        // 链ID-合约地址
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;         // 原始余额
  formatted: string;       // 格式化后余额
  logo?: string;
  isNative: boolean;
  price?: number;
  value?: number;
};

// 聚合资产(跨链同一代币)
export type GroupedAsset = {
  symbol: string;
  name: string;
  logo?: string;
  totalValue: number;
  totalBalance: string;
  averagePrice: number;
  chains: number[];
  assets: Asset[];
  isTestnet?: boolean;
};
```

### 3.3 Dashboard状态管理 (`hooks/use-dashboard-state.ts`)

核心Hook,聚合所有Dashboard数据:

```typescript
export function useDashboardState(overrideAddress?: string) {
  // 1. 获取连接的钱包地址或使用覆盖地址
  const { address: walletAddress } = useAccount();
  const effectiveAddress = overrideAddress ?? walletAddress;

  // 2. 获取聚合资产数据
  const { aggregatedData, isLoading, refetch } = useAggregatedPortfolio(
    effectiveAddress, 
    effectiveConnected, 
    showTestnets
  );

  // 3. 单链筛选
  const { displayedAssets, chainNetWorth } = useChainAssets(
    aggregatedData, 
    selectedChain
  );

  // 4. 获取Gas价格
  const { gasPrice } = useGasPrice(targetChainId);

  return {
    totalNetWorth: chainNetWorth,
    totalChange24h: 0,       // TODO: 待实现
    totalChangePercent: 0,   // TODO: 待实现
    assets, chains, selectedChain,
    filteredAssets,
    gasPrice,
    // ... actions
  };
}
```

### 3.4 资产聚合逻辑 (`hooks/useAggregatedPortfolio.ts` + `utils/asset-utils.ts`)

**聚合策略**:
- 主网资产: 按 symbol 分组聚合(如所有链的 ETH 合并为一行)
- 测试网资产: 按 (symbol + chainId) 分组,不与主网合并(如 "ETH (Sepolia)")
- 净值计算: 排除测试网资产,避免零价值测试币稀释主网单价

```typescript
// 聚合示例
const grouped = groupAssetsBySymbol(assets, showTestnets);
// 结果:
// - ETH (主网+Arbitrum+Optimism等) 合并为一行
// - ETH (Sepolia) 单独一行
```

### 3.5 价格获取服务 (`services/price.ts`)

使用 DefiLlama API 批量获取价格:

```typescript
// 生成 DefiLlama 查询键: ethereum:0xc02aaa...
const llamaKey = assetToLlamaKey(asset);

// 批量查询(每批最多60个)
const prices = await fetchTokenPrices(assets);

// 支持的分批处理 + 错误隔离
const chunks = chunkArray(keys, 60);
const results = await Promise.allSettled(chunks.map(fetchBatch));
```

### 3.6 Gas消耗统计 (`services/gas.ts` + `hooks/use-gas-spent.ts`)

使用 Etherscan API 计算用户历史 Gas 消耗:

```typescript
// 获取用户所有交易历史
const transactions = await fetchEtherscanTransactions(address);

// 计算总 Gas (只计算用户发出的交易)
const totalGas = transactions
  .filter(tx => tx.from.toLowerCase() === address.toLowerCase())
  .reduce((sum, tx) => sum + (BigInt(tx.gasUsed) * BigInt(tx.gasPrice)), 0n);

return formatEther(totalGas);  // 返回 ETH 字符串
```

---

## 4. UI组件系统

### 4.1 布局架构

- **PortalLayout**: Dashboard 使用的居中单列布局
- **全局Navbar**: 在 `/dashboard` 路径下自动隐藏

### 4.2 主题系统

**CSS变量方案**:
```css
:root {
  /* 基础颜色 */
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.15 0.01 285);
  
  /* 主题色(可切换) */
  --primary: oklch(0.55 0.22 262);        /* 蓝色 */
  --primary-hover: oklch(0.6 0.22 262);
  
  /* 通过 .theme-{color} 类切换 */
}

.theme-green { --primary: oklch(0.55 0.22 142); }
.theme-purple { --primary: oklch(0.55 0.22 322); }
/* ... */
```

**首屏无闪烁**: 通过内联 script 在 React 水合前读取 localStorage 并应用主题类

### 4.3 关键组件

| 组件 | 功能 | Props |
|------|------|-------|
| `HeroSection` | 显示总资产和 Gas 信息 | `totalNetWorth`, `gasPrice`, `totalGasSpent` |
| `AssetTable` | CoinGecko 风格资产列表 | `assets`, `chains`, `isLoading` |
| `ChainFilter` | 链筛选器 + 测试网开关 | `chains`, `selectedChain`, `showTestnets` |
| `DashboardSubNav` | Dashboard子导航 + 巨鲸模式 | `currentMode`, `onModeChange`, `onTrackSubmit` |
| `GasWidget` | Gas消耗显示组件 | `totalGasSpent`, `isLoading` |

---

## 5. 数据查询策略 (TanStack Query)

### 5.1 查询配置

```typescript
// 资产查询
useQuery({
  queryKey: ['portfolio', address],
  queryFn: () => fetchPortfolio({ address }),
  refetchInterval: 60000,           // 60秒刷新
  staleTime: 30000,
  gcTime: 300000,
  retry: 3,
});

// 价格查询(更频繁)
useQuery({
  queryKey: ['token-prices', assetIds],
  queryFn: () => fetchTokenPrices(assets),
  refetchInterval: 15000,           // 15秒刷新
  enabled: assets.length > 0,
});
```

### 5.2 依赖关系

```
usePortfolio
  ├── usePortfolioQuery (资产数据)
  │   └── enabled: isConnected && !!address
  └── usePricesQuery (价格数据)
      └── enabled: portfolioQuery.isSuccess && assets.length > 0

useDashboardState
  └── useAggregatedPortfolio
      └── usePortfolio
```

---

## 6. 扩展和定制

### 6.1 添加新链

在 `config/dashboard.config.ts` 中添加:

```typescript
export const dashboardConfig: DashboardConfig = {
  networks: [
    // ...现有网络
    createNetworkConfig(
      chains.zora,           // viem chain
      true,                  // enabled
      9,                     // priority
      'Zora',                // customName
      'https://icons.llamao.fi/icons/chains/rsz_zora',
      // alchemyNetwork: 如果没有则省略
    ),
  ],
};
```

同时在 `utils/network.ts` 添加 Trust Wallet 映射:

```typescript
export const getTrustWalletChainName = (chainId: number): string | undefined => {
  const chainNameMap: Record<number, string> = {
    // ...
    7777777: 'zora',
  };
  return chainNameMap[chainId];
};
```

### 6.2 添加新的数据源

1. 在 `services/` 创建新的服务文件
2. 在 `hooks/` 创建对应的 Hook
3. 在 `use-dashboard-state.ts` 中集成

### 6.3 主题定制

在 `globals.css` 中添加新的主题色:

```css
:root {
  --theme-red: oklch(0.55 0.22 25);
  --theme-red-hover: oklch(0.6 0.22 25);
  --theme-red-active: oklch(0.5 0.22 25);
}

.theme-red {
  --primary: var(--theme-red);
  --primary-hover: var(--theme-red-hover);
  /* ... */
}
```

在 `stores/settings-store.ts` 添加:

```typescript
export type ThemeColor = 'blue' | 'green' | ... | 'red';
```

---

## 7. 环境变量

```bash
# .env.local
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
ETHERSCAN_API_KEY=your_etherscan_api_key
```

---

## 8. 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run start    # 启动生产服务器
npm run lint     # 运行 ESLint
```

---

## 9. 待办事项 / 已知问题

- [ ] 24小时价格变化数据需要接入历史价格 API
- [ ] Gas 消耗统计目前仅支持 Ethereum 主网
- [ ] NFT 资产展示功能尚未实现
- [ ] DeFi 协议收益统计功能尚未实现
- [ ] 交易历史页面待完善

---

## 10. 相关链接

- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)
- [RainbowKit Documentation](https://www.rainbowkit.com/)
- [Alchemy SDK Documentation](https://docs.alchemy.com/)
- [DefiLlama API](https://defillama.com/docs/api)
