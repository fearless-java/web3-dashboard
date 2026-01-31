import type { Asset, GroupedAsset } from '@/types/assets';

/**
 * 测试网 Chain ID 集合（不参与净值聚合，避免零价值测试币稀释主网单价）
 * 常见：Sepolia 11155111, Goerli 5, Mumbai 80001, Arbitrum Sepolia 421614, OP Sepolia 11155420, Base Sepolia 84532, Fuji 43113, BSC Testnet 97
 */
/** 测试网 Chain ID 集合，供链筛选等 UI 使用 */
export const TESTNET_CHAIN_IDS = new Set<number>([
  5,        // Goerli
  11155111, // Sepolia
  80001,    // Mumbai (Polygon)
  421614,   // Arbitrum Sepolia
  11155420, // OP Sepolia
  84532,    // Base Sepolia
  43113,    // Fuji (Avalanche)
  97,       // BSC Testnet
]);

export function isTestnetChain(chainId: number): boolean {
  return TESTNET_CHAIN_IDS.has(chainId);
}

/** 链 ID 到展示名的映射（用于测试网后缀，如 "Sepolia"） */
const CHAIN_ID_TO_LABEL: Record<number, string> = {
  5: "Goerli",
  11155111: "Sepolia",
  80001: "Mumbai",
  421614: "Arbitrum Sepolia",
  11155420: "OP Sepolia",
  84532: "Base Sepolia",
  43113: "Fuji",
  97: "BSC Testnet",
};

function buildGroupedFromList(assetList: Asset[], symbolKey: string, isTestnet: boolean): GroupedAsset {
  const totalValue = assetList.reduce((sum, asset) => sum + (asset.value ?? 0), 0);
  const totalBalance = assetList.reduce((sum, asset) => sum + (parseFloat(asset.formatted) || 0), 0);
  const averagePrice = totalBalance > 0 ? totalValue / totalBalance : 0;

  let selectedLogo: string | undefined;
  let selectedName: string = assetList[0]?.name || symbolKey;

  const mainnetAsset = assetList.find((asset) => asset.chainId === 1);
  if (mainnetAsset?.logo) {
    selectedLogo = mainnetAsset.logo;
    selectedName = mainnetAsset.name;
  } else {
    const highestValueAsset = assetList.reduce((max, asset) => {
      const maxValue = max.value ?? 0;
      const assetValue = asset.value ?? 0;
      return assetValue > maxValue ? asset : max;
    }, assetList[0]);
    selectedLogo = highestValueAsset?.logo;
    selectedName = highestValueAsset?.name || selectedName;
  }

  const chainValueMap = new Map<number, number>();
  assetList.forEach((asset) => {
    const currentValue = chainValueMap.get(asset.chainId) ?? 0;
    chainValueMap.set(asset.chainId, currentValue + (asset.value ?? 0));
  });
  const chains = Array.from(chainValueMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([chainId]) => chainId);

  return {
    symbol: symbolKey,
    name: selectedName,
    logo: selectedLogo,
    totalValue,
    totalBalance: totalBalance.toFixed(18),
    averagePrice,
    chains,
    assets: assetList,
    isTestnet,
  };
}

/**
 * 按 Symbol 聚合资产（测试网隔离）
 * - showTestnets === false：仅主网资产参与聚合，测试网资产不展示
 * - showTestnets === true：主网按 symbol 聚合；测试网资产不与主网合并，单独一行（如 "ETH (Sepolia)"）
 */
export function groupAssetsBySymbol(assets: Asset[], showTestnets: boolean = false): GroupedAsset[] {
  const mainnetAssets = assets.filter((a) => !isTestnetChain(a.chainId));
  const result: GroupedAsset[] = [];

  // 主网：按 symbol 聚合
  const mainnetMap = new Map<string, Asset[]>();
  mainnetAssets.forEach((asset) => {
    const symbol = asset.symbol.toUpperCase();
    if (!mainnetMap.has(symbol)) mainnetMap.set(symbol, []);
    mainnetMap.get(symbol)!.push(asset);
  });
  mainnetMap.forEach((assetList, symbol) => {
    result.push(buildGroupedFromList(assetList, symbol, false));
  });

  if (!showTestnets) {
    result.sort((a, b) => b.totalValue - a.totalValue);
    return result;
  }

  // 测试网：按 (symbol + chainId) 聚合，不与主网合并；展示名带后缀如 "ETH (Sepolia)"
  const testnetAssets = assets.filter((a) => isTestnetChain(a.chainId));
  const testnetMap = new Map<string, Asset[]>();
  testnetAssets.forEach((asset) => {
    const label = CHAIN_ID_TO_LABEL[asset.chainId] ?? `Chain ${asset.chainId}`;
    const symbolKey = `${asset.symbol.toUpperCase()} (${label})`;
    if (!testnetMap.has(symbolKey)) testnetMap.set(symbolKey, []);
    testnetMap.get(symbolKey)!.push(asset);
  });
  testnetMap.forEach((assetList, symbolKey) => {
    result.push(buildGroupedFromList(assetList, symbolKey, true));
  });

  result.sort((a, b) => b.totalValue - a.totalValue);
  return result;
}
