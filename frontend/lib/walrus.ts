// ============================================================
// Walrus Service — blob upload, download, estimate, renew
// Uses HTTP publisher/aggregator APIs via backend routes
// ============================================================

import type { PatchRecord, StorageEstimate } from '@/types'

const WALRUS_AGGREGATOR_URL =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
  'https://aggregator.walrus-testnet.walrus.space'

// --- Upload ---

export interface BlobUploadResult {
  blobId: string
  cost?: number
}

export async function uploadBlob(file: File, epochs: number = 5): Promise<BlobUploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('epochs', epochs.toString())

  const res = await fetch('/api/walrus/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Walrus upload failed: ${res.status}`)
  }

  return res.json()
}

export async function uploadBytes(
  data: Uint8Array,
  filename: string,
  epochs: number = 5,
): Promise<BlobUploadResult> {
  const buffer = new ArrayBuffer(data.byteLength)
  new Uint8Array(buffer).set(data)
  const blob = new Blob([buffer], { type: 'application/octet-stream' })
  const file = new File([blob], filename, { type: 'application/octet-stream' })
  return uploadBlob(file, epochs)
}

// --- Quilt (multi-file) upload ---

export interface QuiltUploadResult {
  quiltId: string
  patches: PatchRecord[]
  errors?: string[]
}

export async function uploadQuilt(files: File[], epochs: number = 5): Promise<QuiltUploadResult> {
  const formData = new FormData()
  formData.append('epochs', epochs.toString())
  for (const file of files) {
    formData.append('files', file)
  }

  const res = await fetch('/api/walrus/quilt', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Quilt upload failed: ${res.status}`)
  }

  return res.json()
}

// --- Download ---

export async function downloadBlob(blobId: string): Promise<Blob> {
  const res = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`)
  if (!res.ok) {
    throw new Error(`Walrus download failed: ${res.status}`)
  }
  return res.blob()
}

export async function downloadBlobAsText(blobId: string): Promise<string> {
  const blob = await downloadBlob(blobId)
  return blob.text()
}

// --- Estimate ---

export function estimateStorageCost(bytes: number, epochs: number): StorageEstimate {
  // Walrus pricing: ~0.001 SUI per MB per epoch on testnet
  // This is approximate — real cost comes from the system state
  const mb = bytes / (1024 * 1024)
  const estimatedCostSui = Math.max(0.001, mb * 0.001 * epochs)
  return { bytes, estimatedCostSui }
}

// --- Hash ---

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hash))
  return 'sha256:' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashBytes(data: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(data.byteLength)
  new Uint8Array(buffer).set(data)
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hash))
  return 'sha256:' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
