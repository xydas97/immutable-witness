'use client'

import { useQuery } from '@tanstack/react-query'
import { useCurrentAccount } from '@mysten/dapp-kit'
import type { WitnessProof } from '@/types'
import { MOCK_PROOFS } from '@/lib/mockData'

// TODO: Replace with real on-chain query when E1 delivers (INT-02)
async function fetchMyProofs(address: string): Promise<WitnessProof[]> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  // In production, filter by submitterAddress on-chain
  // For now, return all mock proofs as if they belong to the connected wallet
  return MOCK_PROOFS.map((p) => ({ ...p, submitterAddress: address }))
}

export function useMyProofs() {
  const account = useCurrentAccount()

  return useQuery({
    queryKey: ['my-proofs', account?.address],
    queryFn: () => fetchMyProofs(account!.address),
    enabled: !!account?.address,
    staleTime: 5 * 60 * 1000,
  })
}
