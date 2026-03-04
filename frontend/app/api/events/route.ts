import { NextRequest, NextResponse } from 'next/server'
import { getEvents } from '@/lib/newsapi'
import { clearGdeltCache } from '@/lib/gdelt'

export async function GET(request: NextRequest) {
  try {
    const force = request.nextUrl.searchParams.get('force') === 'true'
    if (force) {
      clearGdeltCache()
    }

    const events = await getEvents()
    return NextResponse.json(events)
  } catch (err) {
    console.error('[/api/events] Failed:', err)
    return NextResponse.json([])
  }
}
