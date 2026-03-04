import { NextResponse } from 'next/server'
import { getEvents } from '@/lib/newsapi'

export async function GET() {
  try {
    const events = await getEvents()
    return NextResponse.json(events)
  } catch (err) {
    console.error('[/api/events] Failed:', err)
    return NextResponse.json([])
  }
}
