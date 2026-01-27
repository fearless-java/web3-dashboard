'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTransactions, Transaction, TransactionType } from '@/hooks/useTransactions';
import { getNetworkConfig, dashboardConfig } from '@/config/dashboard.config';

export default function TestTransactionsPage() {
  
  useEffect(() => {
    console.log('🔍 [TestTransactionsPage] 環境檢查:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - 日誌啟用:', dashboardConfig.logging.enabled);
    console.log('  - 交易刷新間隔:', dashboardConfig.refresh.transaction, 'ms');
  }, []);

  const [address, setAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('all');

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    isSuccess,
    isError,
  } = useTransactions(
    testAddress || undefined,
    transactionType,
    isConnected && !!testAddress
  );

  const testAddresses = [
    { name: 'Vitalik Buterin', address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
    { name: 'Binance Hot Wallet', address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE' },
    { name: 'Coinbase', address: '0x71660c4005BA85c37ccec55d0C4493E66Fe775d3' },
  ];

  const handleTestAddress = (addr: string) => {
    setTestAddress(addr);
    setAddress(addr);
    setIsConnected(true);
  };

  const handleClear = () => {
    setAddress('');
    setTestAddress('');
    setIsConnected(false);
  };

  const transactionsByChain = useMemo(() => {
    if (!data?.transactions) return {};
    
    return data.transactions.reduce((acc, tx) => {
      const chainId = tx.chainId;
      if (!acc[chainId]) {
        acc[chainId] = [];
      }
      acc[chainId].push(tx);
      return acc;
    }, {} as Record<number, Transaction[]>);
  }, [data?.transactions]);

  const stats = useMemo(() => {
    if (!data?.transactions) {
      return {
        total: 0,
        buy: 0,
        sell: 0,
        chains: 0,
      };
    }

    const buyCount = data.transactions.filter(tx => tx.transactionType === 'buy').length;
    const sellCount = data.transactions.filter(tx => tx.transactionType === 'sell').length;

    return {
      total: data.transactions.length,
      buy: buyCount,
      sell: sellCount,
      chains: Object.keys(transactionsByChain).length,
    };
  }, [data?.transactions, transactionsByChain]);

  const getExplorerUrl = (chainId: number, hash: string) => {
    const explorerMap: Record<number, string> = {
      1: 'https://etherscan.io/tx/',
      42161: 'https://arbiscan.io/tx/',
      10: 'https://optimistic.etherscan.io/tx/',
      8453: 'https://basescan.org/tx/',
      137: 'https://polygonscan.com/tx/',
      11155111: 'https://sepolia.etherscan.io/tx/',
    };
    return `${explorerMap[chainId] || 'https://etherscan.io/tx/'}${hash}`;
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-black dark:text-zinc-50">
          交易歷史測試頁面
        </h1>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
            測試控制
          </h2>

          <div className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                交易類型
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as TransactionType)}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">所有交易</option>
                <option value="buy">買入交易</option>
                <option value="sell">賣出交易</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                錢包地址
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    setTestAddress(address);
                    setIsConnected(true);
                  }}
                  disabled={!address || isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  查詢
                </button>
                <button
                  onClick={handleClear}
                  className="px-6 py-2 bg-zinc-600 text-white rounded-lg hover:bg-zinc-700"
                >
                  清除
                </button>
                <button
                  onClick={() => refetch()}
                  disabled={!testAddress || isLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  刷新
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isConnected}
                  onChange={(e) => setIsConnected(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  模擬連接狀態
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                快速測試地址
              </label>
              <div className="flex flex-wrap gap-2">
                {testAddresses.map((item) => (
                  <button
                    key={item.address}
                    onClick={() => handleTestAddress(item.address)}
                    className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 text-sm"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {testAddress && data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">總交易數</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">買入交易</div>
              <div className="text-3xl font-bold">{stats.buy}</div>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">賣出交易</div>
              <div className="text-3xl font-bold">{stats.sell}</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">涉及鏈數</div>
              <div className="text-3xl font-bold">{stats.chains}</div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
            狀態信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">加載狀態</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {isLoading ? '加載中' : isSuccess ? '✓ 完成' : '等待'}
              </div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">刷新狀態</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {isFetching ? '刷新中' : '就緒'}
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">交易總數</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.total}
              </div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">錯誤狀態</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {isError ? '✗ 錯誤' : '✓ 正常'}
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-800 dark:text-red-200">
              <strong>錯誤信息：</strong> {error.message || String(error)}
            </div>
          )}
        </div>

        {testAddress && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
              交易列表 ({stats.total} 筆)
            </h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-zinc-600 dark:text-zinc-400">正在加載交易數據...</p>
              </div>
            ) : !data || data.transactions.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
                {error ? (
                  <p>加載失敗：{error.message || String(error)}</p>
                ) : (
                  <p>該地址暫無交易記錄或未連接</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(transactionsByChain).map(([chainId, transactions]) => {
                  const networkConfig = getNetworkConfig(Number(chainId));
                  const chainName = networkConfig?.customName || networkConfig?.chain.name || `Chain ${chainId}`;

                  return (
                    <div key={chainId} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-black dark:text-zinc-50">
                        {chainName} (Chain ID: {chainId})
                        <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                          ({transactions.length} 筆交易)
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {transactions.map((tx) => (
                          <div
                            key={tx.uniqueId}
                            className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                
                                <div
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    tx.transactionType === 'buy'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                  }`}
                                >
                                  {tx.transactionType === 'buy' ? '買入' : '賣出'}
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {tx.logo && (
                                      <img
                                        src={tx.logo}
                                        alt={tx.asset}
                                        className="w-6 h-6 rounded-full"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <span className="font-semibold text-black dark:text-zinc-50">
                                      {tx.asset}
                                    </span>
                                    {tx.isNative && (
                                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                                        原生
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                                    <div>
                                      <span className="font-medium">從：</span>
                                      <span className="font-mono text-xs ml-1">
                                        {tx.from.substring(0, 10)}...{tx.from.substring(tx.from.length - 8)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-medium">到：</span>
                                      <span className="font-mono text-xs ml-1">
                                        {tx.to.substring(0, 10)}...{tx.to.substring(tx.to.length - 8)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-xs text-zinc-500 dark:text-zinc-500">
                                    <div>時間：{formatTime(tx.timestamp)}</div>
                                    <div className="font-mono mt-1">
                                      區塊：{tx.blockNum || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div
                                  className={`text-lg font-bold mb-1 ${
                                    tx.transactionType === 'buy'
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {tx.transactionType === 'buy' ? '+' : '-'}
                                  {parseFloat(tx.formattedValue).toLocaleString(undefined, {
                                    maximumFractionDigits: 6,
                                  })}{' '}
                                  <span className="text-sm font-normal">{tx.asset}</span>
                                </div>
                                <a
                                  href={getExplorerUrl(tx.chainId, tx.hash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono"
                                >
                                  查看交易
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {process.env.NODE_ENV === 'development' && data && data.transactions.length > 0 && (
          <details className="mt-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
            <summary className="cursor-pointer text-lg font-semibold text-black dark:text-zinc-50 mb-4">
              原始數據（開發模式）
            </summary>
            <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-auto text-xs max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
