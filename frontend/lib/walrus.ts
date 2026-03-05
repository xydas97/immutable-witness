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
  contentHash: string
  cost?: number
  endEpoch?: number
  startEpoch?: number
  size?: number
}

export async function uploadBlob(file: File, epochs: number = 5, senderAddress?: string): Promise<BlobUploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('epochs', epochs.toString())
  if (senderAddress) formData.append('senderAddress', senderAddress)

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
  contentHash: string
  patches: PatchRecord[]
  errors?: string[]
}

export async function uploadQuilt(files: File[], epochs: number = 5, senderAddress?: string): Promise<QuiltUploadResult> {
  const formData = new FormData()
  formData.append('epochs', epochs.toString())
  if (senderAddress) formData.append('senderAddress', senderAddress)
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

// Walrus cost model (derived from testnet observations):
// - Encoded size = ~64MB fixed metadata overhead + raw_size * ~5x erasure coding
// - Billable units = ceil(encoded_size / 1 MiB)
// - Total cost = units * (storage_price_per_unit * epochs + write_price_per_unit)
//
// Testnet pricing (epoch 335):
//   storage_price_per_unit = 1,000 MIST/unit/epoch
//   write_price_per_unit   = 2,000 MIST/unit (one-time)
const ENCODING_OVERHEAD_BYTES = 66_034_000
const ERASURE_CODING_FACTOR = 5
const STORAGE_PRICE_PER_UNIT = 1_000 // MIST per MiB-unit per epoch
const WRITE_PRICE_PER_UNIT = 2_000 // MIST per MiB-unit (one-time)
const UNIT_SIZE = 1_048_576 // 1 MiB
const MIST_PER_SUI = 1_000_000_000

export function estimateStorageCost(bytes: number, epochs: number): StorageEstimate {
  const encodedSize = ENCODING_OVERHEAD_BYTES + bytes * ERASURE_CODING_FACTOR
  const units = Math.ceil(encodedSize / UNIT_SIZE)
  const costMist = units * (STORAGE_PRICE_PER_UNIT * epochs + WRITE_PRICE_PER_UNIT)
  const estimatedCostSui = costMist / MIST_PER_SUI
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
