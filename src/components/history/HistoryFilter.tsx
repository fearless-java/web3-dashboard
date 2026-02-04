'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { ChainInfo, TransactionType } from '@/services/history-mock'

interface HistoryFilterProps {
  chains: ChainInfo[]
  selectedChain: string | null
  onChainSelect: (chainId: string | null) => void
  selectedType: TransactionType | null
  onTypeSelect: (type: TransactionType | null) => void
}

function ChainLogo({ chain, isSelected }: { chain: ChainInfo; isSelected: boolean }) {
  return (
    <Avatar className="h-10 w-10 shrink-0 rounded-lg">
      {chain.logo ? (
        <AvatarImage
          src={chain.logo}
          alt={chain.name}
          className="rounded-lg object-cover"
        />
      ) : (
        <AvatarFallback
          className="rounded-lg text-sm font-bold"
          style={{
            backgroundColor: isSelected ? chain.color : `${chain.color}20`,
            color: isSelected ? '#ffffff' : chain.color,
          }}
        >
          {chain.shortName.slice(0, 2)}
        </AvatarFallback>
      )}
    </Avatar>
  )
}

function ChainChip({
  chain,
  isSelected,
  onClick,
}: {
  chain: ChainInfo
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'flex h-auto flex-1 items-center justify-center gap-3 rounded-xl border-0 px-4 py-3 transition-all',
        isSelected
          ? 'bg-green-100 text-green-700 hover:bg-green-100/90 dark:bg-green-500/20 dark:text-green-400'
          : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
      )}
    >
      <ChainLogo chain={chain} isSelected={isSelected} />
      <span className={cn('text-base font-semibold', isSelected ? 'font-bold' : '')}>
        {chain.shortName}
      </span>
    </Button>
  )
}

function TypeIcon({ type, isSelected }: { type: string; isSelected: boolean }) {
  const iconClass = 'h-5 w-5'
  const baseClass = isSelected ? 'text-white' : 'text-current'

  switch (type) {
    case 'swap':
      return <ArrowRightLeft className={`${iconClass} ${baseClass}`} />
    case 'send':
      return <ArrowUpRight className={`${iconClass} ${baseClass}`} />
    case 'receive':
      return <ArrowDownLeft className={`${iconClass} ${baseClass}`} />
    case 'approve':
      return <ShieldCheck className={`${iconClass} ${baseClass}`} />
    case 'mint':
      return <Sparkles className={`${iconClass} ${baseClass}`} />
    default:
      return null
  }
}

function TypeChip({
  type,
  isSelected,
  onClick,
}: {
  type: { id: string; label: string; icon: string }
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={cn(
        'flex h-auto flex-1 items-center justify-center gap-3 rounded-xl border-0 px-4 py-3 transition-all',
        isSelected
          ? 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
          : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          isSelected ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
        )}
      >
        <TypeIcon type={type.icon} isSelected={isSelected} />
      </div>
      <span className={cn('text-base font-semibold', isSelected ? 'font-bold' : '')}>
        {type.label}
      </span>
    </Button>
  )
}

export function HistoryFilter({
  chains,
  selectedChain,
  onChainSelect,
  selectedType,
  onTypeSelect,
}: HistoryFilterProps) {
  const typeOptions = [
    { id: 'swap', label: 'Swap', icon: 'swap' },
    { id: 'send', label: 'Send', icon: 'send' },
    { id: 'receive', label: 'Receive', icon: 'receive' },
    { id: 'approve', label: 'Approve', icon: 'approve' },
    { id: 'mint', label: 'Mint', icon: 'mint' },
  ] as const

  const handleChainClick = (chainId: string) => {
    if (selectedChain === chainId) {
      onChainSelect(null)
    } else {
      onChainSelect(chainId)
    }
  }

  const handleTypeClick = (typeId: string) => {
    if (selectedType === typeId) {
      onTypeSelect(null)
    } else {
      onTypeSelect(typeId as TransactionType)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex w-full gap-2">
          {chains
            .filter((chain) => chain.id !== 'all')
            .map((chain) => (
              <ChainChip
                key={chain.id}
                chain={chain}
                isSelected={selectedChain === chain.id}
                onClick={() => handleChainClick(chain.id)}
              />
            ))}
        </div>
        <div className="border-t border-border/30" />
        <div className="flex w-full gap-2">
          {typeOptions.map((type) => (
            <TypeChip
              key={type.id}
              type={type}
              isSelected={selectedType === type.id}
              onClick={() => handleTypeClick(type.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
