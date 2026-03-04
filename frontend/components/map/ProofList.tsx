'use client'

import type { WitnessProof } from '@/types'

const TYPE_ICONS: Record<string, string> = {
  file: '📄',
  url: '🔗',
  testimony: '🗣️',
}

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-teal/20 text-teal',
  unconfirmed: 'bg-orange/20 text-orange',
  blocked: 'bg-red/20 text-red',
}

interface ProofListProps {
  proofs: WitnessProof[]
}

export function ProofList({ proofs }: ProofListProps) {
  if (proofs.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-muted">
        No proofs submitted yet. Be the first to contribute evidence.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {proofs.map((proof) => (
        <div
          key={proof.blobId}
          className="rounded-lg border border-white/5 bg-background p-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span title={proof.proofType}>{TYPE_ICONS[proof.proofType] ?? '📎'}</span>
              <span className="text-sm">{proof.description}</span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[proof.status] ?? ''}`}
            >
              {proof.status}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
            <span title="Relevance score">
              Score: <span className="font-medium text-white">{proof.relevanceScore}</span>/100
            </span>
            <span>
              {proof.submitterAddress.slice(0, 6)}…{proof.submitterAddress.slice(-4)}
            </span>
            <span>{new Date(proof.timestamp).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
