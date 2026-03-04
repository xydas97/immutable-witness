'use client'

import type { ProofType } from '@/types'

const PROOF_TYPES: { value: ProofType; label: string; description: string; icon: string }[] = [
  {
    value: 'file',
    label: 'File Upload',
    description: 'Upload photos, videos, or documents as evidence',
    icon: '📄',
  },
  {
    value: 'url',
    label: 'URL + Text',
    description: 'Link to online sources with optional commentary',
    icon: '🔗',
  },
  {
    value: 'testimony',
    label: 'Testimony',
    description: 'Written eyewitness or expert account',
    icon: '🗣️',
  },
]

interface TypeSelectionProps {
  selected: ProofType | null
  onSelect: (type: ProofType) => void
}

export function TypeSelection({ selected, onSelect }: TypeSelectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Select Proof Type</h3>
      <p className="text-sm text-text-muted">
        Choose the type of evidence you want to submit for this event.
      </p>

      <div className="mt-4 space-y-3">
        {PROOF_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => onSelect(type.value)}
            className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
              selected === type.value
                ? 'border-teal bg-teal/10'
                : 'border-white/10 bg-background hover:border-white/20'
            }`}
          >
            <span className="text-2xl">{type.icon}</span>
            <div>
              <p className="font-medium">{type.label}</p>
              <p className="mt-0.5 text-sm text-text-muted">{type.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
