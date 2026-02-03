# Covalent GoldRush SDK/API 调研报告

## 1. GoldRush 产品体系概览

```
┌────────────────────────────────────────────────────────────────┐
│                    Covalent GoldRush 生态                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐      ┌───────────────────────┐      │
│  │   GoldRush SDK      │      │   GoldRush Kit        │      │
│  │   (@covalenthq/     │      │   (@covalenthq/       │      │
│  │    client-sdk)      │      │    goldrush-kit)      │      │
│  │                     │      │                       │      │
│  │ • TypeScript SDK    │      │ • React 组件库        │      │
│  │ • 底层 API 封装     │      │ • 预构建 UI 组件      │      │
│  │ • 直接 HTTP API     │      │ • 支持 100+ 链        │      │
│  │ • 适用于服务端      │      │ • 适用于前端          │      │
│  └─────────────────────┘      └───────────────────────┘      │
│           │                              │                   │
│           └──────────────┬───────────────┘                   │
│                          │                                   │
│                  ┌───────▼────────┐                         │
│                  │  Unified API   │                         │
│                  │  (REST API)    │                         │
│                  └────────────────┘                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 2. GoldRush SDK 核心能力

### 2.1 支持的 API 端点

根据 GitHub 和文档信息，GoldRush SDK 提供以下核心功能：

| 功能 | SDK 方法 | 对应 REST API | 说明 |
|------|---------|--------------|------|
| **获取代币余额** | `getTokenBalances()` | `GET /v1/{chainId}/address/{address}/balances_v2/` | 原生代币 + ERC20 + 元数据 |
| **获取交易历史** | `getTransactions()` | `GET /v1/{chainId}/address/{address}/transactions_v2/` | 交易列表 + 详情 |
| **获取 NFT** | `getNfts()` | `GET /v1/{chainId}/address/{address}/balances_v2/?nft=true` | NFT 持仓 |
| **获取链数据** | `getBlock()` | `GET /v1/{chainId}/block_v2/{blockHeight}/` | 区块详情 |
| **获取价格** | `getPrices()` | `GET /v1/pricing/tickers/` | 代币价格 |

### 2.2 与 Alchemy 对比

| 维度 | Alchemy | Covalent GoldRush |
|------|---------|------------------|
| **API 类型** | JSON-RPC + SDK | REST API + SDK |
| **多链支持** | 单独调用每条链 | ✅ 支持批量多链查询 |
| **元数据** | 需二次请求 | ✅ 一次请求返回 |
| **价格数据** | 需额外调用 | ✅ 可选内置 |
| **NFT 支持** | 有 | 有 |
| **服务端兼容性** | ❌ SDK 有兼容性问题 | ✅ REST API 稳定 |
| **免费额度** | 30M CU/月 | 待确认 |
| **SDK 稳定性** | Next.js 服务端报错 | ✅ 客户端/服务端都可用 |

### 2.3 关键优势

```typescript
// Alchemy (当前实现) - 需要 3+N 个请求
const nativeBalance = await alchemyRpcCall('eth_getBalance');           // 1. 原生代币
const tokenBalances = await alchemyRpcCall('alchemy_getTokenBalances'); // 2. ERC20 列表
const metadata = await Promise.all(                                     // 3. N 个元数据请求
  tokens.map(t => alchemyRpcCall('alchemy_getTokenMetadata', [t]))
);

