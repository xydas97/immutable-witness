'use client'

import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'

interface UploadResult {
  blobId: string
  contentHash: string
  txDigest: string
}

interface UploadStepProps {
  files: File[]
  description: string
  result: UploadResult | null
  onResult: (result: UploadResult) => void
}

type UploadPhase = 'hashing' | 'uploading' | 'signing' | 'confirming' | 'done'

const PHASE_LABELS: Record<UploadPhase, string> = {
  hashing: 'Computing SHA-256 hash…',
  uploading: 'Uploading to Walrus…',
  signing: 'Signing Sui transaction…',
  confirming: 'Confirming on-chain…',
  done: 'Complete!',
}

// Mock upload flow — replace with real Walrus + Sui integration (INT-03)
async function mockUpload(
  onPhase: (phase: UploadPhase) => void,
): Promise<UploadResult> {
  onPhase('hashing')
  await new Promise((r) => setTimeout(r, 1000))

  onPhase('uploading')
  await new Promise((r) => setTimeout(r, 2000))

  onPhase('signing')
  await new Promise((r) => setTimeout(r, 1500))

  onPhase('confirming')
  await new Promise((r) => setTimeout(r, 1000))

  onPhase('done')

  return {
    blobId: 'mock_' + Math.random().toString(36).slice(2, 10),
    contentHash: 'sha256:' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    txDigest: 'mock_tx_' + Math.random().toString(36).slice(2, 14),
  }
}

export function UploadStep({ files, description, result, onResult }: UploadStepProps) {
  const [phase, setPhase] = useState<UploadPhase | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (started || result) return

    setStarted(true)
    mockUpload(setPhase)
      .then(onResult)
      .catch((err: Error) => setError(err.message))
  }, [started, result, onResult])

  const progress =
    phase === 'hashing'
      ? 20
      : phase === 'uploading'
        ? 50
        : phase === 'signing'
          ? 75
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
