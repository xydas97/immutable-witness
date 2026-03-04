'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import type { WitnessProof } from '@/types'
import { useWalrusEpoch } from '@/hooks/useWalrusEpoch'
import { estimateStorageCost } from '@/lib/walrus'
import { Spinner } from '@/components/ui/Spinner'

const EPOCH_DURATION_LABEL =
  process.env.NEXT_PUBLIC_SUI_NETWORK === 'mainnet' ? '2 weeks' : '1 day'

interface EpochExtensionModalProps {
  proof: WitnessProof
  isOpen: boolean
  onClose: () => void
}

export function EpochExtensionModal({ proof, isOpen, onClose }: EpochExtensionModalProps) {
  const { data: epochInfo, isLoading: epochLoading } = useWalrusEpoch()
  const [additionalEpochs, setAdditionalEpochs] = useState(1)
  const [extending, setExtending] = useState(false)
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const currentEpoch = epochInfo?.currentEpoch ?? null
  const maxEpochsAhead = epochInfo?.maxEpochsAhead ?? 53
  const blobEndEpoch = proof.endEpoch ?? null

  // Max new endEpoch is currentEpoch + maxEpochsAhead
  // Max additional epochs = maxNewEnd - currentEnd
  const maxExtension = useMemo(() => {
    if (currentEpoch === null || blobEndEpoch === null) return maxEpochsAhead
    const maxNewEnd = currentEpoch + maxEpochsAhead
    const available = maxNewEnd - blobEndEpoch
    return Math.max(1, Math.min(available, maxEpochsAhead))
  }, [currentEpoch, blobEndEpoch, maxEpochsAhead])

  const remainingEpochs = (blobEndEpoch !== null && currentEpoch !== null && blobEndEpoch > currentEpoch) ? blobEndEpoch - currentEpoch : 0
  const newEndEpoch = (blobEndEpoch ?? 0) + additionalEpochs
  const blobSize = proof.size ?? 0
  const { estimatedCostSui: extensionCost } = estimateStorageCost(blobSize, additionalEpochs)

  async function handleExtend() {
    setExtending(true)
    try {
      // Step 1: Find the blob object ID via the server
      const res = await fetch('/api/walrus/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobId: proof.blobId,
          epochs: additionalEpochs,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Server error: ${res.status}`)
      }

      const { blobObjectId, walrusPackage, systemObjectId } = await res.json()

      // Step 2: Build the extension PTB on the client
      const tx = new Transaction()
      tx.moveCall({
        target: `${walrusPackage}::system::extend_blob`,
        arguments: [
          tx.object(systemObjectId),
          tx.object(blobObjectId),
          tx.pure.u32(additionalEpochs),
        ],
      })

      // Step 3: Sign and execute with the user's wallet
      const result = await signAndExecute({ transaction: tx })
      const digest = 'digest' in result ? result.digest : ''

      // Step 4: Wait for confirmation
      if (digest) {
        await suiClient.waitForTransaction({ digest })
      }

      toast.success(
        `Storage extended by ${additionalEpochs} epoch${additionalEpochs > 1 ? 's' : ''} for blob ${proof.blobId.slice(0, 8)}…`,
      )
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Extension failed'
      toast.error(`Extension failed: ${msg}`)
    } finally {
      setExtending(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[2000] bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-[2001] flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-xl border border-white/10 bg-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="font-semibold">Extend Storage</h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Blob: {proof.blobId.slice(0, 16)}…
            </p>
          </div>

          <div className="space-y-4 px-6 py-4">
            {epochLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner size="md" />
              </div>
            ) : (
              <>
                {/* Epoch info grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/10 bg-background p-3">
                    <p className="text-xs uppercase text-text-muted">Current Epoch</p>
                    <p className="mt-1 text-lg font-semibold">{currentEpoch ?? '–'}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-background p-3">
                    <p className="text-xs uppercase text-text-muted">Blob Expires</p>
                    <p className={`mt-1 text-lg font-semibold ${remainingEpochs <= 5 ? 'text-orange' : 'text-white'}`}>
                      {blobEndEpoch !== null ? `Epoch ${blobEndEpoch}` : 'Unknown'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-background p-3">
                    <p className="text-xs uppercase text-text-muted">Remaining</p>
                    <p className={`mt-1 text-lg font-semibold ${remainingEpochs <= 5 ? 'text-orange' : 'text-teal'}`}>
                      {remainingEpochs} epoch{remainingEpochs !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-background p-3">
                    <p className="text-xs uppercase text-text-muted">New Expiry</p>
                    <p className="mt-1 text-lg font-semibold text-teal">
                      Epoch {newEndEpoch}
                    </p>
                  </div>
                </div>

                {/* Extension slider */}
                <div>
                  <label className="mb-2 flex items-center justify-between text-sm">
                    <span>Additional Epochs</span>
                    <span className="text-text-muted">
                      +{additionalEpochs} ({EPOCH_DURATION_LABEL} each)
                    </span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={maxExtension}
                    value={Math.min(additionalEpochs, maxExtension)}
                    onChange={(e) => setAdditionalEpochs(Number(e.target.value))}
                    className="w-full accent-teal"
                  />
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>1</span>
                    <span>{maxExtension} (max)</span>
                  </div>
                </div>

                {/* Cost estimate */}
                <div className="rounded-lg border border-white/10 bg-background p-3">
                  <p className="text-xs uppercase text-text-muted">Estimated Extension Cost</p>
                  <p className="mt-1 text-xl font-bold text-teal">
                    {extensionCost.toFixed(6)} SUI
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-text-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleExtend}
              disabled={extending || epochLoading}
              className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal/80 disabled:opacity-50"
            >
              {extending ? 'Extending…' : 'Extend Storage'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
