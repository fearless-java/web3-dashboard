'use client'

import { useState, useMemo } from 'react'
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { HistoryFilter } from '@/components/history/HistoryFilter'
import {
  formatHash,
  formatRelativeTime,
  formatUSD,
  getTransactionActionText,
  mockTransactions,
  supportedChains,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@/services/history-mock'

function getTransactionIcon(type: TransactionType) {
  const iconClass = 'h-4 w-4'
  switch (type) {
    case 'swap':
      return <ArrowRightLeft className={`${iconClass} text-muted-foreground`} />
    case 'send':
      return <ArrowUpRight className={`${iconClass} text-amber-500`} />
    case 'receive':
      return <ArrowDownLeft className={`${iconClass} text-emerald-500`} />
    case 'approve':
      return <ShieldCheck className={`${iconClass} text-blue-500`} />
    case 'mint':
      return <Sparkles className={`${iconClass} text-purple-500`} />
    default:
      return null
  }
}

function StatusIndicator({ status }: { status: TransactionStatus }) {
  switch (status) {
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Confirmed
        </span>
      )
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Pending
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-red-500">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Failed
        </span>
      )
    default:
      return null
  }
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isIncoming = transaction.type === 'receive'
  const isOutgoing = transaction.type === 'send'

  return (
    <TableRow className="border-b border-border/30 transition-colors hover:bg-muted/40">
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            {getTransactionIcon(transaction.type)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900">
              {getTransactionActionText(transaction.type, transaction.asset.symbol)}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatRelativeTime(transaction.timestamp)}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell className="py-3">
        <StatusIndicator status={transaction.status} />
      </TableCell>

      <TableCell className="py-3 text-right">
        <div className="flex flex-col items-end">
          <span
            className={`font-inter font-semibold tabular-nums ${
              isIncoming
                ? 'text-emerald-600'
                : isOutgoing
                  ? 'text-red-500'
                  : 'text-foreground'
            }`}
          >
            {isIncoming ? '+' : isOutgoing ? '-' : ''}
            {transaction.asset.amount} {transaction.asset.symbol}
          </span>
          {transaction.value > 0 && (
            <span className="text-sm text-muted-foreground">
              {formatUSD(transaction.value)}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="py-3">
        <span className="text-sm text-muted-foreground">{transaction.counterparty}</span>
      </TableCell>

      <TableCell className="py-3">
        <a
          href={`https://etherscan.io/tx/${transaction.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-inter text-sm text-muted-foreground tabular-nums hover:text-foreground transition-colors"
        >
          {formatHash(transaction.hash)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </TableCell>
    </TableRow>
  )
}

export default function HistoryPage() {
  const [selectedChain, setSelectedChain] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<TransactionType | null>(null)

  const filteredTransactions = useMemo(() => {
    return mockTransactions.filter((tx) => {
      const chainMatch = selectedChain === null || tx.chainId === selectedChain
      const typeMatch = selectedType === null || tx.type === selectedType
      return chainMatch && typeMatch
    })
  }, [selectedChain, selectedType])

  const recentTransactionCount = useMemo(() => {
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    return filteredTransactions.filter((tx) => tx.timestamp >= sevenDaysAgo).length
  }, [filteredTransactions])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="font-inter text-sm font-medium text-muted-foreground">
            Transaction History
          </p>
          <h1 className="font-space mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Recent Activity
          </h1>
        </div>

        <div className="text-right">
          <p className="font-inter text-sm text-muted-foreground">Last 7 days</p>
          <p className="font-space text-2xl font-bold text-foreground">
            {recentTransactionCount} transactions
          </p>
        </div>
      </div>

      <HistoryFilter
        chains={supportedChains}
        selectedChain={selectedChain}
        onChainSelect={setSelectedChain}
        selectedType={selectedType}
        onTypeSelect={setSelectedType}
      />

      <div className="mt-6 w-full">
        {filteredTransactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="font-inter text-xs font-medium text-muted-foreground">
                  Transaction
                </TableHead>
                <TableHead className="font-inter text-xs font-medium text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-right font-inter text-xs font-medium text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="font-inter text-xs font-medium text-muted-foreground">
                  Counterparty
                </TableHead>
                <TableHead className="font-inter text-xs font-medium text-muted-foreground">
                  Hash
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <p className="text-base font-medium">No transactions found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
