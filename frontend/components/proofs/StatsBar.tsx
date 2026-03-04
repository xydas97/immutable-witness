'use client'

import type { WitnessProof } from '@/types'
import { useWalrusEpoch } from '@/hooks/useWalrusEpoch'

interface StatsBarProps {
  proofs: WitnessProof[]
}

export function StatsBar({ proofs }: StatsBarProps) {
  const { data: epochInfo } = useWalrusEpoch()
  const currentEpoch = epochInfo?.currentEpoch ?? null

  const totalProofs = proofs.length
  const verified = proofs.filter((p) => p.relevanceScore >= 75).length

  // Expiring soon: endEpoch is within 10 epochs of current epoch
  const expiringSoon = proofs.filter((p) => {
    if (p.endEpoch == null || currentEpoch === null) return false
    const remaining = p.endEpoch - currentEpoch
    return remaining >= 0 && remaining <= 10
  }).length

  // Use real blob sizes when available, otherwise 0
  const storageUsedBytes = proofs.reduce((acc, p) => acc + (p.size ?? 0), 0)
  const storageUsed = storageUsedBytes / 1024 // KB

  const stats = [
    { label: 'Total Proofs', value: totalProofs.toString(), color: 'text-white' },
    { label: 'Verified', value: verified.toString(), color: 'text-teal' },
    {
      label: 'Storage Used',
      value:
        storageUsedBytes === 0
          ? '0 B'
          : storageUsedBytes < 1024
            ? `${storageUsedBytes} B`
            : storageUsed < 1024
              ? `${storageUsed.toFixed(1)} KB`
              : `${(storageUsed / 1024).toFixed(1)} MB`,
      color: 'text-blue',
    },
    {
      label: 'Expiring Soon',
      value: expiringSoon.toString(),
      color: expiringSoon > 0 ? 'text-orange' : 'text-text-muted',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-white/10 bg-surface p-4"
        >
          <p className="text-xs uppercase tracking-wider text-text-muted">{stat.label}</p>
          <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}
