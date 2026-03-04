'use client'

import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { uploadBlob, uploadQuilt, hashFile, hashBytes } from '@/lib/walrus'

interface UploadResult {
  blobId: string
  contentHash: string
  txDigest: string
}

interface UploadStepProps {
  files: File[]
  description: string
  epochs: number
  result: UploadResult | null
  onResult: (result: UploadResult) => void
}

type UploadPhase = 'hashing' | 'uploading' | 'confirming' | 'done'

const PHASE_LABELS: Record<UploadPhase, string> = {
  hashing: 'Computing SHA-256 hash…',
  uploading: 'Uploading to Walrus…',
  confirming: 'Finalizing…',
  done: 'Complete!',
}

async function realUpload(
  files: File[],
  description: string,
  epochs: number,
  onPhase: (phase: UploadPhase) => void,
): Promise<UploadResult> {
  // Phase 1: Hash all content
  onPhase('hashing')
  let contentHash: string
  if (files.length > 0) {
    contentHash = await hashFile(files[0])
  } else {
    contentHash = await hashBytes(new TextEncoder().encode(description))
  }

  // Phase 2: Upload to Walrus
  onPhase('uploading')
  let blobId: string

  if (files.length > 1) {
    // Multi-file: use quilt upload
    const quiltResult = await uploadQuilt(files, epochs)
    blobId = quiltResult.quiltId
  } else if (files.length === 1) {
    // Single file upload
    const result = await uploadBlob(files[0], epochs)
    blobId = result.blobId
  } else {
    // Text-only proof: upload description as blob
    const blob = new Blob([description], { type: 'text/plain' })
    const file = new File([blob], 'testimony.txt', { type: 'text/plain' })
    const result = await uploadBlob(file, epochs)
    blobId = result.blobId
  }

  // Phase 3: Confirm
  onPhase('confirming')
  // On-chain registration will be added when smart contract is deployed
  const txDigest = `walrus_${blobId.slice(0, 16)}`

  onPhase('done')
  return { blobId, contentHash, txDigest }
}

export function UploadStep({ files, description, epochs, result, onResult }: UploadStepProps) {
  const [phase, setPhase] = useState<UploadPhase | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (started || result) return

    setStarted(true)
    realUpload(files, description, epochs, setPhase)
      .then(onResult)
      .catch((err: Error) => setError(err.message))
  }, [started, result, onResult, files, description, epochs])

  const progress =
    phase === 'hashing'
      ? 25
      : phase === 'uploading'
        ? 60
        : phase === 'confirming'
          ? 90
          : phase === 'done'
            ? 100
            : 0

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Uploading Evidence</h3>

      {error ? (
        <div className="rounded-lg border border-red/20 bg-red/10 p-4">
          <p className="text-sm text-red">{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-teal transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Phase label */}
          <div className="flex items-center gap-2">
            {phase !== 'done' && <Spinner size="sm" />}
            {phase === 'done' && <span className="text-teal">✓</span>}
            <span className="text-sm">{phase ? PHASE_LABELS[phase] : 'Starting…'}</span>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-white/10 bg-background p-3 text-xs text-text-muted">
            <p>Files: {files.length > 0 ? files.map((f) => f.name).join(', ') : 'Text-only proof'}</p>
            <p className="mt-1">Description: {description.slice(0, 100)}{description.length > 100 ? '…' : ''}</p>
          </div>
        </div>
      )}
    </div>
  )
}
