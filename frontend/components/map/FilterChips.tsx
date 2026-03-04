'use client'

import type { EventFilter } from '@/types'

interface FilterChipsProps {
  filter: Partial<EventFilter>
  onFilterChange: (filter: Partial<EventFilter>) => void
}

export function FilterChips({ filter, onFilterChange }: FilterChipsProps) {
  const chips: { key: string; label: string; onRemove: () => void }[] = []

  for (const country of filter.countries ?? []) {
    chips.push({
      key: `country-${country}`,
      label: country,
      onRemove: () =>
        onFilterChange({
          ...filter,
          countries: filter.countries?.filter((c) => c !== country),
        }),
    })
  }

  for (const code of filter.eventCodes ?? []) {
    chips.push({
      key: `code-${code}`,
      label: code,
      onRemove: () =>
        onFilterChange({
          ...filter,
          eventCodes: filter.eventCodes?.filter((c) => c !== code),
        }),
    })
  }

  if (filter.verifiedOnly) {
    chips.push({
      key: 'verified',
      label: 'Verified only',
      onRemove: () => onFilterChange({ ...filter, verifiedOnly: false }),
    })
  }

  if (chips.length === 0) return null

  function clearAll() {
    onFilterChange({})
  }

  return (
    <div className="absolute right-4 top-4 z-[1000] flex max-w-md flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="flex items-center gap-1 rounded-full bg-surface/90 px-3 py-1 text-xs backdrop-blur-sm"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="ml-0.5 text-text-muted hover:text-white"
            aria-label={`Remove ${chip.label} filter`}
          >
            ×
          </button>
        </span>
      ))}
      <button
        onClick={clearAll}
        className="rounded-full bg-red/20 px-3 py-1 text-xs text-red hover:bg-red/30"
      >
        Clear all
      </button>
    </div>
  )
}
