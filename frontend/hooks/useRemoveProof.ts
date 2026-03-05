'use client'

import { useState, useCallback } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'

export function useRemoveProof() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const suiClient = useSuiClient()
  const account = useCurrentAccount()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const remove = useCallback(
    async (params: { blobId: string }): Promise<string> => {
      setIsLoading(true)
      setError(null)

      try {
        if (!account?.address) {
          throw new Error('Wallet not connected')
        }

        // Step 1: Find the blob's Sui object ID via server
        const res = await fetch('/api/walrus/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blobId: params.blobId }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Failed to find blob: ${res.status}`)
        }

        const { blobObjectId } = await res.json()

        // Step 2: Build delete transaction using Walrus SDK
        const { WalrusClient } = await import('@mysten/walrus')
        const walrusClient = new WalrusClient({ network: 'testnet', suiClient })
        const tx = walrusClient.deleteBlobTransaction({
          blobObjectId,
          owner: account.address,
        })

        // Step 3: Sign and execute
        const result = await signAndExecute({ transaction: tx })
        const digest = 'digest' in result ? result.digest : ''

        if (digest) {
          await suiClient.waitForTransaction({ digest })
        }

        return digest
      } catch (err: unknown) {
        let msg = err instanceof Error ? err.message : 'Blob deletion failed'
        if (msg.includes('invalid') && msg.includes('deleted')) {
          msg = 'This blob has already been deleted.'
        } else if (msg.includes('ObjectNotFound') || msg.includes('not found')) {
          msg = 'Blob object not found — it may have already been deleted or expired.'
        } else if (msg.includes('IncorrectSigner') || msg.includes('AddressOwnershipMismatch')) {
          msg = 'You do not own this blob. Only blobs uploaded after this update can be deleted.'
        }
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [account, signAndExecute, suiClient],
  )

  return { remove, isLoading, error }
}
