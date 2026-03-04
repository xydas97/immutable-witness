'use client'

import { useState, useCallback } from 'react'
import type { GdeltEvent, ProofType, RelevanceResult } from '@/types'
import { TypeSelection } from './steps/TypeSelection'
import { ContentInput } from './steps/ContentInput'
import { RelevanceCheck } from './steps/RelevanceCheck'
import { StorageEstimate } from './steps/StorageEstimate'
import { UploadStep } from './steps/UploadStep'
import { Confirmation } from './steps/Confirmation'

const STEP_LABELS = [
  'Type',
  'Content',
  'Relevance',
  'Storage',
  'Upload',
  'Done',
]

interface ProofSubmissionModalProps {
  event: GdeltEvent
  isOpen: boolean
  onClose: () => void
}

interface UploadResult {
  blobId: string
  contentHash: string
  txDigest: string
}

export function ProofSubmissionModal({ event, isOpen, onClose }: ProofSubmissionModalProps) {
  const [step, setStep] = useState(0)
  const [proofType, setProofType] = useState<ProofType | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [relevanceResult, setRelevanceResult] = useState<RelevanceResult | null>(null)
  const [epochs, setEpochs] = useState(53) // ~1 year default
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  const handleUploadResult = useCallback((result: UploadResult) => {
    setUploadResult(result)
    setStep(5)
  }, [])

  function reset() {
    setStep(0)
    setProofType(null)
    setFiles([])
    setUrl('')
    setDescription('')
    setRelevanceResult(null)
    setEpochs(53)
    setUploadResult(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return proofType !== null
      case 1:
        if (proofType === 'file') return files.length > 0 && description.length > 0
        if (proofType === 'url') return url.length > 0 && description.length > 0
        return description.length > 0
      case 2:
        return relevanceResult !== null && relevanceResult.score >= 40
      case 3:
        return true
      default:
        return false
    }
  }

  const totalBytes =
    files.reduce((acc, f) => acc + f.size, 0) +
    new Blob([description]).size +
    (url ? new Blob([url]).size : 0)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[2000] bg-black/60" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[2001] flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-xl border border-white/10 bg-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <h2 className="font-semibold">Submit Proof</h2>
              <p className="mt-0.5 truncate text-xs text-text-muted">{event.title}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-text-muted hover:text-white"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Step indicators */}
          <div className="flex gap-1 px-6 pt-4">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex-1">
                <div
                  className={`h-1 rounded-full transition-colors ${
                    i <= step ? 'bg-teal' : 'bg-white/10'
                  }`}
                />
                <p
                  className={`mt-1 text-center text-[10px] ${
                    i === step ? 'font-medium text-teal' : 'text-text-muted'
                  }`}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
            {step === 0 && (
              <TypeSelection
                selected={proofType}
                onSelect={(type) => {
                  setProofType(type)
                }}
              />
            )}
            {step === 1 && proofType && (
              <ContentInput
                proofType={proofType}
                files={files}
                onFilesChange={setFiles}
                url={url}
                onUrlChange={setUrl}
                description={description}
                onDescriptionChange={setDescription}
              />
            )}
            {step === 2 && (
              <RelevanceCheck
                event={event}
                description={description}
                url={url}
                result={relevanceResult}
                onResult={setRelevanceResult}
              />
            )}
            {step === 3 && (
              <StorageEstimate
                totalBytes={totalBytes}
                epochs={epochs}
                onEpochsChange={setEpochs}
              />
            )}
            {step === 4 && (
              <UploadStep
                files={files}
                description={description}
                epochs={epochs}
                result={uploadResult}
                onResult={handleUploadResult}
              />
            )}
            {step === 5 && uploadResult && (
              <Confirmation
                blobId={uploadResult.blobId}
                contentHash={uploadResult.contentHash}
                txDigest={uploadResult.txDigest}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
            {step > 0 && step < 5 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-sm text-text-muted hover:text-white"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 && (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="rounded-lg bg-teal px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-teal/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {step === 3 ? 'Upload' : 'Next'}
              </button>
            )}

            {step === 5 && (
              <button
                onClick={handleClose}
                className="rounded-lg bg-teal px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-teal/80"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
