'use client'

import { useQuery } from '@tanstack/react-query'

export interface WalrusEpochInfo {
  currentEpoch: number
  maxEpochsAhead: number
  storagePricePerUnit: number
  writePricePerUnit: number
}

export function useWalrusEpoch() {
  return useQuery({
    queryKey: ['walrus-epoch'],
    queryFn: async (): Promise<WalrusEpochInfo> => {
      const res = await fetch('/api/walrus/epoch')
      if (!res.ok) {
        throw new Error('Failed to fetch Walrus epoch info')
      }
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — epoch changes once per day on testnet
    retry: 2,
  })
}
