'use client'

import { estimateStorageCost } from '@/lib/walrus'
import { useWalrusEpoch } from '@/hooks/useWalrusEpoch'

const EPOCH_DURATION_LABEL =
  process.env.NEXT_PUBLIC_SUI_NETWORK === 'mainnet' ? '2 weeks' : '1 day'

interface StorageEstimateProps {
  totalBytes: number
  epochs: number
  onEpochsChange: (epochs: number) => void
}

export function StorageEstimate({ totalBytes, epochs, onEpochsChange }: StorageEstimateProps) {
  const { data: epochInfo } = useWalrusEpoch()
  const maxEpochsAhead = epochInfo?.maxEpochsAhead ?? 53
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
            <span className="text-text-muted">
              {epochs} epoch{epochs !== 1 ? 's' : ''}{' '}
              <span className="text-xs">({EPOCH_DURATION_LABEL} each)</span>
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={maxEpochsAhead}
            value={Math.min(epochs, maxEpochsAhead)}
            onChange={(e) => onEpochsChange(Number(e.target.value))}
            className="w-full accent-teal"
          />
          <div className="flex justify-between text-xs text-text-muted">
            <span>1 epoch</span>
            <span>{maxEpochsAhead} epochs (max)</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-text-muted">
        Evidence is stored permanently on Walrus (non-deletable). Storage duration can be extended
        later.
      </p>
    </div>
  )
}
