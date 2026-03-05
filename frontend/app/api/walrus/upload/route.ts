import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const WALRUS_PUBLISHER_URL =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ||
  'https://publisher.walrus-testnet.walrus.space'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const epochs = Number(formData.get('epochs')) || 5

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    console.log(`[Walrus] Uploading blob, size: ${arrayBuffer.byteLength} bytes, epochs: ${epochs}`)

    const response = await fetch(
      `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=${epochs}`,
      {
        method: 'PUT',
        body: arrayBuffer,
        headers: { 'Content-Type': 'application/octet-stream' },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Walrus] Publisher error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { error: `Walrus upload failed: ${response.status}` },
        { status: 502 },
      )
    }

    const result = await response.json()

    let blobId: string
    let cost: number | undefined
    let endEpoch: number | undefined
    let startEpoch: number | undefined
    let size: number | undefined

    if (result.newlyCreated) {
      const blob = result.newlyCreated.blobObject
      blobId = blob.blobId
      cost = result.newlyCreated.cost
      endEpoch = blob.storage?.endEpoch
      startEpoch = blob.storage?.startEpoch
      size = blob.size
    } else if (result.alreadyCertified) {
      blobId = result.alreadyCertified.blobId
      endEpoch = result.alreadyCertified.endEpoch
    } else {
      return NextResponse.json({ error: 'Unexpected Walrus response' }, { status: 502 })
    }

    console.log(`[Walrus] Blob uploaded: ${blobId}, endEpoch: ${endEpoch}, size: ${size}`)
    return NextResponse.json({ blobId, cost, endEpoch, startEpoch, size })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Upload failed'
    console.error('[Walrus] Upload failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
