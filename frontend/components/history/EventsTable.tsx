'use client'

import { useState, useMemo } from 'react'
import type { GdeltEvent, Severity } from '@/types'

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'bg-red/20 text-red',
  high: 'bg-orange/20 text-orange',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-teal/20 text-teal',
}

type SortField = 'timestamp' | 'severity' | 'country' | 'title'
type SortDir = 'asc' | 'desc'

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const PAGE_SIZE = 10

interface EventsTableProps {
  events: GdeltEvent[]
  onViewOnMap: (event: GdeltEvent) => void
  onSubmitProof: (event: GdeltEvent) => void
}

export function EventsTable({ events, onViewOnMap, onSubmitProof }: EventsTableProps) {
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(0)
  }

  const sorted = useMemo(() => {
    const copy = [...events]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'timestamp':
          cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          break
        case 'severity':
          cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
          break
        case 'country':
          cmp = a.country.localeCompare(b.country)
          break
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [events, sortField, sortDir])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageEvents = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function SortHeader({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wider ${
          active ? 'text-teal' : 'text-text-muted hover:text-white'
        }`}
      >
        {label}
        {active && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    )
  }

  if (events.length === 0) {
    return (
      <p className="py-12 text-center text-text-muted">
        No events match your filters.
      </p>
    )
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-surface">
            <tr>
              <th className="px-4 py-3 text-left">
                <SortHeader field="title" label="Event" />
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="country" label="Country" />
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="severity" label="Severity" />
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="timestamp" label="Date" />
              </th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pageEvents.map((event) => (
              <tr key={event.id} className="hover:bg-white/5">
                <td className="max-w-xs truncate px-4 py-3">{event.title}</td>
                <td className="px-4 py-3 text-text-muted">{event.country}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[event.severity]}`}
                  >
                    {event.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {new Date(event.timestamp).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onViewOnMap(event)}
                      className="rounded px-2 py-1 text-xs text-teal hover:bg-teal/10"
                    >
                      View on Map
                    </button>
                    <button
                      onClick={() => onSubmitProof(event)}
                      className="rounded bg-teal/10 px-2 py-1 text-xs text-teal hover:bg-teal/20"
                    >
                      Submit Proof
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of{' '}
            {sorted.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded px-3 py-1 text-sm text-text-muted hover:text-white disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded px-3 py-1 text-sm text-text-muted hover:text-white disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
