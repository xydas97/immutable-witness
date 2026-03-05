import { NextRequest, NextResponse } from 'next/server'
import { blobIdToInt } from '@mysten/walrus'

export const dynamic = 'force-dynamic'

const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443'
const WALRUS_PKG =
  '0xd84704c17fc870b8764832c535aa6b11f21a95cd6f5bb38a9b07d2cf42220c66'

/**
 * Find the Blob's Sui Object ID by scanning Walrus events.
 * The client needs this to build the delete transaction.
 */
async function findBlobObjectId(blobId: string): Promise<string | null> {
  try {
    const blobIdInt = blobIdToInt(blobId).toString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let cursor: any = null
    let pages = 0

    while (pages < 30) {
      const res = await fetch(SUI_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'suix_queryEvents',
          params: [
            {
              MoveEventModule: {
                package: WALRUS_PKG,
                module: 'events',
              },
            },
            cursor,
            50,
            true,
          ],
        }),
      })

      const data = await res.json()
      const events = data?.result?.data || []

      for (const evt of events) {
        const parsed = evt.parsedJson
        if (parsed?.blob_id?.toString() === blobIdInt && parsed?.object_id) {
          return parsed.object_id
        }
      }

      if (!data?.result?.hasNextPage) break
      cursor = data.result.nextCursor
      pages++
    }

    return null
  } catch (err) {
    console.error('[Walrus Delete] Failed to find blob object ID:', err)
    return null
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { blobId } = (await request.json()) as { blobId: string }

    if (!blobId) {
      return NextResponse.json({ error: 'blobId is required' }, { status: 400 })
    }

    const blobObjectId = await findBlobObjectId(blobId)
    if (!blobObjectId) {
      return NextResponse.json(
        { error: 'Could not find blob object on Sui. It may have expired or is not yet certified.' },
        { status: 404 },
      )
    }

    console.log(`[Walrus Delete] Found blob object: ${blobObjectId} for blobId: ${blobId}`)
    return NextResponse.json({ blobObjectId })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Delete failed'
    console.error('[Walrus Delete]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
