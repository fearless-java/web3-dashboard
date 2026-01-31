'use client';

import { useMemo, useState } from 'react';
import { dashboardConfig } from '@/config/dashboard.config';
import { useGasPrice } from '@/hooks/use-gas-price';

type ChainOption = {
  id: number;
  name: string;
};

function formatGweiForTest(value: number): string {
  const abs = Math.abs(value);
  if (!Number.isFinite(abs) || abs === 0) return '0';
  if (abs >= 100) return Math.round(value).toString();
  if (abs >= 10) return value.toFixed(0);
  if (abs >= 1) return value.toFixed(1).replace(/\.0$/, '');
  if (abs >= 0.1)
    return value
      .toFixed(2)
      .replace(/0$/, '')
      .replace(/\.0$/, '');
  if (abs >= 0.01)
    return value
      .toFixed(3)
      .replace(/0+$/, '')
      .replace(/\.$/, '');
  return '<0.01';
}

export default function TestGasPricePage() {
  const enabledChains = useMemo<ChainOption[]>(
    () =>
      dashboardConfig.networks
        .filter((n) => n.enabled)
        .map((n) => ({ id: n.chain.id, name: n.customName ?? n.chain.name })),
    []
  );

  const [chainId, setChainId] = useState<number>(enabledChains[0]?.id ?? 1);
  const { gasPrice, isLoading, error, refetch } = useGasPrice(chainId);

  const display = useMemo(() => {
    if (isLoading) return 'Loading...';
    if (error) return 'N/A';
    if (gasPrice === null) return '—';
    return `${formatGweiForTest(gasPrice)} Gwei`;
  }, [error, gasPrice, isLoading]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
          Gas Price Debug Page
        </h1>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
          <div className="flex flex-wrap gap-2">
            {enabledChains.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChainId(c.id)}
                className={[
                  'px-3 py-2 rounded-md text-sm font-semibold border transition-colors',
                  c.id === chainId
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'bg-transparent text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800',
                ].join(' ')}
              >
                {c.name} ({c.id})
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-2">
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Current chainId: <span className="font-mono">{chainId}</span>
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Raw gasPrice (number):{' '}
              <span className="font-mono">
                {gasPrice === null ? 'null' : String(gasPrice)}
              </span>
            </div>
            <div className="text-lg font-semibold text-black dark:text-zinc-50">
              Display: <span className="font-mono">{display}</span>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                Error: {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-2 rounded-md text-sm font-semibold border bg-transparent text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Refetch
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