// Covalent (GoldRush) - 只需 1 个请求
const response = await fetch(
  `https://api.covalenthq.com/v1/1/address/${address}/balances_v2/?key=${API_KEY}`
);
// 返回：原生代币 + ERC20 + 元数据 + 价格 - 全部在一个响应中！
```

## 3. 项目兼容性分析

### 3.1 直接使用 SDK？

**GoldRush Kit (@covalenthq/goldrush-kit)**
- ❌ **不推荐直接使用**
- 原因：
  1. 这是一个 **UI 组件库**（TokenBalancesList, NFTGallery 等）
  2. 于 **2025 年 8 月 16 日被 Archive**（停止维护）
  3. 使用 `GoldRushProvider` 包裹组件，与现有架构不兼容
  4. 样式系统（Tailwind）可能与你的 shadcn/ui 冲突

**GoldRush SDK (@covalenthq/client-sdk)**
- ✅ **推荐使用**
- 纯 TypeScript SDK，无 UI 组件
- 可以像 Alchemy SDK 一样调用
- 但建议使用底层 REST API（更稳定）

### 3.2 推荐实现方案

```
┌────────────────────────────────────────────────────────────────┐
│                    推荐架构：Hybrid 方案                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   免费用户 (Free)                 付费会员 (Premium)            │
│        │                                │                      │
│        ▼                                ▼                      │
│  ┌───────────┐                   ┌───────────┐               │
│  │  Alchemy  │                   │ Covalent  │               │
│  │ fetch API │                   │ REST API  │               │
│  │ 30M CU/月 │                   │ 你的额度  │               │
│  └─────┬─────┘                   └─────┬─────┘               │
│        │                                │                      │
│        └────────────┬─────────────────────┘                      │
│                     │                                          │
│            ┌────────▼────────┐                                │
│            │  /api/portfolio │                                │
│            │  统一转换层    │                                │
│            │               │                                │
│            │ • 统一响应格式│                                │
│            │ • 错误处理    │                                │
│            │ • 数据缓存    │                                │
│            └───────┬───────┘                                │
│                    │                                          │
│            ┌───────▼───────┐                                │
│            │ usePortfolio  │                                │
│            │   (统一)      │                                │
│            └───────────────┘                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## 4. 一键切换实现方案

### 4.1 配置层

```typescript
// src/config/data-source.config.ts
export type DataSource = 'alchemy' | 'covalent';

export interface DataSourceConfig {
  source: DataSource;
  enabled: boolean;
  apiKey: string;
  priority: number; // 优先级，用于自动选择
}

export const dataSourceConfig = {
  // 开发模式可切换
  development: {
    allowSwitching: true,
    defaultSource: 'alchemy' as DataSource,
  },
  
  // 生产模式由会员等级决定
  production: {
    allowSwitching: false, // 不暴露给用户
    routingLogic: (userTier: string): DataSource => {
      if (userTier === 'premium') return 'covalent';
      return 'alchemy';
    }
  }
};
```

### 4.2 切换按钮设计（开发模式）

```typescript
// 位置：开发者工具栏 / Settings 页面
<DataSourceSwitcher 
  current={currentSource}
  onSwitch={(source) => {
    // 1. 更新 URL param: ?data_source=covalent
    // 2. 触发 React Query 重新获取
    // 3. 显示对比数据
  }}
  options={[
    { value: 'alchemy', label: 'Alchemy', description: '免费额度' },
    { value: 'covalent', label: 'Covalent', description: '付费会员专享' }
  ]}
/>
```

### 4.3 服务端路由逻辑

```typescript
// /api/portfolio/route.ts
export async function POST(request: Request) {
  const { address, userTier, preferredSource } = await request.json();
  
  // 决定使用哪个数据源
  let source: DataSource;
  
  if (process.env.NODE_ENV === 'development' && preferredSource) {
    // 开发模式：尊重前端选择
    source = preferredSource;
  } else {
    // 生产模式：由会员等级决定
    source = userTier === 'premium' ? 'covalent' : 'alchemy';
  }
  
  // 调用对应的服务
  const assets = source === 'covalent' 
    ? await fetchPortfolioFromCovalent(address)
    : await fetchPortfolioFromAlchemy(address);
  
  // 统一响应格式
  return Response.json({ 
    assets, 
    meta: { source, timestamp: Date.now() }
  });
}
```

### 4.4 数据转换层（关键）

