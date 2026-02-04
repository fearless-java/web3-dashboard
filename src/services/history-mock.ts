export type TransactionType = 'swap' | 'send' | 'receive' | 'approve' | 'mint'
export type TransactionStatus = 'confirmed' | 'pending' | 'failed'

export interface TransactionAsset {
  symbol: string
  amount: string
  logo?: string
}

export interface Transaction {
  id: string
  type: TransactionType
  status: TransactionStatus
  timestamp: number
  hash: string
  asset: TransactionAsset
  value: number
  counterparty: string
  chainId: string
}

export const mockTransactions: Transaction[] = [
  {
    id: 'tx-001',
    type: 'swap',
    status: 'confirmed',
    timestamp: Date.now() - 2 * 60 * 1000,
    hash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9',
    asset: {
      symbol: 'ETH',
      amount: '2.5',
      logo: '/tokens/eth.svg',
    },
    value: 8750.5,
    counterparty: 'Uniswap V3',
    chainId: 'ethereum',
  },
  {
    id: 'tx-002',
    type: 'send',
    status: 'pending',
    timestamp: Date.now() - 5 * 60 * 1000,
    hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
    asset: {
      symbol: 'USDC',
      amount: '5000.00',
      logo: '/tokens/usdc.svg',
    },
    value: 5000.0,
    counterparty: '0x1234...5678',
    chainId: 'ethereum',
  },
  {
    id: 'tx-003',
    type: 'receive',
    status: 'confirmed',
    timestamp: Date.now() - 15 * 60 * 1000,
    hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7',
    asset: {
      symbol: 'WBTC',
      amount: '0.15',
      logo: '/tokens/wbtc.svg',
    },
    value: 14250.75,
    counterparty: '0xabcd...ef01',
    chainId: 'ethereum',
  },
  {
    id: 'tx-004',
    type: 'approve',
    status: 'confirmed',
    timestamp: Date.now() - 30 * 60 * 1000,
    hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5',
    asset: {
      symbol: 'USDT',
      amount: 'Unlimited',
      logo: '/tokens/usdt.svg',
    },
    value: 0,
    counterparty: '1inch Router',
    chainId: 'polygon',
  },
  {
    id: 'tx-005',
    type: 'swap',
    status: 'failed',
    timestamp: Date.now() - 45 * 60 * 1000,
    hash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7',
    asset: {
      symbol: 'LINK',
      amount: '100',
      logo: '/tokens/link.svg',
    },
    value: 1850.0,
    counterparty: 'SushiSwap',
    chainId: 'arbitrum',
  },
  {
    id: 'tx-006',
    type: 'mint',
    status: 'confirmed',
    timestamp: Date.now() - 60 * 60 * 1000,
    hash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9',
    asset: {
      symbol: 'NFT',
      amount: '1',
      logo: '/tokens/nft.svg',
    },
    value: 2.5,
    counterparty: 'OpenSea',
    chainId: 'ethereum',
  },
  {
    id: 'tx-007',
    type: 'send',
    status: 'confirmed',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    hash: '0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1',
    asset: {
      symbol: 'DAI',
      amount: '2500.00',
      logo: '/tokens/dai.svg',
    },
    value: 2500.0,
    counterparty: '0xdead...beef',
    chainId: 'optimism',
  },
  {
    id: 'tx-008',
    type: 'receive',
    status: 'confirmed',
    timestamp: Date.now() - 3 * 60 * 60 * 1000,
    hash: '0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3',
    asset: {
      symbol: 'AAVE',
      amount: '50',
      logo: '/tokens/aave.svg',
    },
    value: 4250.0,
    counterparty: 'Aave Protocol',
    chainId: 'ethereum',
  },
  {
    id: 'tx-009',
    type: 'swap',
    status: 'confirmed',
    timestamp: Date.now() - 5 * 60 * 60 * 1000,
    hash: '0xd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
    asset: {
      symbol: 'UNI',
      amount: '500',
      logo: '/tokens/uni.svg',
    },
    value: 3750.0,
    counterparty: 'Uniswap V3',
    chainId: 'base',
  },
  {
    id: 'tx-010',
    type: 'approve',
    status: 'pending',
    timestamp: Date.now() - 10 * 60 * 1000,
    hash: '0xf5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7',
    asset: {
      symbol: 'WETH',
      amount: '1000',
      logo: '/tokens/weth.svg',
    },
    value: 0,
    counterparty: 'Curve Finance',
    chainId: 'ethereum',
  },
  {
    id: 'tx-011',
    type: 'swap',
    status: 'confirmed',
    timestamp: Date.now() - 8 * 60 * 60 * 1000,
    hash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    asset: {
      symbol: 'AVAX',
      amount: '150',
      logo: '/tokens/avax.svg',
    },
    value: 5250.0,
    counterparty: 'TraderJoe',
    chainId: 'avalanche',
  },
  {
    id: 'tx-012',
    type: 'send',
    status: 'confirmed',
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
    hash: '0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
    asset: {
      symbol: 'BNB',
      amount: '10',
      logo: '/tokens/bnb.svg',
    },
    value: 6200.0,
    counterparty: '0xbeef...dead',
    chainId: 'bsc',
  },
]

export function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    swap: 'Swap',
    send: 'Send',
    receive: 'Receive',
    approve: 'Approve',
    mint: 'Mint',
  }
  return labels[type]
}

export function getTransactionActionText(type: TransactionType, symbol: string): string {
  const actions: Record<TransactionType, string> = {
    swap: 'Swapped',
    send: 'Sent',
    receive: 'Received',
    approve: 'Approved',
    mint: 'Minted',
  }
  return `${actions[type]} ${symbol}`
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export function formatHash(hash: string): string {
  if (hash.length <= 12) return hash
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export interface ChainInfo {
  id: string
  name: string
  shortName: string
  logo?: string
  color: string
}

function getChainLogo(chainId: string): string {
  const trustWalletUrls: Record<string, string> = {
    ethereum: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    arbitrum: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    optimism: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
    base: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
    polygon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    avalanche: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
    bsc: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png',
  }
  return trustWalletUrls[chainId] || ''
}

export const supportedChains: ChainInfo[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    shortName: 'ETH',
    logo: getChainLogo('ethereum'),
    color: '#627EEA',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    shortName: 'ARB',
    logo: getChainLogo('arbitrum'),
    color: '#28A0F0',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    shortName: 'OP',
    logo: getChainLogo('optimism'),
    color: '#FF0420',
  },
  {
    id: 'base',
    name: 'Base',
    shortName: 'Base',
    logo: getChainLogo('base'),
    color: '#0052FF',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    shortName: 'POL',
    logo: getChainLogo('polygon'),
    color: '#8247E5',
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    shortName: 'AVAX',
    logo: getChainLogo('avalanche'),
    color: '#E84142',
  },
  {
    id: 'bsc',
    name: 'BNB Chain',
    shortName: 'BNB',
    logo: getChainLogo('bsc'),
    color: '#F3BA2F',
  },
]

export const transactionTypes = [
  { id: 'all', label: 'All Types', icon: 'all' },
  { id: 'swap', label: 'Swap', icon: 'swap' },
  { id: 'send', label: 'Send', icon: 'send' },
  { id: 'receive', label: 'Receive', icon: 'receive' },
  { id: 'approve', label: 'Approve', icon: 'approve' },
  { id: 'mint', label: 'Mint', icon: 'mint' },
] as const
