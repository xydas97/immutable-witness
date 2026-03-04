'use client'

import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import type { WitnessProof } from '@/types'

const WALRUS_AGGREGATOR_URL =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
  'https://aggregator.walrus-testnet.walrus.space'

interface QuiltManifest {
  type: 'quilt'
  patches: { blobId: string; filename: string; mimeType: string; size: number }[]
}

interface ProofViewerModalProps {
  proof: WitnessProof | null
  isOpen: boolean
  onClose: () => void
}

type ContentState =
  | { kind: 'loading' }
  | { kind: 'image'; url: string }
  | { kind: 'text'; content: string }
  | { kind: 'quilt'; manifest: QuiltManifest }
  | { kind: 'download'; url: string; mimeType: string }
  | { kind: 'error'; message: string }

function isImageType(mime: string) {
  return /^image\/(jpeg|jpg|png|gif|webp|svg)/.test(mime)
}

function isTextType(mime: string) {
  return mime.startsWith('text/') || mime === 'application/json'
}

export function ProofViewerModal({ proof, isOpen, onClose }: ProofViewerModalProps) {
  const [content, setContent] = useState<ContentState>({ kind: 'loading' })

  useEffect(() => {
    if (!proof || !isOpen) return
    setContent({ kind: 'loading' })

    const blobUrl = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${proof.blobId}`

    fetch(blobUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`)

        const contentType = res.headers.get('content-type') || 'application/octet-stream'

        // Try to detect quilt manifest (JSON with type: "quilt")
        if (contentType.includes('octet-stream') || contentType.includes('json')) {
          const text = await res.text()
          try {
            const parsed = JSON.parse(text)
            if (parsed.type === 'quilt' && Array.isArray(parsed.patches)) {
              setContent({ kind: 'quilt', manifest: parsed as QuiltManifest })
              return
            }
          } catch {
            // Not JSON — treat as text if it looks like text
            if (text.length < 100000 && /^[\x20-\x7E\s]*$/.test(text.slice(0, 500))) {
              setContent({ kind: 'text', content: text })
              return
            }
          }
          // Plain text content
          if (text.length < 100000) {
            setContent({ kind: 'text', content: text })
            return
          }
        }

        if (isImageType(contentType)) {
          setContent({ kind: 'image', url: blobUrl })
          return
        }

        if (isTextType(contentType)) {
          const text = await res.text()
          setContent({ kind: 'text', content: text })
          return
        }

        setContent({ kind: 'download', url: blobUrl, mimeType: contentType })
      })
      .catch((err) => {
        setContent({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to load' })
      })
  }, [proof, isOpen])

  if (!isOpen || !proof) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[2001] bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 z-[2002] flex items-center justify-center">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-surface shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold">Proof Viewer</h3>
              <p className="mt-0.5 text-xs text-text-muted">{proof.description}</p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-white">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-5">
            {content.kind === 'loading' && (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            )}

            {content.kind === 'image' && (
              <img
                src={content.url}
                alt={proof.description}
                className="mx-auto max-h-[50vh] rounded-lg object-contain"
              />
            )}

            {content.kind === 'text' && (
              <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-background p-4 font-mono text-sm">
                {content.content}
              </pre>
            )}

            {content.kind === 'quilt' && (
              <div className="space-y-3">
                <p className="text-sm text-text-muted">
                  This proof contains {content.manifest.patches.length} files:
                </p>
                {content.manifest.patches.map((patch, i) => (
                  <div
                    key={patch.blobId}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-background p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{patch.filename}</p>
                      <p className="text-xs text-text-muted">
                        {patch.mimeType} · {(patch.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`${WALRUS_AGGREGATOR_URL}/v1/blobs/${patch.blobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded px-2 py-1 text-xs text-teal hover:bg-teal/10"
                      >
                        Download
                      </a>
                      <a
                        href={`https://walruscan.com/testnet/blob/${patch.blobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded px-2 py-1 text-xs text-text-muted hover:bg-white/10"
                      >
                        Explorer
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {content.kind === 'download' && (
              <div className="text-center py-8">
                <p className="text-sm text-text-muted mb-4">
                  This file type ({content.mimeType}) cannot be previewed.
                </p>
                <a
                  href={content.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/80"
                >
                  Download File
                </a>
              </div>
            )}

            {content.kind === 'error' && (
              <div className="rounded-lg border border-red/20 bg-red/10 p-4 text-center">
                <p className="text-sm text-red">{content.message}</p>
              </div>
            )}
          </div>

          {/* Footer — metadata + links */}
          <div className="border-t border-white/10 px-5 py-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span>Score: <span className="font-medium text-white">{proof.relevanceScore}</span>/100</span>
              <span>Type: {proof.proofType}</span>
              <span>{proof.submitterAddress.slice(0, 6)}…{proof.submitterAddress.slice(-4)}</span>
              <a
                href={`https://walruscan.com/testnet/blob/${proof.blobId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal hover:underline"
              >
                Walrus Explorer
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
