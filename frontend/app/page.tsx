'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { useEvents } from '@/hooks/useEvents'
import { PageShell } from '@/components/layout/PageShell'
import { FilterPanel } from '@/components/map/FilterPanel'
import { FilterChips } from '@/components/map/FilterChips'
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
  const { events, allEvents, isLoading, isError } = useEvents(filter)
  const [selectedEvent, setSelectedEvent] = useState<GdeltEvent | null>(null)

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
    // TODO: Open EventDrawer (E2-05)
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
        {/* Event count badge */}
        <div className="absolute left-4 top-4 z-[1000] rounded-lg bg-surface/90 px-3 py-1.5 text-sm backdrop-blur-sm">
          <span className="font-semibold text-teal">{events.length}</span>
          <span className="ml-1 text-text-muted">
            {isLoading ? 'loading…' : events.length === 1 ? 'event' : 'events'}
          </span>
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
      </div>
    </PageShell>
  )
}
