'use client'

import { useState, useCallback } from 'react'
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { uploadBlob, uploadQuilt, hashFile, hashBytes } from '@/lib/walrus'
import type { ProofType } from '@/types'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''
const REGISTRY_OBJECT_ID = process.env.NEXT_PUBLIC_REGISTRY_OBJECT_ID || ''

export interface SubmitProofResult {
  blobId: string
  contentHash: string
  txDigest: string
}

type Phase = 'hashing' | 'uploading' | 'signing' | 'confirming' | 'done'

interface UseSubmitProofOptions {
  onPhase?: (phase: Phase) => void
}

export function useSubmitProof({ onPhase }: UseSubmitProofOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const suiClient = useSuiClient()
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction()

  const submit = useCallback(
    async (params: {
      files: File[]
      description: string
      url: string
      proofType: ProofType
      eventId: string
      relevanceScore: number
      epochs: number
    }): Promise<SubmitProofResult> => {
      setIsLoading(true)
      setError(null)

      try {
        // Phase 1: Hash content
        onPhase?.('hashing')
        let contentHash: string
        if (params.files.length > 0) {
          contentHash = await hashFile(params.files[0])
        } else {
          contentHash = await hashBytes(new TextEncoder().encode(params.description))
        }

        // Phase 2: Upload to Walrus
        onPhase?.('uploading')
        let blobId: string

        if (params.files.length > 1) {
          const quiltResult = await uploadQuilt(params.files, params.epochs)
          blobId = quiltResult.quiltId
        } else if (params.files.length === 1) {
          const result = await uploadBlob(params.files[0], params.epochs)
          blobId = result.blobId
        } else {
          const blob = new Blob([params.description], { type: 'text/plain' })
          const file = new File([blob], 'testimony.txt', { type: 'text/plain' })
          const result = await uploadBlob(file, params.epochs)
          blobId = result.blobId
        }

        // Phase 3: Sign on-chain proof registration
        onPhase?.('signing')
        let txDigest = ''

        if (CONTRACT_ADDRESS && REGISTRY_OBJECT_ID) {
          // Build the transaction to register proof on-chain
          const tx = new Transaction()
          tx.moveCall({
            target: `${CONTRACT_ADDRESS}::immutable_witness::submit_proof`,
            arguments: [
              tx.object(REGISTRY_OBJECT_ID),
              tx.pure.string(params.eventId),
              tx.pure.string(blobId),
              tx.pure.string(contentHash),
              tx.pure.u8(Math.min(params.relevanceScore, 100)),
              tx.pure.string(params.proofType),
              tx.pure.string(params.description.slice(0, 256)),
              tx.pure.string(params.url || ''),
              tx.pure.u64(Date.now()),
            ],
          })

          const result = await signAndExecute({ transaction: tx })
          txDigest = 'digest' in result ? result.digest : ''

          // Phase 4: Wait for confirmation
          onPhase?.('confirming')
          if (txDigest) {
            await suiClient.waitForTransaction({ digest: txDigest })
          }
        } else {
          // Contract not deployed — skip on-chain registration
          txDigest = `walrus_${blobId.slice(0, 16)}`
          onPhase?.('confirming')
        }

        onPhase?.('done')
        return { blobId, contentHash, txDigest }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Proof submission failed'
        setError(msg)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [onPhase, signAndExecute, suiClient],
  )

  return { submit, isLoading, error }
}
