# 項目存檔記錄

本文檔記錄每次提交的存檔編號和對應的開發進度，方便隨時回檔。

---

## 存檔 #001 - 項目初始化
**提交哈希**: `b254336`  
**日期**: 初始提交  
**開發進度**:
- 使用 Create Next App 初始化項目
- 基礎 Next.js 16 項目結構

---

## 存檔 #002 - 初始功能實現
**提交哈希**: `579eaec`  
**日期**: Initial commit  
**開發進度**:
- 基礎項目結構建立
- 初始功能實現

---

## 存檔 #003 - 項目結構重構
**提交哈希**: `c828d84`  
**日期**: 重構項目結構  
**開發進度**:
- 重構項目結構：採用分層架構

---

## 存檔 #004 - 分層架構重構完成
**提交哈希**: `2c783cf`  
**日期**: Merge branch 'main'  
**開發進度**:
- 合併主分支更改

---

## 存檔 #005 - 完整分層架構實現
**提交哈希**: `7f0a68a`  
**日期**: 2026-01-24  
**開發進度**:
- ✅ 創建 `src/types/assets.ts` - Asset 相關類型定義
- ✅ 創建 `src/services/portfolio.ts` - Alchemy 核心業務邏輯
- ✅ 創建 `src/services/price.ts` - 價格服務（未來擴展）
- ✅ 更新 `src/hooks/usePortfolio.ts` - 合併 React Query 封裝邏輯
- ✅ 移動 `src/config/dashboard.config.ts` - Dashboard 配置
- ✅ 更新所有文件引用路徑
- ✅ 刪除舊文件，完成重構

**項目結構**:
```
src/
├── types/
│   └── assets.ts          # Asset 相關類型定義
├── services/
│   ├── portfolio.ts       # Alchemy 核心業務邏輯
│   └── price.ts           # 價格服務
├── hooks/
│   └── usePortfolio.ts    # React Query 封裝 Hook
└── config/
    └── dashboard.config.ts # Dashboard 配置
```

**功能特性**:
- 多鏈資產查詢（Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, BNB Chain, Sepolia）
- DefiLlama 圖標 CDN 兜底機制
- TanStack Query 數據緩存和自動刷新
- RainbowKit 錢包連接集成

---

## 存檔 #006 - 分層架構重構完成（最終版）
**提交哈希**: `待提交`  
**日期**: 2026-01-26  
**開發進度**:
- ✅ 完成項目結構重構，採用清晰的分層架構
- ✅ 創建 `src/types/assets.ts` - 統一管理 Asset 相關類型定義
- ✅ 創建 `src/services/portfolio.ts` - 純業務邏輯，只保留 Alchemy 核心查詢功能
- ✅ 創建 `src/services/price.ts` - 價格服務模塊（為未來價格計算功能預留）
- ✅ 重構 `src/hooks/usePortfolio.ts` - 合併 portfolio-queries.ts 邏輯，統一 React Query 封裝
- ✅ 移動 `src/config/dashboard.config.ts` - 配置統一管理
- ✅ 更新所有文件引用路徑為 `@/` 別名
- ✅ 刪除舊文件，清理項目結構
- ✅ 改進 ERC20 代幣 Logo 獲取邏輯，添加 DefiLlama 兜底機制

**項目結構**:
```
src/
├── types/
│   └── assets.ts          # Asset 相關類型定義
├── services/
│   ├── portfolio.ts       # Alchemy 核心業務邏輯（純服務層）
│   └── price.ts           # 價格服務（未來擴展）
├── hooks/
│   └── usePortfolio.ts    # React Query 封裝 Hook（合併查詢邏輯）
└── config/
    └── dashboard.config.ts # Dashboard 配置
```

**技術改進**:
- 分層架構：類型定義、服務層、Hook 層、配置層清晰分離
- 代碼組織：業務邏輯與 React 邏輯分離，易於測試和維護
- Logo 兜底：優先使用 Alchemy，缺失時自動使用 DefiLlama CDN
- 統一導入：所有文件使用 `@/` 別名，路徑更清晰

**功能特性**:
- 多鏈資產查詢（8 條鏈：Ethereum, Arbitrum, Optimism, Base, Polygon, Avalanche, BNB Chain, Sepolia）
- DefiLlama 圖標 CDN 兜底機制（解決 Alchemy 元數據缺失問題）
- TanStack Query 數據緩存和自動刷新
- RainbowKit 錢包連接集成
- TokenBalanceType.DEFAULT_TOKENS 優化查詢

---

## 使用說明

### 回檔到指定存檔

```bash
# 查看所有提交
git log --oneline

# 回檔到指定提交
git checkout <提交哈希>

# 創建新分支基於指定存檔
git checkout -b restore-archive-<編號> <提交哈希>
```

### 查看存檔詳情

```bash
# 查看指定提交的詳細信息
git show <提交哈希>

# 查看指定提交的文件變更
git diff <提交哈希>^..<提交哈希>
```

---

**最後更新**: 2026-01-24
