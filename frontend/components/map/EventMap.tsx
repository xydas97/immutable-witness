'use client'

import { MapContainer, TileLayer } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { EventPin } from './EventPin'
import type { GdeltEvent } from '@/types'
import 'leaflet/dist/leaflet.css'

const DARK_TILE_URL =
  'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'

const TILE_ATTRIBUTION =
  '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'

interface EventMapProps {
  events: GdeltEvent[]
  onEventClick: (event: GdeltEvent) => void
}

export function EventMap({ events, onEventClick }: EventMapProps) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={18}
      className="h-full w-full"
      style={{ background: '#0F1923' }}
    >
      <TileLayer url={DARK_TILE_URL} attribution={TILE_ATTRIBUTION} />
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={50}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
      >
        {events.map((event) => (
          <EventPin key={event.id} event={event} onClick={onEventClick} />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
