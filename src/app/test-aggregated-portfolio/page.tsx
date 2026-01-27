'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAggregatedPortfolio } from '@/hooks/useAggregatedPortfolio';
import { getNetworkConfig, dashboardConfig } from '@/config/dashboard.config';
import { useCurrencyStore, CURRENCY_SYMBOLS, CURRENCY_NAMES, type Currency } from '@/stores/currency-store';
import type { GroupedAsset, Asset } from '@/types/assets';

export default function TestAggregatedPortfolioPage() {
  useEffect(() => {
    console.log('🔍 [TestAggregatedPortfolioPage] 環境檢查:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - 日誌啟用:', dashboardConfig.logging.enabled);
    console.log('  - 價格刷新間隔:', dashboardConfig.refresh.price, 'ms');
  }, []);

  const [address, setAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [viewMode, setViewMode] = useState<'aggregated' | 'raw' | 'compare'>('aggregated');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const { currency, setCurrency } = useCurrencyStore();

  const {
    aggregatedData,
    rawData,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    error,
    refetch,
    totalValue,
    portfolioStatus,
    pricesStatus,
  } = useAggregatedPortfolio(
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

  const stats = useMemo(() => {
    const rawAssetsBySymbol = rawData.reduce((acc, asset) => {
      const symbol = asset.symbol.toUpperCase();
      if (!acc[symbol]) {
        acc[symbol] = [];
      }
      acc[symbol].push(asset);
      return acc;
    }, {} as Record<string, Asset[]>);

    const rawAssetsByChain = rawData.reduce((acc, asset) => {
      const chainId = asset.chainId;
      if (!acc[chainId]) {
        acc[chainId] = [];
      }
      acc[chainId].push(asset);
      return acc;
    }, {} as Record<number, Asset[]>);

    return {
      totalRawAssets: rawData.length,
      totalAggregatedAssets: aggregatedData.length,
      uniqueSymbols: Object.keys(rawAssetsBySymbol).length,
      totalChains: Object.keys(rawAssetsByChain).length,
      aggregationRatio: rawData.length > 0 
        ? ((rawData.length - aggregatedData.length) / rawData.length * 100).toFixed(1)
        : '0',
    };
  }, [rawData, aggregatedData]);

  const getChainName = (chainId: number) => {
    const networkConfig = getNetworkConfig(chainId);
    return networkConfig?.customName || networkConfig?.chain.name || `Chain ${chainId}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-black dark:text-zinc-50">
          聚合資產測試頁面
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8">
          測試 useAggregatedPortfolio Hook - 將多鏈同種代幣合併展示
        </p>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
            測試控制
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                視圖模式
              </label>
              <div className="flex gap-2">
                {(['aggregated', 'raw', 'compare'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      viewMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                    }`}
                  >
                    {mode === 'aggregated' ? '聚合視圖' : mode === 'raw' ? '原始視圖' : '對比視圖'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                選擇法幣
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

        {testAddress && aggregatedData.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-90 mb-1">總資產價值</div>
                <div className="text-4xl font-bold">
                  {pricesStatus.isLoading ? (
                    <span className="text-2xl">加載中...</span>
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
                  {stats.totalAggregatedAssets} 個聚合資產 · {stats.totalRawAssets} 個原始資產 · {stats.totalChains} 條鏈
                </div>
                <div className="text-xs opacity-60 mt-1">
                  聚合率：減少 {stats.aggregationRatio}% ({stats.totalRawAssets} → {stats.totalAggregatedAssets})
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-90">法幣</div>
                <div className="text-2xl font-semibold">
                  {CURRENCY_NAMES[currency]}
                </div>
              </div>
            </div>
          </div>
        )}

        {testAddress && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">聚合資產數</div>
              <div className="text-3xl font-bold">{stats.totalAggregatedAssets}</div>
              <div className="text-xs opacity-75 mt-1">按 symbol 合併後</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">原始資產數</div>
              <div className="text-3xl font-bold">{stats.totalRawAssets}</div>
              <div className="text-xs opacity-75 mt-1">多鏈扁平列表</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">唯一代幣</div>
              <div className="text-3xl font-bold">{stats.uniqueSymbols}</div>
              <div className="text-xs opacity-75 mt-1">不同 symbol 數量</div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
              <div className="text-sm opacity-90 mb-1">涉及鏈數</div>
              <div className="text-3xl font-bold">{stats.totalChains}</div>
              <div className="text-xs opacity-75 mt-1">多鏈資產分佈</div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
            狀態信息
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">資產加載</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {portfolioStatus.isLoading ? '加載中' : portfolioStatus.isSuccess ? '✓ 完成' : '等待'}
              </div>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">價格加載</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {pricesStatus.isLoading ? '加載中' : pricesStatus.isSuccess ? '✓ 完成' : '等待'}
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">聚合狀態</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {isSuccess ? '✓ 完成' : isLoading ? '處理中' : '等待'}
              </div>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">刷新狀態</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {isFetching ? '刷新中' : '就緒'}
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
              <strong>錯誤信息：</strong> {error}
            </div>
          )}
        </div>

        {testAddress && viewMode === 'aggregated' && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
              聚合資產列表 ({aggregatedData.length} 個)
            </h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-zinc-600 dark:text-zinc-400">正在加載資產數據...</p>
              </div>
            ) : aggregatedData.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
                {error ? (
                  <p>加載失敗：{error}</p>
                ) : (
                  <p>該地址暫無資產或未連接</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {aggregatedData.map((groupedAsset) => (
                  <div
                    key={groupedAsset.symbol}
                    className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        {groupedAsset.logo ? (
                          <img
                            src={groupedAsset.logo}
                            alt={groupedAsset.symbol}
                            className="w-12 h-12 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center">
                            <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
                              {groupedAsset.symbol.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-black dark:text-zinc-50">
                              {groupedAsset.symbol}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                              {groupedAsset.chains.length} 條鏈
                            </span>
                          </div>
                          <div className="text-sm text-zinc-600 dark:text-zinc-400">
                            {groupedAsset.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-black dark:text-zinc-50 mb-1">
                          {CURRENCY_SYMBOLS[currency]}
                          {groupedAsset.totalValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          {parseFloat(groupedAsset.totalBalance).toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}{' '}
                          {groupedAsset.symbol}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                          均價: {CURRENCY_SYMBOLS[currency]}
                          {groupedAsset.averagePrice.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                      <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        分佈鏈：{groupedAsset.chains.map(getChainName).join(', ')}
                      </div>
                      <div className="space-y-2">
                        {groupedAsset.assets.map((asset) => (
                          <div
                            key={asset.uniqueId}
                            className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                {getChainName(asset.chainId)}
                              </span>
                              {asset.isNative && (
                                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                                  原生
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-black dark:text-zinc-50">
                                {parseFloat(asset.formatted).toLocaleString(undefined, {
                                  maximumFractionDigits: 6,
                                })}{' '}
                                {asset.symbol}
                              </div>
                              {asset.value !== undefined && (
                                <div className="text-xs text-zinc-500 dark:text-zinc-500">
                                  {CURRENCY_SYMBOLS[currency]}
                                  {asset.value.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {testAddress && viewMode === 'raw' && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
              原始資產列表 ({rawData.length} 個)
            </h2>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-zinc-600 dark:text-zinc-400">正在加載資產數據...</p>
              </div>
            ) : rawData.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 dark:text-zinc-400">
                {error ? (
                  <p>加載失敗：{error}</p>
                ) : (
                  <p>該地址暫無資產或未連接</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  rawData.reduce((acc, asset) => {
                    const chainId = asset.chainId;
                    if (!acc[chainId]) {
                      acc[chainId] = [];
                    }
                    acc[chainId].push(asset);
                    return acc;
                  }, {} as Record<number, Asset[]>)
                ).map(([chainId, assets]) => (
                  <div key={chainId} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3 text-black dark:text-zinc-50">
                      {getChainName(Number(chainId))} (Chain ID: {chainId})
                      <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                        ({assets.length} 個資產)
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {assets.map((asset) => (
                        <div
                          key={asset.uniqueId}
                          className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
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
                            <div>
                              <div className="font-semibold text-black dark:text-zinc-50">
                                {asset.symbol}
                              </div>
                              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                {asset.name}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg text-black dark:text-zinc-50">
                              {parseFloat(asset.formatted).toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                              })}{' '}
                              {asset.symbol}
                            </div>
                            {asset.value !== undefined && (
                              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                {CURRENCY_SYMBOLS[currency]}
                                {asset.value.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {testAddress && viewMode === 'compare' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
                聚合資產總覽 ({aggregatedData.length} 個)
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                點擊資產查看其在各鏈上的詳細分解
              </p>
              {aggregatedData.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {aggregatedData.map((asset) => (
                    <div
                      key={asset.symbol}
                      onClick={() => setSelectedSymbol(asset.symbol)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedSymbol === asset.symbol
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 border-2'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          {asset.logo && (
                            <img
                              src={asset.logo}
                              alt={asset.symbol}
                              className="w-10 h-10 rounded-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-black dark:text-zinc-50">
                                {asset.symbol}
                              </span>
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                                {asset.chains.length} 鏈
                              </span>
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {asset.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-black dark:text-zinc-50">
                            {CURRENCY_SYMBOLS[currency]}
                            {asset.totalValue.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {parseFloat(asset.totalBalance).toLocaleString(undefined, {
                              maximumFractionDigits: 6,
                            })}{' '}
                            {asset.symbol}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            均價: {CURRENCY_SYMBOLS[currency]}
                            {asset.averagePrice.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6,
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-center py-8">無數據</p>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
                {selectedSymbol ? (
                  <>
                    {selectedSymbol} 在各鏈上的分佈
                  </>
                ) : (
                  '選擇左側資產查看詳細分解'
                )}
              </h2>
              {selectedSymbol ? (
                (() => {
                  const selectedAsset = aggregatedData.find(
                    (asset) => asset.symbol === selectedSymbol
                  );
                  if (!selectedAsset) {
                    return <p className="text-zinc-500 text-center py-8">未找到該資產</p>;
                  }
                  return (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {selectedAsset.logo && (
                              <img
                                src={selectedAsset.logo}
                                alt={selectedAsset.symbol}
                                className="w-8 h-8 rounded-full"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            )}
                            <span className="font-bold text-lg">{selectedAsset.symbol}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {CURRENCY_SYMBOLS[currency]}
                              {selectedAsset.totalValue.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <div className="text-sm opacity-90">
                              總價值
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm opacity-90">
                          <div>
                            <div className="font-semibold">總數量</div>
                            <div>
                              {parseFloat(selectedAsset.totalBalance).toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                              })}{' '}
                              {selectedAsset.symbol}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold">平均價格</div>
                            <div>
                              {CURRENCY_SYMBOLS[currency]}
                              {selectedAsset.averagePrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 6,
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                          分佈在 {selectedAsset.chains.length} 條鏈上：
                        </div>
                        {selectedAsset.assets.map((asset) => (
                          <div
                            key={asset.uniqueId}
                            className="p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                {asset.logo && (
                                  <img
                                    src={asset.logo}
                                    alt={asset.symbol}
                                    className="w-10 h-10 rounded-full"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-black dark:text-zinc-50">
                                      {getChainName(asset.chainId)}
                                    </span>
                                    {asset.isNative && (
                                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                                        原生
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    Chain ID: {asset.chainId}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-black dark:text-zinc-50">
                                  {parseFloat(asset.formatted).toLocaleString(undefined, {
                                    maximumFractionDigits: 6,
                                  })}{' '}
                                  {asset.symbol}
                                </div>
                                {asset.value !== undefined && (
                                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                    {CURRENCY_SYMBOLS[currency]}
                                    {asset.value.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </div>
                                )}
                                {asset.price !== undefined && (
                                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    單價: {CURRENCY_SYMBOLS[currency]}
                                    {asset.price.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 6,
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                  <p className="mb-2">👈 請從左側選擇一個聚合資產</p>
                  <p className="text-sm">
                    查看該資產在多條鏈上的詳細分佈情況
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {process.env.NODE_ENV === 'development' && aggregatedData.length > 0 && (
          <details className="mt-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
            <summary className="cursor-pointer text-lg font-semibold text-black dark:text-zinc-50 mb-4">
              原始數據（開發模式）
            </summary>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">聚合數據：</h3>
                <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-auto text-xs max-h-96">
                  {JSON.stringify(aggregatedData, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">原始數據：</h3>
                <pre className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg overflow-auto text-xs max-h-96">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
