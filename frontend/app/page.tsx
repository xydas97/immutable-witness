'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import { useEvents } from '@/hooks/useEvents'
import { PageShell } from '@/components/layout/PageShell'
import { FilterPanel } from '@/components/map/FilterPanel'
import { FilterChips } from '@/components/map/FilterChips'
import { EventDrawer } from '@/components/map/EventDrawer'
import { ProofSubmissionModal } from '@/components/proof/ProofSubmissionModal'
import { Spinner } from '@/components/ui/Spinner'
import type { EventFilter, GdeltEvent } from '@/types'

const EventMap = dynamic(() => import('@/components/map/EventMap').then((m) => m.EventMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <Spinner size="lg" />
    </div>
  ),
})

export default function MapPage() {
  const [filter, setFilter] = useState<Partial<EventFilter>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const { events, allEvents, isLoading, isError, isRefreshing, forceRefresh } = useEvents(filter)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await forceRefresh()
    } finally {
      setRefreshing(false)
    }
  }, [forceRefresh])
  const [selectedEvent, setSelectedEvent] = useState<GdeltEvent | null>(null)
  const [proofEvent, setProofEvent] = useState<GdeltEvent | null>(null)

  const availableCountries = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.country))).sort(),
    [allEvents],
  )

  const availableEventCodes = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.eventDescription))).sort(),
    [allEvents],
  )

  function handleEventClick(event: GdeltEvent) {
    setSelectedEvent(event)
  }

  function handleSubmitProof(event: GdeltEvent) {
    setProofEvent(event)
  }

  if (isError) {
    return (
      <PageShell>
        <div className="flex h-[80vh] items-center justify-center">
          <p className="text-red-400">Failed to load events. Please try again.</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell fullWidth>
      <div className="relative h-[calc(100vh-64px)]">
        {/* Event count badge + refresh */}
        <div className="absolute left-4 top-4 z-[1000] flex items-center gap-2">
          <div className="rounded-lg bg-surface/90 px-3 py-1.5 text-sm backdrop-blur-sm">
            <span className="font-semibold text-teal">{events.length}</span>
            <span className="ml-1 text-text-muted">
              {isLoading ? 'loading…' : events.length === 1 ? 'event' : 'events'}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || isRefreshing}
            className="rounded-lg bg-surface/90 px-3 py-1.5 text-sm text-text-muted backdrop-blur-sm transition-colors hover:text-teal disabled:opacity-50"
            title="Refresh events"
          >
            <svg
              className={`h-4 w-4 ${refreshing || isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <FilterPanel
          filter={filter}
          onFilterChange={setFilter}
          availableCountries={availableCountries}
          availableEventCodes={availableEventCodes}
          isOpen={filterOpen}
          onToggle={() => setFilterOpen((o) => !o)}
        />

        <FilterChips filter={filter} onFilterChange={setFilter} />

        <EventMap events={events} onEventClick={handleEventClick} />

        <EventDrawer
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSubmitProof={handleSubmitProof}
        />

        {proofEvent && (
          <ProofSubmissionModal
            event={proofEvent}
            isOpen={!!proofEvent}
            onClose={() => setProofEvent(null)}
          />
        )}
      </div>
    </PageShell>
  )
}


