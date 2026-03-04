import { NextResponse } from 'next/server'
import { getEvents } from '@/lib/newsapi'
import { MOCK_EVENTS } from '@/lib/mockData'

export async function GET() {
  try {
    const events = await getEvents()

    // Fall back to mock data if both APIs return nothing
    if (events.length === 0) {
      console.log('[/api/events] No live data, falling back to mock events')
      return NextResponse.json(MOCK_EVENTS)
    }

    return NextResponse.json(events)
  } catch (err) {
    console.error('[/api/events] Failed:', err)
    return NextResponse.json(MOCK_EVENTS)
  }
}
