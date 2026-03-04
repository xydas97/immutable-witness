'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { WitnessProof } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-teal/20 text-teal',
  unconfirmed: 'bg-orange/20 text-orange',
  blocked: 'bg-red/20 text-red',
}

const TYPE_ICONS: Record<string, string> = {
  file: '📄',
  url: '🔗',
  testimony: '🗣️',
}

interface ProofTableProps {
  proofs: WitnessProof[]
  onExtend: (proof: WitnessProof) => void
}

export function ProofTable({ proofs, onExtend }: ProofTableProps) {
  const [page, setPage] = useState(0)
  const pageSize = 10
  const totalPages = Math.ceil(proofs.length / pageSize)
  const pageProofs = proofs.slice(page * pageSize, (page + 1) * pageSize)

  function handleVerify(proof: WitnessProof) {
    // TODO: Integrate with real Walrus blob verification (INT-03)
    toast.success(`Blob ${proof.blobId.slice(0, 8)}… verified on Walrus`)
  }

  function handleView(proof: WitnessProof) {
    // TODO: Open blob viewer with real Walrus content retrieval
    toast.info(`Viewing blob ${proof.blobId.slice(0, 8)}…`)
  }

  if (proofs.length === 0) {
    return (
      <p className="py-12 text-center text-text-muted">
        No proofs submitted yet. Visit the Live Map to submit evidence for events.
      </p>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-surface">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Epoch
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pageProofs.map((proof) => (
              <tr key={proof.blobId} className="hover:bg-white/5">
                <td className="px-4 py-3">
                  <span title={proof.proofType}>{TYPE_ICONS[proof.proofType] ?? '📎'}</span>
                </td>
                <td className="max-w-xs truncate px-4 py-3">{proof.description}</td>
                <td className="px-4 py-3">
                  <span className="font-medium">{proof.relevanceScore}</span>
                  <span className="text-text-muted">/100</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[proof.status] ?? ''}`}
                  >
                    {proof.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">{proof.epoch}</td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(proof.timestamp).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => handleVerify(proof)}
                      className="rounded px-2 py-1 text-xs text-teal hover:bg-teal/10"
                    >
                      Verify
                    </button>
                    <button
                      onClick={() => onExtend(proof)}
                      className="rounded px-2 py-1 text-xs text-blue hover:bg-blue/10"
                    >
                      Extend
                    </button>
                    <button
                      onClick={() => handleView(proof)}
                      className="rounded px-2 py-1 text-xs text-text-muted hover:bg-white/10"
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, proofs.length)} of{' '}
            {proofs.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded px-3 py-1 text-sm text-text-muted hover:text-white disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded px-3 py-1 text-sm text-text-muted hover:text-white disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
