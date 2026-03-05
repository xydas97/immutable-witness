'use client'

import { useState, useCallback } from 'react'

export function useRemoveProof() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = useCallback(
    async (params: { blobId: string }): Promise<void> => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/walrus/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blobId: params.blobId }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Delete failed: ${res.status}`)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Blob deletion failed'
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { remove, isLoading, error }
}
