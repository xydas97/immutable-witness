'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { GdeltEvent, EventFilter } from '@/types'
import { MOCK_EVENTS } from '@/lib/mockData'

// TODO: Replace with real GDELT/NewsAPI service when E1 delivers (INT-01)
async function fetchEvents(): Promise<GdeltEvent[]> {
  // Simulate network delay for realistic UX during development
  await new Promise((resolve) => setTimeout(resolve, 800))
  return MOCK_EVENTS
}

function applyFilters(events: GdeltEvent[], filter: Partial<EventFilter>): GdeltEvent[] {
  return events.filter((event) => {
    if (filter.countries?.length && !filter.countries.includes(event.country)) {
      return false
    }
    if (filter.eventCodes?.length && !filter.eventCodes.includes(event.eventCode)) {
      return false
    }
    if (filter.timeRange) {
      const eventDate = new Date(event.timestamp)
      if (eventDate < filter.timeRange.from || eventDate > filter.timeRange.to) {
        return false
      }
    }
    return true
  })
}

export function useEvents(filter?: Partial<EventFilter>) {
  const query = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 15 * 60 * 1000, // 15-minute stale time per spec
    refetchOnWindowFocus: false,
  })

  const filteredEvents = useMemo(() => {
    if (!query.data) return []
    if (!filter) return query.data
    return applyFilters(query.data, filter)
  }, [query.data, filter])

  return {
    events: filteredEvents,
    allEvents: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  }
}
