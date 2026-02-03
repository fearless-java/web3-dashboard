# API 对比分析报告：Alchemy vs Covalent

## 1. Alchemy 额度和定价分析

### 免费套餐（Free Tier）
| 指标 | 额度 |
|------|------|
| **月计算单元 (CU)** | 30M CU/月 |
| **请求速率** | 25 req/s (500 CU/s) |
| **应用数量** | 5 个 |
| **Webhook** | 5 个 |
| **价格** | $0 |

### 计算单元 (CU) 消耗参考
根据 Alchemy 文档：
- `eth_getBalance`: ~10 CU
- `alchemy_getTokenBalances`: ~100-200 CU (Enhanced API)
- `alchemy_getTokenMetadata`: ~50-100 CU (Enhanced API)

### 你的使用场景估算
假设一个用户持有 20 个代币，查询 8 条链：

**每次刷新请求量**:
- 原生代币: 8 链 × 10 CU = 80 CU
- 代币余额: 8 链 × 150 CU = 1,200 CU  
- 代币元数据: 20 代币 × 8 链 × 80 CU = 12,800 CU
- **总计**: ~14,000 CU/次

**月度估算** (假设每用户每天刷新 10 次):
- 14,000 × 10 × 30 = **4.2M CU/用户/月**

**免费额度可用用户数**: 30M ÷ 4.2M = **~7 个活跃用户**

### 结论
✅ **免费额度对小项目足够** (7 个活跃用户)
⚠️ 用户数增长后需要升级或优化

---

## 2. Alchemy SDK 无法使用的原因分析

### 已验证的事实
| 环境 | SDK 状态 | 说明 |
|------|---------|------|
| Node.js 独立脚本 | ✅ 正常 | SDK 本身没问题 |
| curl/fetch 直接调用 | ✅ 正常 | API key 有效 |
| Next.js API route | ❌ `missing response` | 服务端环境有问题 |

### 可能原因分析

#### 原因 A: SDK 底层 HTTP Agent 问题
```
Alchemy SDK → Ethers.js JsonRpcProvider → Node.js HTTP Agent
                                        ↓
                             Next.js 可能覆盖了默认 Agent
```

**证据**:
- 错误 `serverError={}` 表示请求未到达服务器
- `missing response` 通常表示连接被中断或超时
- 直接 `fetch` 使用 Node.js 原生 `fetch` (undici)，而 SDK 使用旧版 HTTP 模块

#### 原因 B: Next.js 编译/打包问题
- Next.js 可能对 `alchemy-sdk` 依赖进行了 tree-shaking 或编译优化
- 某些 Ethers.js 子依赖在服务端被错误处理

#### 原因 C: 连接池/Keep-alive 冲突
- SDK 可能使用 keep-alive 连接池
- Next.js 服务端环境可能限制长连接
- 并发请求时连接池耗尽

### 深入调查建议
如果需要彻底解决这个问题，可以：

1. **测试不同 Node.js 版本** (18 vs 20 vs 22)
2. **检查 Next.js 配置** (experimental flags, edge runtime)
3. **抓包分析** SDK 和 fetch 的请求头差异
4. **尝试禁用 SDK 的 batch 和重试**: 
   ```typescript
   new Alchemy({ 
     apiKey, 
     network, 
     batchRequests: false,
     maxRetries: 0 
   })
   ```

**结论**: fetch 方案稳定可用，调查 SDK 问题优先级较低

---

## 3. Covalent API 分析

### Covalent 简介
- 统一的跨链数据 API
- 专门设计用于钱包和 DeFi 看板
- 一次请求可获取多链数据

### 核心 API: `balances_v2`
```
GET /v1/{chainId}/address/{address}/balances_v2/
```

**返回数据**:
- 原生代币余额 + 元数据
- 所有 ERC20 代币 + 元数据 + logo
- 可选价格数据
- NFT 数据（可选）

### 优势对比

| 功能 | Alchemy (当前) | Covalent (潜在) |
|------|---------------|-----------------|
| 单链代币查询 | 3+N 个请求 | 1 个请求 |
| 多链聚合 | 需要手动遍历 | 支持批量 |
| 元数据获取 | 每个代币单独请求 | 自动包含 |
| 价格数据 | 需要 DefiLlama | 可选内置 |
| HTTP 兼容性 | SDK 有问题 | REST API 稳定 |

### 定价 (需要验证)
根据公开信息：
- **免费套餐**: 通常包含 10万-100万次请求/月
- **付费套餐**: ~$50/月起

**注意**: Covalent 的具体定价需要查看其官网定价页面或联系销售

### 迁移工作量评估

#### 方案 A: 混合架构 (推荐)
```
┌──────────────────────────────────────────────────────┐
│                  usePortfolio Hook                   │
│                    (保持现有)                         │
└──────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
    ┌───────▼───────┐               ┌───────▼───────┐
    │  Alchemy API  │               │  Covalent API │
    │ (Primary: 余额)│               │ (Fallback)   │
    └───────────────┘               └───────────────┘
```

**实现**: 主数据用 Alchemy，Alchemy 失败时自动降级到 Covalent

#### 方案 B: 完全迁移
- 替换 `fetchPortfolio` 实现
- 更新数据转换逻辑
- 测试多链兼容性

**工作量**: 2-3 天

---

## 4. 推荐方案

### 短期 (立即)
✅ **保持当前 fetch + Alchemy JSON-RPC**
- 免费额度够用 (7 用户)
- 实现稳定，无需改动

### 中期 (1-2 周)
**方案 1: 优化现有实现** (推荐)
- 测试 JSON-RPC Batch (减少请求数)
- 添加 Covalent 作为降级方案
- 优化请求缓存策略

**方案 2: 迁移到 Covalent**
- 如果 Alchemy 额度成为瓶颈
- 如果定价更优惠
- 需要完整测试多链支持

### 长期
- 监控使用量和成本
- 评估是否需要多数据源 HA
- 考虑自建缓存层

---

## 5. 待确认问题

### 需要你确认/测试
1. **Covalent 具体定价** - 官网或联系销售
2. **Alchemy Batch 支持** - 测试 JSON-RPC batch 请求
3. **当前实际使用量** - Alchemy Dashboard 查看月度 CU 消耗

### 需要我调研
1. Covalent API 详细文档
2. Covalent 多链批量查询能力
3. 其他替代方案 (Ankr, QuickNode)

---

**总结**: 
- Alchemy 免费额度对初期够用
- SDK 问题可忽略，fetch 方案稳定
- Covalent 是潜在优化方向，但需确认定价
