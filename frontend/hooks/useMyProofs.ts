'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import type { WitnessProof } from '@/types'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''
const WALRUS_AGGREGATOR_URL =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
  'https://aggregator.walrus-testnet.walrus.space'

interface ProofSubmittedEvent {
  gdelt_event_id: string
  blob_id: string
  content_hash: string
  submitter: string
  relevance_score: number
  proof_type: string
  description: string
  timestamp: string
}

/** Fetch blob metadata (size, content-type) via HEAD request to Walrus aggregator */
async function fetchBlobMetadata(
  blobId: string,
): Promise<{ size?: number; mimeType?: string }> {
  try {
    const res = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`, {
      method: 'HEAD',
    })
    if (!res.ok) return {}
    const contentLength = res.headers.get('content-length')
    const contentType = res.headers.get('content-type') || undefined
    return {
      size: contentLength ? Number(contentLength) : undefined,
      mimeType: contentType,
    }
  } catch {
    return {}
  }
}

export function useMyProofs() {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()

  return useQuery({
    queryKey: ['my-proofs', account?.address],
    queryFn: async (): Promise<WitnessProof[]> => {
      if (!CONTRACT_ADDRESS || !account?.address) {
        return []
      }

      const eventType = `${CONTRACT_ADDRESS}::immutable_witness::ProofSubmitted`
      const allProofs: WitnessProof[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cursor: any = undefined
      let hasMore = true

      while (hasMore) {
        const { data, nextCursor, hasNextPage } = await suiClient.queryEvents({
          query: { MoveEventType: eventType },
          cursor,
          limit: 50,
        })

        for (const evt of data) {
          const parsed = evt.parsedJson as ProofSubmittedEvent
          if (parsed.submitter !== account.address) continue

          allProofs.push({
            blobId: parsed.blob_id,
            contentHash: parsed.content_hash,
            submitterAddress: parsed.submitter,
            eventId: parsed.gdelt_event_id,
            relevanceScore: parsed.relevance_score,
            proofType: parsed.proof_type as WitnessProof['proofType'],
            description: parsed.description,
            epoch: 0,
            timestamp: new Date(Number(parsed.timestamp)).toISOString(),
          })
        }

        cursor = nextCursor
        hasMore = hasNextPage
      }

      // Enrich proofs with real blob metadata from Walrus aggregator
      const enriched = await Promise.all(
        allProofs.map(async (proof) => {
          const meta = await fetchBlobMetadata(proof.blobId)
          return {
            ...proof,
            size: meta.size,
            mimeType: meta.mimeType,
          }
        }),
      )

      // Enrich proofs with endEpoch from Walrus blob status
      if (enriched.length > 0) {
        try {
          const blobIds = enriched.map((p) => p.blobId)
          const res = await fetch('/api/walrus/blob-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blobIds }),
          })
          if (res.ok) {
            const infos: { blobId: string; endEpoch: number | null }[] = await res.json()
            const endEpochMap = new Map(
              infos.filter((i) => i.endEpoch !== null).map((i) => [i.blobId, i.endEpoch!]),
            )
            for (const proof of enriched) {
              const endEpoch = endEpochMap.get(proof.blobId)
              if (endEpoch !== undefined) {
                proof.endEpoch = endEpoch
              }
            }
          }
        } catch {
          // Non-blocking — endEpoch enrichment failure doesn't break the page
        }
      }

      return enriched
    },
    enabled: !!account?.address,
    staleTime: 5 * 60 * 1000,
  })
}