```typescript
// src/services/adapters/covalent-adapter.ts
export function transformCovalentToAsset(covalentData: any): Asset {
  return {
    uniqueId: `${covalentData.chain_id}-${covalentData.contract_address}`,
    chainId: covalentData.chain_id,
    address: covalentData.contract_address || '0x0000000000000000000000000000000000000000',
    symbol: covalentData.contract_ticker_symbol,
    name: covalentData.contract_name,
    decimals: covalentData.contract_decimals,
    balance: covalentData.balance,
    formatted: formatUnits(
      BigInt(covalentData.balance), 
      covalentData.contract_decimals
    ),
    logo: covalentData.logo_url,
    isNative: !covalentData.contract_address, // 无合约地址即为原生代币
    // Covalent 特有：直接包含价格
    price: covalentData.quote_rate, // USD 价格
    value: covalentData.quote, // 总价值
  };
}
```

## 5. 实现难度评估

### 5.1 工作量估算

| 任务 | 难度 | 时间 | 说明 |
|------|------|------|------|
| Covalent 服务层 | ⭐⭐ | 2-4h | 参考已有 Alchemy 实现 |
| 数据转换层 | ⭐⭐⭐ | 4-6h | 字段映射 + 类型适配 |
| 切换按钮（开发） | ⭐ | 1-2h | URL param + 状态管理 |
| 会员路由逻辑 | ⭐⭐ | 2-3h | 需要用户系统配合 |
| 统一响应格式 | ⭐⭐ | 3-4h | 确保前端无感知切换 |
| 测试验证 | ⭐⭐⭐ | 4-6h | 对比 Alchemy 数据一致性 |
| **总计** | | **16-25h** | 约 2-3 个工作日 |

### 5.2 技术风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| Covalent 数据与 Alchemy 不一致 | 中 | 高 | 数据对比测试 |
| Covalent API 延迟更高 | 低 | 中 | 性能测试 + 缓存 |
| 免费额度不足 | 待确认 | 高 | 确认定价后再上线 |
| SDK 服务端兼容性问题 | 低 | 高 | 使用 REST API 而非 SDK |

### 5.3 推荐实施顺序

```
Phase 1: 基础实现 (Day 1)
├── 1. 创建 Covalent 服务层 (参考 Alchemy)
├── 2. 实现数据转换适配器
└── 3. 硬编码切换到 Covalent 测试

Phase 2: 切换功能 (Day 2)
├── 4. 添加切换按钮（仅开发模式）
├── 5. 实现 /api/portfolio 路由选择
└── 6. 统一响应格式验证

Phase 3: 验证优化 (Day 3)
├── 7. 对比测试：Alchemy vs Covalent
├── 8. 性能测试
└── 9. 确认 Covalent 定价和额度
```

## 6. 结论与建议

### 6.1 是否值得实现？

✅ **值得实现**，理由：
1. Covalent **一次请求返回完整数据**（代币 + 元数据 + 价格），显著减少请求数
2. REST API 稳定性优于 Alchemy SDK
3. 可以支持 **"免费/付费" 分层商业模式**
4. 实现难度中等（约 2-3 天）

### 6.2 立即行动项

1. **确认 Covalent 免费额度**：登录 dashboard 查看每月限额
2. **对比测试**：用同一个地址分别调用 Alchemy 和 Covalent，对比数据完整性
3. **定价确认**：如果免费额度不足，确认付费计划价格

### 6.3 关键决策点

**决策 1：是否完全迁移到 Covalent？**
- ❌ 不推荐 - 增加供应商依赖风险
- ✅ 推荐 - 保持 Alchemy 为主，Covalent 作为增值功能

**决策 2：切换按钮给谁用？**
- 选项 A：仅开发调试（推荐立即实施）
- 选项 B：给付费会员选择（需要用户系统支持）
- 选项 C：全自动后端选择（无感知切换）

**决策 3：价格数据用谁的？**
- Covalent 返回的价格 vs DefiLlama
- 需要对比精度和延迟

---

**下一步建议**：
1. 我可以先帮你写一个简单的 Covalent 测试脚本，对比数据质量
2. 确认额度后，可以实现开发模式的切换按钮
3. 根据测试结果决定是否投入完整实现

**你怎么看这个方案？** 需要我先做数据对比测试吗？
