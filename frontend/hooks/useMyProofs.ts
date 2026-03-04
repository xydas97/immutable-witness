'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import type { WitnessProof } from '@/types'
import { MOCK_PROOFS } from '@/lib/mockData'

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

export function useMyProofs() {
  const account = useCurrentAccount()
  const suiClient = useSuiClient()

  return useQuery({
    queryKey: ['my-proofs', account?.address],
    queryFn: async (): Promise<WitnessProof[]> => {
      if (!CONTRACT_ADDRESS || !account?.address) {
        // Contract not deployed — return mock data
        return MOCK_PROOFS.map((p) => ({ ...p, submitterAddress: account?.address ?? p.submitterAddress }))
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

      // If no on-chain proofs found, return mock data for demo purposes
      if (allProofs.length === 0) {
        return MOCK_PROOFS.map((p) => ({ ...p, submitterAddress: account.address }))
      }

      return allProofs
    },
    enabled: !!account?.address,
    staleTime: 5 * 60 * 1000,
  })
}
