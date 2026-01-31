import { formatEther } from 'viem';

/**
 * Etherscan API 响应类型定义
 */
interface EtherscanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  isError: string;
  txreceipt_status: string;
}

interface EtherscanApiResponse {
  status: string;
  message: string;
  result: EtherscanTransaction[] | string;
}

/**
 * 获取用户历史总 Gas 消耗
 * 
 * 技术要点：
 * 1. 使用 Etherscan API 一次性获取所有交易
 * 2. 只计算用户发出的交易（tx.from === address）
 * 3. 使用 BigInt 避免精度丢失
 * 4. 成本公式：gasUsed * gasPrice（单位 Wei）
 * 
 * @param address 用户钱包地址
 * @returns 总 Gas 消耗（单位 ETH，字符串格式，例如 "0.4521"）
 */
export async function fetchTotalGasSpent(address: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[fetchTotalGasSpent] 🔍 开始查询 Gas 消耗 - 地址: ${address}`);

  try {
    // 服务端优先用 ETHERSCAN_API_KEY，否则用 NEXT_PUBLIC_ETHERSCAN_API_KEY
    const apiKey = (
      process.env.ETHERSCAN_API_KEY?.trim() ||
      process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY?.trim() ||
      ''
    );

    if (!apiKey) {
      console.warn(
        '[fetchTotalGasSpent] ⚠️ Etherscan API Key 未配置。请在 .env.local 中设置 ETHERSCAN_API_KEY 或 NEXT_PUBLIC_ETHERSCAN_API_KEY，然后重启 dev server。'
      );
      return '0';
    }

    // Etherscan API V2（V1 已废弃）
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
    
    console.log(`[fetchTotalGasSpent] 📡 请求 Etherscan API...`);
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error(`Etherscan API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data: EtherscanApiResponse = await response.json();
    const fetchDuration = Date.now() - startTime;
    
    // 检查 API 响应状态
    if (data.status !== '1') {
      console.error('[fetchTotalGasSpent] ❌ API 返回失败状态:', data.message);
      return '0';
    }

    // 检查结果是否为数组
    if (!Array.isArray(data.result)) {
      console.warn('[fetchTotalGasSpent] ⚠️ API 返回结果不是数组:', data.result);
      return '0';
    }

    const transactions = data.result;
    console.log(`[fetchTotalGasSpent] ✅ 获取交易列表成功 - 总交易数: ${transactions.length}, 耗时: ${fetchDuration}ms`);

    // 计算总 Gas 消耗（使用 BigInt）
    const calcStartTime = Date.now();
    const normalizedAddress = address.toLowerCase();
    
    const totalGasWei = transactions.reduce((total, tx) => {
      // 关键过滤：只计算用户发出的交易
      if (tx.from.toLowerCase() !== normalizedAddress) {
        return total;
      }

      try {
        // 成本公式：gasUsed * gasPrice
        const gasUsed = BigInt(tx.gasUsed);
        const gasPrice = BigInt(tx.gasPrice);
        const gasCost = gasUsed * gasPrice;
        
        return total + gasCost;
      } catch (error) {
        console.warn(`[fetchTotalGasSpent] ⚠️ 交易 ${tx.hash} 计算失败:`, error);
        return total;
      }
    }, BigInt(0));

    const calcDuration = Date.now() - calcStartTime;
    
    // 转换为 ETH（使用 viem 的 formatEther）
    const totalGasEth = formatEther(totalGasWei);
    
    const totalDuration = Date.now() - startTime;
    console.log(`[fetchTotalGasSpent] 🎉 计算完成 - 总耗时: ${totalDuration}ms (请求: ${fetchDuration}ms, 计算: ${calcDuration}ms)`);
    console.log(`[fetchTotalGasSpent] 💰 总 Gas 消耗: ${totalGasEth} ETH (${totalGasWei.toString()} Wei)`);
    
    return totalGasEth;
    
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[fetchTotalGasSpent] ❌ 查询失败 - 耗时: ${totalDuration}ms`, error);
    
    // 错误处理：返回 "0" 而不是抛出异常
    return '0';
  }
}
