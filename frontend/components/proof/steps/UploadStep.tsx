'use client'

import { useEffect, useRef, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { useSubmitProof } from '@/hooks/useSubmitProof'
import type { ProofType } from '@/types'

interface UploadResult {
  blobId: string
  contentHash: string
  txDigest: string
}

interface UploadStepProps {
  files: File[]
  description: string
  url: string
  proofType: ProofType
  eventId: string
  relevanceScore: number
  epochs: number
  result: UploadResult | null
  onResult: (result: UploadResult) => void
}

type Phase = 'hashing' | 'uploading' | 'signing' | 'confirming' | 'done'

const PHASE_LABELS: Record<Phase, string> = {
  hashing: 'Computing SHA-256 hash…',
  uploading: 'Uploading to Walrus…',
  signing: 'Sign the transaction in your wallet…',
  confirming: 'Confirming on-chain…',
  done: 'Complete!',
}

export function UploadStep({
  files,
  description,
  url,
  proofType,
  eventId,
  relevanceScore,
  epochs,
  result,
  onResult,
}: UploadStepProps) {
  const [phase, setPhase] = useState<Phase | null>(null)
  const started = useRef(false)

  const { submit, error } = useSubmitProof({
    onPhase: setPhase,
  })

  useEffect(() => {
    if (started.current || result) return
    started.current = true

    submit({
      files,
      description,
      url,
      proofType,
      eventId,
      relevanceScore,
      epochs,
    }).then(onResult)
  }, [submit, result, onResult, files, description, url, proofType, eventId, relevanceScore, epochs])

  const progress =
    phase === 'hashing'
      ? 20
      : phase === 'uploading'
        ? 50
        : phase === 'signing'
          ? 70
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
