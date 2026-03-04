'use client'

import { useState } from 'react'
import type { EventFilter, Severity } from '@/types'

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#C0392B' },
  { value: 'high', label: 'High', color: '#E67E22' },
  { value: 'medium', label: 'Medium', color: '#F1C40F' },
  { value: 'low', label: 'Low', color: '#00C896' },
]

interface FilterPanelProps {
  filter: Partial<EventFilter>
  onFilterChange: (filter: Partial<EventFilter>) => void
  availableCountries: string[]
  availableEventCodes: string[]
  isOpen: boolean
  onToggle: () => void
}

export function FilterPanel({
  filter,
  onFilterChange,
  availableCountries,
  availableEventCodes,
  isOpen,
  onToggle,
}: FilterPanelProps) {
  const [countrySearch, setCountrySearch] = useState('')
  const [codeSearch, setCodeSearch] = useState('')

  const filteredCountries = availableCountries.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase()),
  )
  const filteredCodes = availableEventCodes.filter((c) =>
    c.toLowerCase().includes(codeSearch.toLowerCase()),
  )

  function toggleCountry(country: string) {
    const current = filter.countries ?? []
    const next = current.includes(country)
      ? current.filter((c) => c !== country)
      : [...current, country]
    onFilterChange({ ...filter, countries: next })
  }

  function toggleEventCode(code: string) {
    const current = filter.eventCodes ?? []
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    onFilterChange({ ...filter, eventCodes: next })
  }

  function toggleVerifiedOnly() {
    onFilterChange({ ...filter, verifiedOnly: !filter.verifiedOnly })
  }

  return (
    <>
      {/* Toggle button — always visible */}
      <button
        onClick={onToggle}
        className="absolute left-4 top-16 z-[1000] rounded-lg bg-surface/90 p-2 text-text-muted backdrop-blur-sm transition-colors hover:text-white"
        title={isOpen ? 'Hide filters' : 'Show filters'}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M3 5h14M5 10h10M7 15h6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Collapsible panel */}
      <div
        className={`absolute left-0 top-0 z-[999] h-full w-72 transform bg-surface/95 backdrop-blur-sm transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col overflow-y-auto p-4 pt-14">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">
            Filters
          </h3>

          {/* Verified only toggle */}
          <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filter.verifiedOnly ?? false}
              onChange={toggleVerifiedOnly}
              className="h-4 w-4 rounded border-white/10 bg-background accent-teal"
            />
            <span>Verified only</span>
          </label>

          {/* Severity filter */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Severity
            </p>
            <div className="flex flex-wrap gap-2">
              {SEVERITY_OPTIONS.map((sev) => {
                const active = (filter as Record<string, unknown>).severities
                  ? ((filter as Record<string, unknown>).severities as string[]).includes(sev.value)
                  : true
                return (
                  <button
                    key={sev.value}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity ${
                      active ? 'opacity-100' : 'opacity-40'
                    }`}
                    style={{ backgroundColor: sev.color, color: '#fff' }}
                    onClick={() => {
                      // Severity filtering not in EventFilter type yet — visual only for now
                    }}
                  >
                    {sev.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Country filter */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Country
            </p>
            <input
              type="text"
              placeholder="Search countries…"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              className="mb-2 w-full rounded-md border border-white/10 bg-background px-3 py-1.5 text-sm text-white placeholder:text-text-muted focus:border-teal focus:outline-none"
            />
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {filteredCountries.map((country) => (
                <label key={country} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filter.countries?.includes(country) ?? false}
                    onChange={() => toggleCountry(country)}
                    className="h-3.5 w-3.5 rounded border-white/10 bg-background accent-teal"
                  />
                  <span className="truncate">{country}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Event code filter */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Event Type
            </p>
            <input
              type="text"
              placeholder="Search event types…"
              value={codeSearch}
              onChange={(e) => setCodeSearch(e.target.value)}
              className="mb-2 w-full rounded-md border border-white/10 bg-background px-3 py-1.5 text-sm text-white placeholder:text-text-muted focus:border-teal focus:outline-none"
            />
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {filteredCodes.map((code) => (
                <label key={code} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filter.eventCodes?.includes(code) ?? false}
                    onChange={() => toggleEventCode(code)}
                    className="h-3.5 w-3.5 rounded border-white/10 bg-background accent-teal"
                  />
                  <span className="truncate">{code}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
