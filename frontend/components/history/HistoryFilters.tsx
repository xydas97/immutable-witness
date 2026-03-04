'use client'

import type { Severity } from '@/types'

interface HistoryFiltersProps {
  search: string
  onSearchChange: (s: string) => void
  country: string
  onCountryChange: (c: string) => void
  severity: Severity | ''
  onSeverityChange: (s: Severity | '') => void
  availableCountries: string[]
}

export function HistoryFilters({
  search,
  onSearchChange,
  country,
  onCountryChange,
  severity,
  onSeverityChange,
  availableCountries,
}: HistoryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search events…"
        className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-teal focus:outline-none"
      />

      {/* Country select */}
      <select
        value={country}
        onChange={(e) => onCountryChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white focus:border-teal focus:outline-none"
      >
        <option value="">All countries</option>
        {availableCountries.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Severity select */}
      <select
        value={severity}
        onChange={(e) => onSeverityChange(e.target.value as Severity | '')}
        className="rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white focus:border-teal focus:outline-none"
      >
        <option value="">All severities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>
  )
}
