import { NextRequest, NextResponse } from 'next/server'
import { blobIdToInt } from '@mysten/walrus'

export const dynamic = 'force-dynamic'

const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443'
const WALRUS_PKG =
  '0xd84704c17fc870b8764832c535aa6b11f21a95cd6f5bb38a9b07d2cf42220c66'

interface BlobInfoResult {
  blobId: string
  endEpoch: number | null
  objectId: string | null
  status: 'permanent' | 'deletable' | 'nonexistent'
}

/**
 * Find blob info by paginating through BlobRegistered/BlobCertified events.
 * Converts base64url blobId to u256 to match on-chain event data.
 */
async function findBlobsInfo(blobIds: string[]): Promise<BlobInfoResult[]> {
  // Convert all blobIds to their u256 representations for matching
  const idMap = new Map<string, string>() // u256 -> base64url blobId
  for (const blobId of blobIds) {
    try {
      idMap.set(blobIdToInt(blobId).toString(), blobId)
    } catch {
      // Invalid blobId format, skip
    }
  }

  const results = new Map<string, BlobInfoResult>()
  const remaining = new Set(idMap.keys())

  // Paginate through events until we find all blobs or exhaust pages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = null
  let pages = 0
  const MAX_PAGES = 30

  while (remaining.size > 0 && pages < MAX_PAGES) {
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
          true, // descending (most recent first)
        ],
      }),
    })

    const data = await res.json()
    const events = data?.result?.data || []

    for (const evt of events) {
      const parsed = evt.parsedJson
      if (!parsed?.blob_id) continue

      const blobIdStr = parsed.blob_id.toString()
      if (remaining.has(blobIdStr)) {
        const base64BlobId = idMap.get(blobIdStr)!
        // Prefer BlobCertified over BlobRegistered (certified has more reliable data)
        const existing = results.get(base64BlobId)
        const isCertified = evt.type?.includes('BlobCertified')

        if (!existing || isCertified) {
          results.set(base64BlobId, {
            blobId: base64BlobId,
            endEpoch: parsed.end_epoch ?? null,
            objectId: parsed.object_id ?? null,
            status: parsed.deletable ? 'deletable' : 'permanent',
          })
        }

        if (isCertified) {
          remaining.delete(blobIdStr)
        }
      }
    }

    if (!data?.result?.hasNextPage) break
    cursor = data.result.nextCursor
    pages++

    // After 15 pages, accept BlobRegistered results and stop searching for those blobs
    if (pages >= 15) {
      idMap.forEach((base64Id, u256) => {
        if (remaining.has(u256) && results.has(base64Id)) {
          remaining.delete(u256)
        }
      })
    }
  }

  // Return results for all requested blobIds (with defaults for not-found)
  return blobIds.map(
    (blobId) =>
      results.get(blobId) ?? {
        blobId,
        endEpoch: null,
        objectId: null,
        status: 'nonexistent' as const,
      },
  )
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<BlobInfoResult[] | { error: string }>> {
  try {
    const { blobIds } = (await request.json()) as { blobIds: string[] }

    if (!blobIds || !Array.isArray(blobIds) || blobIds.length === 0) {
      return NextResponse.json({ error: 'blobIds array required' }, { status: 400 })
    }

    const results = await findBlobsInfo(blobIds.slice(0, 20))
    return NextResponse.json(results)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch blob info'
    console.error('[Walrus BlobInfo]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
