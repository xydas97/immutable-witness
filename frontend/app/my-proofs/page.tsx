'use client'

import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useMyProofs } from '@/hooks/useMyProofs'
import { useRemoveProof } from '@/hooks/useRemoveProof'
import { PageShell } from '@/components/layout/PageShell'
import { StatsBar } from '@/components/proofs/StatsBar'
import { ProofTable } from '@/components/proofs/ProofTable'
import { EpochExtensionModal } from '@/components/proofs/EpochExtensionModal'
import { ProofViewerModal } from '@/components/proofs/ProofViewerModal'
import { Spinner } from '@/components/ui/Spinner'
import type { WitnessProof } from '@/types'

const DEFAULT_DELETE_THRESHOLD = 60

export default function MyProofsPage() {
  const account = useCurrentAccount()
  const { data: proofs, isLoading, isError } = useMyProofs()
  const { remove, isLoading: isDeleting } = useRemoveProof()
  const queryClient = useQueryClient()
  const [extendProof, setExtendProof] = useState<WitnessProof | null>(null)
  const [viewProof, setViewProof] = useState<WitnessProof | null>(null)
  const [deleteProof, setDeleteProof] = useState<WitnessProof | null>(null)
  const [deleteThreshold, setDeleteThreshold] = useState(DEFAULT_DELETE_THRESHOLD)

  // Persist threshold in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('deleteThreshold')
    if (stored) setDeleteThreshold(Number(stored))
  }, [])

  function handleThresholdChange(value: number) {
    setDeleteThreshold(value)
    localStorage.setItem('deleteThreshold', String(value))
  }

  async function handleConfirmDelete() {
    if (!deleteProof) return
    try {
      const digest = await remove({
        eventId: deleteProof.eventId,
        submitterAddress: deleteProof.submitterAddress,
        blobId: deleteProof.blobId,
      })
      toast.success(`Proof deleted. Tx: ${digest.slice(0, 12)}…`)
      setDeleteProof(null)
      queryClient.invalidateQueries({ queryKey: ['my-proofs'] })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      toast.error(`Delete failed: ${msg}`)
    }
  }

  if (!account) {
    return (
      <PageShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">My Proofs</h1>
          <p className="text-text-muted">Connect your wallet to view your submitted evidence.</p>
        </div>
      </PageShell>
    )
  }

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </PageShell>
    )
  }

  if (isError) {
    return (
      <PageShell>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-red-400">Failed to load proofs.</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Proofs</h1>
          <p className="mt-1 text-sm text-text-muted">
            Manage your submitted evidence. Verify integrity, extend storage, or view archived
            content.
          </p>
        </div>

        <StatsBar proofs={proofs ?? []} />

        {/* Delete threshold config */}
        <div className="rounded-lg border border-white/10 bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Low-Score Deletion Threshold</p>
              <p className="text-xs text-text-muted">
                Proofs scoring below {deleteThreshold}% can be deleted (contract enforces &lt;75 max)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={74}
                value={deleteThreshold}
                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                className="w-32 accent-red"
              />
              <span className="w-10 text-right font-mono text-sm text-red">{deleteThreshold}%</span>
            </div>
          </div>
        </div>

        <ProofTable
          proofs={proofs ?? []}
          onExtend={setExtendProof}
          onView={setViewProof}
          onDelete={setDeleteProof}
          deleteThreshold={deleteThreshold}
        />
      </div>

      {extendProof && (
        <EpochExtensionModal
          proof={extendProof}
          isOpen={!!extendProof}
          onClose={() => setExtendProof(null)}
        />
      )}

      <ProofViewerModal
        proof={viewProof}
        isOpen={!!viewProof}
        onClose={() => setViewProof(null)}
      />

      {/* Delete confirmation modal */}
      {deleteProof && (
        <>
          <div className="fixed inset-0 z-[2000] bg-black/60" onClick={() => setDeleteProof(null)} />
          <div className="fixed inset-0 z-[2001] flex items-center justify-center p-4">
            <div
              className="w-full max-w-sm rounded-xl border border-white/10 bg-surface shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-white/10 px-6 py-4">
                <h2 className="font-semibold text-red">Delete Proof</h2>
              </div>
              <div className="space-y-3 px-6 py-4">
                <p className="text-sm">
                  Remove this proof from the on-chain registry? This action cannot be undone.
                </p>
                <div className="rounded-lg border border-white/10 bg-background p-3 text-xs">
                  <p className="truncate"><span className="text-text-muted">Description:</span> {deleteProof.description}</p>
                  <p><span className="text-text-muted">Score:</span> <span className="text-red">{deleteProof.relevanceScore}/100</span></p>
                  <p className="truncate"><span className="text-text-muted">Blob:</span> {deleteProof.blobId.slice(0, 16)}…</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
                <button
                  onClick={() => setDeleteProof(null)}
                  className="rounded-lg px-4 py-2 text-sm text-text-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="rounded-lg bg-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red/80 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting…' : 'Delete Proof'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageShell>
  )
}
