'use client'

import { useQuery } from '@tanstack/react-query'
import type { WitnessProof } from '@/types'
import { getMockProofsForEvent } from '@/lib/mockData'

// TODO: Replace with real on-chain proof query when E1 delivers (INT-02)
async function fetchProofsForEvent(eventId: string): Promise<WitnessProof[]> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return getMockProofsForEvent(eventId)
}

export function useProofsForEvent(eventId: string | null) {
  return useQuery({
    queryKey: ['proofs', eventId],
    queryFn: () => fetchProofsForEvent(eventId!),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  })
}
