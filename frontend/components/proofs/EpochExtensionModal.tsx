'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { WitnessProof } from '@/types'

interface EpochExtensionModalProps {
  proof: WitnessProof
  isOpen: boolean
  onClose: () => void
}

function estimateExtensionCost(additionalEpochs: number): number {
  // Mock: ~0.001 SUI per additional epoch
  return Math.max(0.001, additionalEpochs * 0.001)
}

export function EpochExtensionModal({ proof, isOpen, onClose }: EpochExtensionModalProps) {
  const [additionalEpochs, setAdditionalEpochs] = useState(53)
  const [extending, setExtending] = useState(false)

  const cost = estimateExtensionCost(additionalEpochs)

  async function handleExtend() {
    setExtending(true)
    // TODO: Replace with real Walrus epoch extension (INT-03)
    await new Promise((r) => setTimeout(r, 1500))
    toast.success(
      `Storage extended by ${additionalEpochs} epochs for blob ${proof.blobId.slice(0, 8)}…`,
    )
    setExtending(false)
    onClose()
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
            <div>
              <p className="text-sm text-text-muted">Current epoch: {proof.epoch}</p>
              <p className="text-sm text-text-muted">
                New expiry: epoch {proof.epoch + additionalEpochs}
              </p>
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-sm">
                <span>Additional Epochs</span>
                <span className="text-text-muted">{additionalEpochs}</span>
              </label>
              <input
                type="range"
                min={1}
                max={200}
                value={additionalEpochs}
                onChange={(e) => setAdditionalEpochs(Number(e.target.value))}
                className="w-full accent-teal"
              />
              <div className="flex justify-between text-xs text-text-muted">
                <span>1</span>
                <span>200</span>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-background p-3">
              <p className="text-xs uppercase text-text-muted">Estimated Cost</p>
              <p className="mt-1 text-xl font-bold text-teal">{cost.toFixed(4)} SUI</p>
            </div>
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
              disabled={extending}
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
