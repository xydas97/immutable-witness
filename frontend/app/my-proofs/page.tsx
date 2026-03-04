'use client'

import { useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useMyProofs } from '@/hooks/useMyProofs'
import { PageShell } from '@/components/layout/PageShell'
import { StatsBar } from '@/components/proofs/StatsBar'
import { ProofTable } from '@/components/proofs/ProofTable'
import { EpochExtensionModal } from '@/components/proofs/EpochExtensionModal'
import { Spinner } from '@/components/ui/Spinner'
import type { WitnessProof } from '@/types'

export default function MyProofsPage() {
  const account = useCurrentAccount()
  const { data: proofs, isLoading, isError } = useMyProofs()
  const [extendProof, setExtendProof] = useState<WitnessProof | null>(null)

  if (!account) {
    return (
      <PageShell>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">My Proofs</h1>
          <p className="text-text-muted">Connect your wallet to view your submitted evidence.</p>
        </div>
      </PageShell>
    )
  }

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex h-[60vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      </PageShell>
    )
  }

  if (isError) {
    return (
      <PageShell>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-red-400">Failed to load proofs.</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Proofs</h1>
          <p className="mt-1 text-sm text-text-muted">
            Manage your submitted evidence. Verify integrity, extend storage, or view archived
            content.
          </p>
        </div>

        <StatsBar proofs={proofs ?? []} />

        <ProofTable proofs={proofs ?? []} onExtend={setExtendProof} />
      </div>

      {extendProof && (
        <EpochExtensionModal
          proof={extendProof}
          isOpen={!!extendProof}
          onClose={() => setExtendProof(null)}
        />
      )}
    </PageShell>
  )
}
