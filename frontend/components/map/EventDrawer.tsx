'use client'

import { useState } from 'react'
import type { GdeltEvent, WitnessProof } from '@/types'
import { useProofsForEvent } from '@/hooks/useProofsForEvent'
import { ProofList } from './ProofList'
import { ProofViewerModal } from '@/components/proofs/ProofViewerModal'
import { Spinner } from '@/components/ui/Spinner'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#C0392B',
  high: '#E67E22',
  medium: '#F1C40F',
  low: '#00C896',
}

interface EventDrawerProps {
  event: GdeltEvent | null
  onClose: () => void
  onSubmitProof: (event: GdeltEvent) => void
}

export function EventDrawer({ event, onClose, onSubmitProof }: EventDrawerProps) {
  const { data: proofs, isLoading } = useProofsForEvent(event?.id ?? null)
  const [viewProof, setViewProof] = useState<WitnessProof | null>(null)

  return (
    <>
      {/* Backdrop */}
      {event && (
        <div
          className="fixed inset-0 z-[1001] bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-[1002] h-full w-96 max-w-[90vw] transform bg-surface shadow-2xl transition-transform duration-300 ${
          event ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {event && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-white/10 p-4">
              <div className="flex items-start justify-between">
                <h2 className="pr-4 text-lg font-semibold leading-tight">{event.title}</h2>
                <button
                  onClick={onClose}
                  className="shrink-0 text-text-muted hover:text-white"
                  aria-label="Close drawer"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                <span>{event.actionGeo}</span>
                <span>·</span>
                <span>{event.country}</span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <span
                  className="rounded px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: SEVERITY_COLORS[event.severity] }}
                >
                  {event.severity}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(event.timestamp).toLocaleDateString()}
                </span>
                <span className="text-xs text-text-muted">
                  Code: {event.eventCode}
                </span>
              </div>

              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-teal hover:underline"
                >
                  View source article →
                </a>
              )}
            </div>

            {/* Proof section */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Evidence ({proofs?.length ?? 0})
                </h3>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : (
                <ProofList proofs={proofs ?? []} onView={setViewProof} />
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 p-4">
              <button
                onClick={() => onSubmitProof(event)}
                className="w-full rounded-lg bg-teal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal/80"
              >
                Submit Proof
              </button>
            </div>
          </div>
        )}
      </div>

      <ProofViewerModal
        proof={viewProof}
        isOpen={!!viewProof}
        onClose={() => setViewProof(null)}
      />
    </>
  )
}
