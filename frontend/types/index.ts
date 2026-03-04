// ============================================================
// Immutable Witness — Shared Types (source of truth)
// Import from '@/types' everywhere. Never redefine locally.
// ============================================================

// --- GDELT / Event types ---

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface GdeltEvent {
  id: string
  title: string
  eventCode: string
  eventDescription: string
  lat: number
  lng: number
  country: string
  timestamp: string
  severity: Severity
  sourceUrl: string
  actionGeo: string
}

// --- Proof types ---

export type ProofType = 'file' | 'url' | 'testimony'

export type ProofStatus = 'verified' | 'unconfirmed' | 'blocked'

export interface WitnessProof {
  blobId: string
  contentHash: string
  submitterAddress: string
  eventId: string
  relevanceScore: number
  proofType: ProofType
  description: string
  sourceUrl?: string
  epoch: number
  timestamp: string
  status: ProofStatus
}

export interface PatchRecord {
  patchId: string
  blobId: string
  filename: string
  mimeType: string
  size: number
}

export interface QuiltProof extends WitnessProof {
  quiltId: string
  patches: PatchRecord[]
}

// --- Filter types ---

export interface EventFilter {
  countries: string[]
  eventCodes: string[]
  timeRange: {
    from: Date
    to: Date
  }
  verifiedOnly: boolean
}

// --- AI Relevance ---

export interface RelevanceResult {
  score: number
  reason: string
  status: ProofStatus
}

// --- Storage ---

export interface StorageEstimate {
  bytes: number
  estimatedCostSui: number
}

// --- On-chain record types (mirroring Move structs) ---

export interface IncidentRecord {
  id: string
  eventId: string
  title: string
  location: string
  lat: number
  lng: number
  timestamp: number
  category: string
  severity: number
  sourceUrl: string
  proofCount: number
}

// --- Error types ---

export class WalrusUploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WalrusUploadError'
  }
}

export class WalrusBlobNotFoundError extends Error {
  constructor(blobId: string) {
    super(`Blob not found: ${blobId}`)
    this.name = 'WalrusBlobNotFoundError'
  }
}

export class WalrusNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WalrusNetworkError'
  }
}

export class SuiTransactionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SuiTransactionError'
  }
}

export class SuiObjectNotFoundError extends Error {
  constructor(objectId: string) {
    super(`Sui object not found: ${objectId}`)
    this.name = 'SuiObjectNotFoundError'
  }
}
