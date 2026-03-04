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
  | { kind: 'pdf'; url: string }
  | { kind: 'text'; content: string }
  | { kind: 'quilt'; manifest: QuiltManifest }
  | { kind: 'download'; url: string; mimeType: string }
  | { kind: 'error'; message: string }

function isImageType(mime: string) {
  return /^image\/(jpeg|jpg|png|gif|webp|svg|bmp|tiff)/.test(mime)
}

function isPdfType(mime: string) {
  return mime === 'application/pdf'
}

function isTextType(mime: string) {
  return mime.startsWith('text/') || mime === 'application/json'
}

/** Trigger a proper file download by fetching the blob and creating an object URL */
async function triggerDownload(blobId: string, filename: string) {
  const url = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}

/** Detect image format from the first bytes (magic numbers) */
function detectImageFromBytes(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg'
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47)
    return 'image/png'
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38)
    return 'image/gif'
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp'
  // BMP: 42 4D
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) return 'image/bmp'
  return null
}

/** Detect PDF from magic bytes: %PDF (25 50 44 46) */
function detectPdfFromBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 4 &&
    bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
}

export function ProofViewerModal({ proof, isOpen, onClose }: ProofViewerModalProps) {
  const [content, setContent] = useState<ContentState>({ kind: 'loading' })

  useEffect(() => {
    if (!proof || !isOpen) return
    setContent({ kind: 'loading' })

    // Track object URLs for cleanup
    let objectUrl: string | null = null

    const blobUrl = `${WALRUS_AGGREGATOR_URL}/v1/blobs/${proof.blobId}`

    // Use the mimeType from proof metadata if available (enriched by HEAD request)
    const knownMime = proof.mimeType

    // If we already know it's an image from metadata, show directly without fetching bytes
    if (knownMime && isImageType(knownMime)) {
      setContent({ kind: 'image', url: blobUrl })
      return
    }

    // If we already know it's a PDF from metadata, create a proper blob URL for iframe
    if (knownMime && isPdfType(knownMime)) {
      fetch(blobUrl)
        .then(async (res) => {
          if (!res.ok) throw new Error(`Download failed: ${res.status}`)
          const blob = new Blob([await res.arrayBuffer()], { type: 'application/pdf' })
          objectUrl = URL.createObjectURL(blob)
          setContent({ kind: 'pdf', url: objectUrl })
        })
        .catch((err) => {
          setContent({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to load' })
        })
      return
    }

    fetch(blobUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`)

        const contentType = res.headers.get('content-type') || 'application/octet-stream'

        // If the aggregator returns a real content-type (not octet-stream), trust it
        if (isImageType(contentType)) {
          setContent({ kind: 'image', url: blobUrl })
          return
        }

        if (isPdfType(contentType)) {
          const blob = new Blob([await res.arrayBuffer()], { type: 'application/pdf' })
          objectUrl = URL.createObjectURL(blob)
          setContent({ kind: 'pdf', url: objectUrl })
          return
        }

        if (isTextType(contentType)) {
          const text = await res.text()
          setContent({ kind: 'text', content: text })
          return
        }

        // For octet-stream, read bytes and detect actual content
        const arrayBuffer = await res.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)

        // Check for image magic bytes first
        const detectedImage = detectImageFromBytes(bytes)
        if (detectedImage) {
          // Create an object URL from the actual bytes with correct type
          const blob = new Blob([bytes], { type: detectedImage })
          objectUrl = URL.createObjectURL(blob)
          setContent({ kind: 'image', url: objectUrl })
          return
        }

        // Check for PDF magic bytes
        if (detectPdfFromBytes(bytes)) {
          const blob = new Blob([bytes], { type: 'application/pdf' })
          objectUrl = URL.createObjectURL(blob)
          setContent({ kind: 'pdf', url: objectUrl })
          return
        }

        // Try to decode as text
        let text: string
        try {
          const decoder = new TextDecoder('utf-8', { fatal: true })
          text = decoder.decode(bytes)
        } catch {
          // Not valid UTF-8 — offer download
          setContent({ kind: 'download', url: blobUrl, mimeType: knownMime || contentType })
          return
        }

        // Try to detect quilt manifest (JSON with type: "quilt")
        try {
          const parsed = JSON.parse(text)
          if (parsed.type === 'quilt' && Array.isArray(parsed.patches)) {
            setContent({ kind: 'quilt', manifest: parsed as QuiltManifest })
            return
          }
        } catch {
          // Not JSON — continue as text
        }

        if (text.length < 100000) {
          setContent({ kind: 'text', content: text })
          return
        }

        setContent({ kind: 'download', url: blobUrl, mimeType: knownMime || contentType })
      })
      .catch((err) => {
        setContent({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to load' })
      })

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
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

            {content.kind === 'pdf' && (
              <div className="space-y-3">
                <iframe
                  src={content.url}
                  title={proof.description}
                  className="h-[55vh] w-full rounded-lg border border-white/10"
                />
                <div className="text-center">
                  <button
                    onClick={() => triggerDownload(proof.blobId, `proof-${proof.blobId.slice(0, 8)}.pdf`)}
                    className="rounded-lg bg-teal/20 px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal/30"
                  >
                    Download PDF
                  </button>
                </div>
              </div>
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
                {content.manifest.patches.map((patch) => (
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
                      <button
                        onClick={() => triggerDownload(patch.blobId, patch.filename)}
                        className="rounded px-2 py-1 text-xs text-teal hover:bg-teal/10"
                      >
                        Download
                      </button>
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
                <button
                  onClick={() => triggerDownload(proof.blobId, `proof-${proof.blobId.slice(0, 8)}`)}
                  className="inline-block rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/80"
                >
                  Download File
                </button>
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
