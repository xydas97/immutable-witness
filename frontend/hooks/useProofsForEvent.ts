'use client'

import { useQuery } from '@tanstack/react-query'
import { useSuiClient } from '@mysten/dapp-kit'
import type { WitnessProof } from '@/types'
import { getMockProofsForEvent } from '@/lib/mockData'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''

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

export function useProofsForEvent(eventId: string | null) {
  const suiClient = useSuiClient()

  return useQuery({
    queryKey: ['proofs', eventId],
    queryFn: async (): Promise<WitnessProof[]> => {
      if (!CONTRACT_ADDRESS || !eventId) {
        return getMockProofsForEvent(eventId ?? '')
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
          if (parsed.gdelt_event_id !== eventId) continue

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

      // Fall back to mock if no on-chain proofs found
      if (allProofs.length === 0) {
        return getMockProofsForEvent(eventId)
      }

      return allProofs
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  })
}
