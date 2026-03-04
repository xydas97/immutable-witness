'use client'

import { estimateStorageCost } from '@/lib/walrus'

interface StorageEstimateProps {
  totalBytes: number
  epochs: number
  onEpochsChange: (epochs: number) => void
}

export function StorageEstimate({ totalBytes, epochs, onEpochsChange }: StorageEstimateProps) {
  const { estimatedCostSui: cost } = estimateStorageCost(totalBytes, epochs)

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Storage Estimate</h3>
      <p className="text-sm text-text-muted">
        Review the storage cost before uploading to Walrus decentralized storage.
      </p>

      <div className="rounded-lg border border-white/10 bg-background p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase text-text-muted">File Size</p>
            <p className="mt-1 text-lg font-semibold">
              {totalBytes < 1024
                ? `${totalBytes} B`
                : totalBytes < 1024 * 1024
                  ? `${(totalBytes / 1024).toFixed(1)} KB`
                  : `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-text-muted">Estimated Cost</p>
            <p className="mt-1 text-lg font-semibold text-teal">{cost.toFixed(4)} SUI</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 flex items-center justify-between text-sm">
            <span>Storage Epochs</span>
            <span className="text-text-muted">{epochs} epoch{epochs !== 1 ? 's' : ''}</span>
          </label>
          <input
            type="range"
            min={1}
            max={200}
            value={epochs}
            onChange={(e) => onEpochsChange(Number(e.target.value))}
            className="w-full accent-teal"
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>1 epoch</span>
            <span>200 epochs</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-text-muted">
        Evidence is stored immutably on Walrus. Once uploaded, it cannot be deleted or modified.
      </p>
    </div>
  )
}
