'use client'

import type { WitnessProof } from '@/types'

interface StatsBarProps {
  proofs: WitnessProof[]
}

export function StatsBar({ proofs }: StatsBarProps) {
  const totalProofs = proofs.length
  const verified = proofs.filter((p) => p.status === 'verified').length
  const expiringSoon = proofs.filter((p) => p.epoch < 60).length // mock: epochs < 60 are "expiring"
  // Mock storage calculation: ~50KB per proof
  const storageUsed = totalProofs * 50

  const stats = [
    { label: 'Total Proofs', value: totalProofs.toString(), color: 'text-white' },
    { label: 'Verified', value: verified.toString(), color: 'text-teal' },
    {
      label: 'Storage Used',
      value: storageUsed < 1024 ? `${storageUsed} KB` : `${(storageUsed / 1024).toFixed(1)} MB`,
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
