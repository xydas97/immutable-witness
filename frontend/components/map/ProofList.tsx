'use client'

import type { WitnessProof } from '@/types'

const TYPE_ICONS: Record<string, string> = {
  file: '📄',
  url: '🔗',
  testimony: '🗣️',
}

function statusFromScore(score: number) {
  if (score >= 75) return { label: 'verified', style: 'bg-teal/20 text-teal' }
  if (score >= 40) return { label: 'review', style: 'bg-orange/20 text-orange' }
  return { label: 'low', style: 'bg-red/20 text-red' }
}

interface ProofListProps {
  proofs: WitnessProof[]
  onView?: (proof: WitnessProof) => void
}

export function ProofList({ proofs, onView }: ProofListProps) {
  if (proofs.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-text-muted">
        No proofs submitted yet. Be the first to contribute evidence.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {proofs.map((proof) => {
        const status = statusFromScore(proof.relevanceScore)
        return (
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
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.style}`}
              >
                {status.label}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
              <span title="Relevance score">
                Score: <span className="font-medium text-white">{proof.relevanceScore}</span>/100
              </span>
              <span>
                {proof.submitterAddress.slice(0, 6)}…{proof.submitterAddress.slice(-4)}
              </span>
              <a
                href={`https://walruscan.com/testnet/blob/${proof.blobId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal hover:underline"
              >
                Explorer
              </a>
              {onView && (
                <button
                  onClick={() => onView(proof)}
                  className="text-teal hover:underline"
                >
                  View
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
