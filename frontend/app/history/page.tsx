'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEvents } from '@/hooks/useEvents'
import { PageShell } from '@/components/layout/PageShell'
import { HistoryFilters } from '@/components/history/HistoryFilters'
import { EventsTable } from '@/components/history/EventsTable'
import { ProofSubmissionModal } from '@/components/proof/ProofSubmissionModal'
import { Spinner } from '@/components/ui/Spinner'
import type { GdeltEvent, Severity } from '@/types'

export default function HistoryPage() {
  const router = useRouter()
  const { allEvents, isLoading, isError } = useEvents()
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('')
  const [severity, setSeverity] = useState<Severity | ''>('')
  const [proofEvent, setProofEvent] = useState<GdeltEvent | null>(null)

  const availableCountries = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.country))).sort(),
    [allEvents],
  )

  const filtered = useMemo(() => {
    return allEvents.filter((event) => {
      if (search && !event.title.toLowerCase().includes(search.toLowerCase())) return false
      if (country && event.country !== country) return false
      if (severity && event.severity !== severity) return false
      return true
    })
  }, [allEvents, search, country, severity])

  function handleViewOnMap(event: GdeltEvent) {
    router.push(`/?event=${event.id}`)
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
          <p className="text-red-400">Failed to load events.</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Historic Events</h1>
          <p className="mt-1 text-sm text-text-muted">
            Browse and search past conflict events. Submit evidence to strengthen the record.
          </p>
        </div>

        <HistoryFilters
          search={search}
          onSearchChange={setSearch}
          country={country}
          onCountryChange={setCountry}
          severity={severity}
          onSeverityChange={setSeverity}
          availableCountries={availableCountries}
        />

        <EventsTable
          events={filtered}
          onViewOnMap={handleViewOnMap}
          onSubmitProof={setProofEvent}
        />
      </div>

      {proofEvent && (
        <ProofSubmissionModal
          event={proofEvent}
          isOpen={!!proofEvent}
          onClose={() => setProofEvent(null)}
        />
      )}
    </PageShell>
  )
}
