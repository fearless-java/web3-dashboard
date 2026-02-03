# Alchemy API 研究报告

## 关键发现

### 1. **当前最佳方案: 保持 fetch + JSON-RPC**

**原因**: Alchemy 的 `getTokensForOwner` 和 Portfolio API 等高级方法**不是标准的 JSON-RPC 方法**，而是 SDK 层面的封装，无法通过 HTTP 直接调用。

```bash
# 测试证实：
# alchemy_getTokensForOwner → "Unsupported method"
# REST API 端点 → 不存在或未公开
```

### 2. **JSON-RPC 可用方法**

根据 Alchemy 文档，目前可通过 HTTP 调用的方法：

| 方法 | 用途 | 状态 |
|------|------|------|
| `eth_getBalance` | 原生代币余额 | ✅ 可用 |
| `alchemy_getTokenBalances` | ERC20 代币余额 | ✅ 可用 |
| `alchemy_getTokenMetadata` | 代币元数据 | ✅ 可用 |
| `alchemy_getTokensForOwner` | 余额+元数据 | ❌ 不可用（仅 SDK） |

### 3. **优化方向**

#### **方案 A: 请求合并（推荐）**

将单链的多个请求合并为 1 个 HTTP 请求（JSON-RPC Batch）：

```typescript
// 当前：3+N 个 HTTP 请求（N=代币数量）
// 优化后：1 个 HTTP 请求

const batchRequest = [
  { jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 1 },
  { jsonrpc: '2.0', method: 'alchemy_getTokenBalances', params: [address, 'DEFAULT_TOKENS'], id: 2 },
  // 每个代币的 metadata 请求
  ...tokenAddresses.map((addr, i) => ({
    jsonrpc: '2.0',
    method: 'alchemy_getTokenMetadata',
    params: [addr],
    id: i + 3
  }))
];

const response = await fetch(rpcUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(batchRequest),
});

const results = await response.json(); // 返回数组
```

**优势**:
- 减少 HTTP 连接开销
- 8 个链从几十上百个请求降到 8 个请求
- Alchemy 支持 JSON-RPC batch（需要测试确认）

#### **方案 B: 第三方替代方案**

| 服务 | 特点 | 适用性 |
|------|------|--------|
| **Covalent** | 跨链统一 API，一次请求获取多链 | ⭐ 高度推荐 |
| **DeBank** | 专为钱包看板设计，有丰富的元数据 | 可能需要授权 |
| **1inch Portfolio API** | 多链聚合，有价格数据 | 交易导向 |

**Covalent 示例**:
```typescript
// 一次请求获取 Ethereum 所有代币
const response = await fetch(
  `https://api.covalenthq.com/v1/1/address/${address}/balances_v2/?key=${API_KEY}`
);
// 返回：原生代币 + ERC20 余额 + 元数据 + 价格
```

#### **方案 C: 并行优化（当前已实现）**

保持当前 `Promise.all()` 并行策略，但优化并发控制：

```typescript
// 限制并发数，避免触发 Alchemy 速率限制
const CONCURRENCY = 3; // 同时只处理 3 个链
const batches = chunk(networks, CONCURRENCY);

for (const batch of batches) {
  await Promise.all(batch.map(network => fetchChainAssets(...)));
  await sleep(100); // 批次间延迟
}
```

## **建议**

### **短期（立即）**
✅ **保持当前 fetch + JSON-RPC 实现**，它稳定工作
- 你的代码已经使用 `Promise.all()` 并行处理多链
- 元数据请求已经并行化

### **中期（1-2 周）**
1. **测试 JSON-RPC Batch** - 验证 Alchemy 是否支持批量请求，支持则合并单链请求
2. **评估 Covalent** - 如果请求量持续增加，Covalent 的跨链统一 API 是最佳替代

### **长期（如果需要）**
- **Viem + 多 RPC Provider** - 分散依赖，使用公共 RPC（LlamaNodes, Ankr, etc.）

## **关于你的重构前架构**

根据 `DATA_FLOW.md`，你已经有很好的基础：
- ✅ TanStack Query 缓存
- ✅ 高可用价格查询（DefiLlama + CoinGecko）
- ✅ 批量请求分片
- ✅ 后台重试机制

当前 fetch 方案是合理的，与这些基础设施兼容。

## **结论**

**不需要改用 REST API 或寻找替代端点**，因为：
1. Alchemy 的高级功能（getTokensForOwner、Portfolio API）**仅通过 SDK 提供**，无法 HTTP 调用
2. SDK 在 Next.js 服务端有兼容性问题（`missing response`）
3. 当前 fetch + JSON-RPC 是**最优可行方案**

**唯一可行的优化**是测试 JSON-RPC Batch，将单链请求从 N 个减少到 1 个。
