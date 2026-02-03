/**
 * Gas 价格相关类型
 * 统一真理来源 (Single Source of Truth)
 */

export interface GasPriceData {
  /** Safe Gas Price - 低优先级交易 */
  safePrice: number;
  /** Average/Propose Gas Price - 标准交易 */
  averagePrice: number;
  /** Fast Gas Price - 高优先级交易 */
  fastPrice: number;
  /** 原生代币符号 */
  nativeTokenSymbol: string;
  /** 网络使用率 (%) */
  utilization?: number;
  /** 最新区块号 */
  lastBlock?: number;
  /** 数据来源 */
  source: "etherscan" | "rpc";
}

export interface GasPriceOptions {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 是否启用缓存 */
  enableCache?: boolean;
}
