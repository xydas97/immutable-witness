'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { GdeltEvent, EventFilter } from '@/types'

async function fetchEvents(): Promise<GdeltEvent[]> {
  const res = await fetch('/api/events')
  if (!res.ok) throw new Error(`Events API returned ${res.status}`)
  return res.json()
}

async function fetchEventsFresh(): Promise<GdeltEvent[]> {
  const res = await fetch('/api/events?force=true')
  if (!res.ok) throw new Error(`Events API returned ${res.status}`)
  return res.json()
}

function applyFilters(events: GdeltEvent[], filter: Partial<EventFilter>): GdeltEvent[] {
  return events.filter((event) => {
    if (filter.countries?.length && !filter.countries.includes(event.country)) {
      return false
    }
    if (
      filter.eventCodes?.length &&
      !filter.eventCodes.includes(event.eventCode) &&
      !filter.eventCodes.includes(event.eventDescription)
    ) {
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
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const forceRefresh = useCallback(async () => {
    const freshData = await fetchEventsFresh()
    queryClient.setQueryData(['events'], freshData)
  }, [queryClient])

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
    isRefreshing: query.isFetching,
    refetch: query.refetch,
    forceRefresh,
  }
}
