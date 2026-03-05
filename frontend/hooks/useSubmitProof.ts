'use client'

import { useState, useCallback } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit'
import { Transaction } from '@mysten/sui/transactions'
import { WalrusClient } from '@mysten/walrus'
import { uploadQuilt } from '@/lib/walrus'
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
  const account = useCurrentAccount()
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
        if (!account?.address) {
          throw new Error('Wallet not connected')
        }

        let blobId: string
        let contentHash: string

        if (params.files.length > 1) {
          // Multi-file quilt — upload via server HTTP publisher
          onPhase?.('uploading')
          const quiltResult = await uploadQuilt(params.files, params.epochs, account.address)
          blobId = quiltResult.quiltId
          contentHash = quiltResult.contentHash
        } else {
          // Single file or text-only — use Walrus SDK writeBlobFlow
          // This registers epochs on-chain directly, guaranteeing correct storage duration
          let fileBytes: Uint8Array

          if (params.files.length === 1) {
            fileBytes = new Uint8Array(await params.files[0].arrayBuffer())
          } else {
            fileBytes = new TextEncoder().encode(params.description)
          }

          // Hash the exact bytes we upload
          onPhase?.('hashing')
          const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(fileBytes))
          const hashArray = Array.from(new Uint8Array(hashBuffer))
          contentHash = 'sha256:' + hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

          // Upload via Walrus SDK (encode → register → upload → certify)
          onPhase?.('uploading')
          const walrusClient = new WalrusClient({ network: 'testnet', suiClient })
          const flow = walrusClient.writeBlobFlow({ blob: fileBytes })
          await flow.encode()

          // Register blob on-chain with correct epochs (wallet signature 1 of 3)
          const registerTx = flow.register({
            deletable: true,
            epochs: params.epochs,
            owner: account.address,
          })
          const registerResult = await signAndExecute({ transaction: registerTx })
          const registerDigest = 'digest' in registerResult ? registerResult.digest : ''

          // Upload encoded data to Walrus storage nodes
          await flow.upload({ digest: registerDigest })

          // Certify blob availability on-chain (wallet signature 2 of 3)
          const certifyTx = flow.certify()
          const certifyResult = await signAndExecute({ transaction: certifyTx })
          const certifyDigest = 'digest' in certifyResult ? certifyResult.digest : ''

          if (certifyDigest) {
            await suiClient.waitForTransaction({ digest: certifyDigest })
          }

          const blobResult = await flow.getBlob()
          blobId = blobResult.blobId
        }

        // Register proof on-chain (wallet signature 3 of 3)
        onPhase?.('signing')
        let txDigest = ''

        if (CONTRACT_ADDRESS && REGISTRY_OBJECT_ID) {
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

          onPhase?.('confirming')
          if (txDigest) {
            await suiClient.waitForTransaction({ digest: txDigest })
          }
        } else {
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
    [onPhase, signAndExecute, suiClient, account],
  )

  return { submit, isLoading, error }
}
