'use client'

import { useState, useCallback } from 'react'
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''
const REGISTRY_OBJECT_ID = process.env.NEXT_PUBLIC_REGISTRY_OBJECT_ID || ''

export function useRemoveProof() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const remove = useCallback(
    async (params: {
      eventId: string
      submitterAddress: string
      blobId: string
    }): Promise<string> => {
      setIsLoading(true)
      setError(null)

      try {
        if (!CONTRACT_ADDRESS || !REGISTRY_OBJECT_ID) {
          throw new Error('Contract not deployed')
        }

        const tx = new Transaction()
        tx.moveCall({
          target: `${CONTRACT_ADDRESS}::immutable_witness::remove_proof`,
          arguments: [
            tx.object(REGISTRY_OBJECT_ID),
            tx.pure.string(params.eventId),
            tx.pure.address(params.submitterAddress),
            tx.pure.string(params.blobId),
          ],
        })

        const result = await signAndExecute({ transaction: tx })
        const digest = 'digest' in result ? result.digest : ''

        if (digest) {
          await suiClient.waitForTransaction({ digest })
        }

        return digest
      } catch (err: unknown) {
        let msg = err instanceof Error ? err.message : 'Proof removal failed'
        // Translate on-chain error codes to user-friendly messages
        if (msg.includes('MoveAbort') && msg.includes(', 3)')) {
          msg = 'Your wallet is not a moderator or admin. Ask the contract admin to call add_moderator with your address.'
        } else if (msg.includes('MoveAbort') && msg.includes(', 5)')) {
          msg = 'Score too high — only proofs with relevance score < 75 can be deleted.'
        } else if (msg.includes('MoveAbort') && msg.includes(', 6)')) {
          msg = 'Proof not found on-chain.'
        } else if (msg.includes('MoveAbort') && msg.includes(', 8)')) {
          msg = 'Event not found on-chain.'
        }
        setError(msg)
        throw new Error(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [signAndExecute, suiClient],
  )

  return { remove, isLoading, error }
}
