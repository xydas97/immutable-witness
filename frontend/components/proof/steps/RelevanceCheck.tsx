'use client'

import { useState } from 'react'
import type { GdeltEvent, RelevanceResult } from '@/types'
import { Spinner } from '@/components/ui/Spinner'

interface RelevanceCheckProps {
  event: GdeltEvent
  description: string
  url: string
  result: RelevanceResult | null
  onResult: (result: RelevanceResult) => void
}

export function RelevanceCheck({
  event,
  description,
  url,
  result,
  onResult,
}: RelevanceCheckProps) {
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runCheck() {
    setChecking(true)
    setError(null)
    try {
      const res = await fetch('/api/relevance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: event.title,
          eventDescription: event.eventDescription,
          eventLocation: event.actionGeo,
          proofDescription: description,
          proofUrl: url,
        }),
      })

      if (!res.ok) {
        // Fallback to mock if API not available
        onResult({ score: 72, reason: 'Mock: relevance API not yet deployed' })
        return
      }

      const data = (await res.json()) as RelevanceResult
      onResult(data)
    } catch {
      // Mock fallback for development
      onResult({
        score: 72,
        reason: 'Mock: relevance check (API route not yet available)',
      })
    } finally {
      setChecking(false)
    }
  }

  const scoreColor =
    result && result.score >= 70
      ? 'text-teal'
      : result && result.score >= 40
        ? 'text-orange'
        : 'text-red'

  const statusLabel =
    result && result.score >= 75
      ? 'accepted'
      : result && result.score >= 40
        ? 'review'
        : 'low'

  const statusBadge =
    statusLabel === 'accepted'
      ? 'bg-teal/20 text-teal'
      : statusLabel === 'low'
        ? 'bg-red/20 text-red'
        : 'bg-orange/20 text-orange'

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Relevance Check</h3>
      <p className="text-sm text-text-muted">
        AI-powered analysis to verify this evidence is relevant to the selected event.
      </p>

      {!result && (
        <button
          onClick={runCheck}
          disabled={checking}
          className="flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal/80 disabled:opacity-50"
        >
          {checking ? (
            <>
              <Spinner size="sm" /> Analyzing…
            </>
          ) : (
            'Run Relevance Check'
          )}
        </button>
      )}

      {error && <p className="text-sm text-red">{error}</p>}

      {result && (
        <div className="rounded-lg border border-white/10 bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Relevance Score</p>
              <p className={`text-3xl font-bold ${scoreColor}`}>{result.score}/100</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge}`}>
              {statusLabel}
            </span>
          </div>

          {/* Score bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${result.score}%`,
                backgroundColor:
                  result.score >= 70 ? '#00C896' : result.score >= 40 ? '#E67E22' : '#C0392B',
              }}
            />
          </div>

          <p className="mt-3 text-sm text-text-muted">{result.reason}</p>

          {result.score < 40 && (
            <p className="mt-2 text-xs text-red">
              Score too low. This evidence may not be accepted on-chain.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
