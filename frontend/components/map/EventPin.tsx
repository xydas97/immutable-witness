'use client'

import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import type { GdeltEvent, Severity } from '@/types'

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#C0392B',
  high: '#E67E22',
  medium: '#F1C40F',
  low: '#00C896',
}

// Create a custom circle marker icon for each severity level
function createPinIcon(severity: Severity): L.DivIcon {
  const color = SEVERITY_COLORS[severity]
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      width: 14px;
      height: 14px;
      background: ${color};
      border: 2px solid rgba(255,255,255,0.8);
      border-radius: 50%;
      box-shadow: 0 0 8px ${color}80;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

interface EventPinProps {
  event: GdeltEvent
  onClick: (event: GdeltEvent) => void
}

export function EventPin({ event, onClick }: EventPinProps) {
  const icon = createPinIcon(event.severity)

  return (
    <Marker
      position={[event.lat, event.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick(event),
      }}
    >
      <Popup className="dark-popup">
        <div className="min-w-[200px]">
          <p className="text-sm font-semibold text-gray-900">{event.title}</p>
          <p className="mt-1 text-xs text-gray-600">{event.actionGeo}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: SEVERITY_COLORS[event.severity] }}
            >
              {event.severity}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(event.timestamp).toLocaleDateString()}
            </span>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}
