import type { Asset, GroupedAsset } from '@/types/assets';

export function groupAssetsBySymbol(assets: Asset[]): GroupedAsset[] {
  
  const groupedMap = new Map<string, Asset[]>();

  assets.forEach((asset) => {
    const symbol = asset.symbol.toUpperCase(); 
    if (!groupedMap.has(symbol)) {
      groupedMap.set(symbol, []);
    }
    groupedMap.get(symbol)!.push(asset);
  });

  const groupedAssets: GroupedAsset[] = [];

  groupedMap.forEach((assetList, symbol) => {
    
    const totalValue = assetList.reduce((sum, asset) => {
      return sum + (asset.value ?? 0);
    }, 0);

    const totalBalance = assetList.reduce((sum, asset) => {
      const balance = parseFloat(asset.formatted) || 0;
      return sum + balance;
    }, 0);

    const averagePrice = totalBalance > 0 ? totalValue / totalBalance : 0;

    let selectedLogo: string | undefined;
    let selectedName: string = assetList[0]?.name || symbol;

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

    groupedAssets.push({
      symbol,
      name: selectedName,
      logo: selectedLogo,
      totalValue,
      totalBalance: totalBalance.toFixed(18), 
      averagePrice,
      chains,
      assets: assetList, 
    });
  });

  groupedAssets.sort((a, b) => b.totalValue - a.totalValue);

  return groupedAssets;
}
