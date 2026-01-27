'use client';

import { useState, useEffect } from 'react';
import { usePortfolio, Asset } from '@/hooks/usePortfolio';
import { getNetworkConfig, dashboardConfig } from '@/config/dashboard.config';
import { useCurrencyStore, CURRENCY_SYMBOLS, CURRENCY_NAMES, type Currency } from '@/stores/currency-store';

export default function TestPortfolioPage() {
  
  useEffect(() => {
    console.log('🔍 [TestPortfolioPage] 環境檢查:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - 日誌啟用:', dashboardConfig.logging.enabled);
    console.log('  - 日誌級別:', dashboardConfig.logging.level);
    console.log('  - 價格刷新間隔:', dashboardConfig.refresh.price, 'ms');
  }, []);
  const [address, setAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [testAddress, setTestAddress] = useState('');

  const { currency, setCurrency } = useCurrencyStore();

  const {
    data,
    totalValue,
    isLoading,
    isPriceLoading,
    error,
    refetch,
    portfolioStatus,
    pricesStatus,
  } = usePortfolio(
    testAddress || undefined,
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

  const assetsByChain = data.reduce((acc, asset) => {
    const chainId = asset.chainId;
    if (!acc[chainId]) {
      acc[chainId] = [];
    }
    acc[chainId].push(asset);
    return acc;
  }, {} as Record<number, Asset[]>);

  const totalAssets = data.length;
  const totalChains = Object.keys(assetsByChain).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-black dark:text-zinc-50">
          usePortfolio Hook 测试页面
        </h1>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
            测试控制
          </h2>

          <div className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                选择法币
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(Object.keys(CURRENCY_NAMES) as Currency[]).map((curr) => (
                  <option key={curr} value={curr}>
                    {CURRENCY_NAMES[curr]} ({curr}) {CURRENCY_SYMBOLS[curr]}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                钱包地址
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
                  查询
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
                  模拟连接状态
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                快速测试地址
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

        {testAddress && data.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-90 mb-1">总资产价值</div>
                <div className="text-4xl font-bold">
                  {isPriceLoading ? (
                    <span className="text-2xl">加载中...</span>
                  ) : (
                    <>
                      {CURRENCY_SYMBOLS[currency]}
                      {totalValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  )}
                </div>
                <div className="text-sm opacity-75 mt-1">
                  {totalAssets} 个资产 · {totalChains} 条链
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">法币</div>
                <div className="text-2xl font-semibold">
                  {CURRENCY_NAMES[currency]}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
            状态信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">资产加载</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {portfolioStatus.isLoading ? '加载中' : portfolioStatus.isSuccess ? '✓ 完成' : '等待'}
              </div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">价格加载</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {pricesStatus.isLoading ? '加载中' : pricesStatus.isSuccess ? '✓ 完成' : '等待'}
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">资产总数</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {totalAssets}
              </div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">链数量</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {totalChains}
              </div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">错误状态</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {error ? '✗ 错误' : '✓ 正常'}
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-800 dark:text-red-200">
              <strong>错误信息：</strong> {error}
            </div>
          )}
        </div>

        {testAddress && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
              资产列表 ({totalAssets} 个)
            </h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-zinc-600 dark:text-zinc-400">正在加载资产数据...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
                {error ? (
                  <p>加载失败：{error}</p>
                ) : (
                  <p>该地址暂无资产或未连接</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(assetsByChain).map(([chainId, assets]) => {
                  const networkConfig = getNetworkConfig(Number(chainId));
                  const chainName = networkConfig?.customName || networkConfig?.chain.name || `Chain ${chainId}`;

                  return (
                    <div key={chainId} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3 text-black dark:text-zinc-50">
                        {chainName} (Chain ID: {chainId})
                        <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                          ({assets.length} 个资产)
                        </span>
                      </h3>
                      <div className="space-y-2">
                        {assets.map((asset) => (
                          <div
                            key={asset.uniqueId}
                            className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {asset.logo ? (
                                <img
                                  src={asset.logo}
                                  alt={asset.symbol}
                                  className="w-10 h-10 rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center">
                                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                                    {asset.symbol.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-black dark:text-zinc-50">
                                    {asset.symbol}
                                  </span>
                                  {asset.isNative && (
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                                      原生
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                  {asset.name}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-500 font-mono mt-1">
                                  {asset.address.substring(0, 10)}...
                                  {asset.address.substring(asset.address.length - 8)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              
                              <div className="font-bold text-lg text-black dark:text-zinc-50 mb-1">
                                {parseFloat(asset.formatted).toLocaleString(undefined, {
                                  maximumFractionDigits: 6,
                                })}{' '}
                                <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                                  {asset.symbol}
                                </span>
                              </div>

                              {isPriceLoading ? (
                                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                  价格加载中...
                                </div>
                              ) : asset.price !== undefined ? (
                                <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                  {CURRENCY_SYMBOLS[currency]}
                                  {asset.price.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 6,
                                  })}
                                </div>
                              ) : (
                                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                  价格不可用
                                </div>
                              )}

                              {asset.value !== undefined && (
                                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                                  {CURRENCY_SYMBOLS[currency]}
                                  {asset.value.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </div>
                              )}

                              <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                                {asset.decimals} decimals
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

        {process.env.NODE_ENV === 'development' && data.length > 0 && (
          <details className="mt-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
            <summary className="cursor-pointer text-lg font-semibold text-black dark:text-zinc-50 mb-4">
              原始数据（开发模式）
            </summary>
            <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-auto text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
