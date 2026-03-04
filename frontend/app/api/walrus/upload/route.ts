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

    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=${epochs}`, {
      method: 'PUT',
      body: arrayBuffer,
      headers: { 'Content-Type': 'application/octet-stream' },
    })

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
    if (result.newlyCreated) {
      blobId = result.newlyCreated.blobObject.blobId
      cost = result.newlyCreated.cost
    } else if (result.alreadyCertified) {
      blobId = result.alreadyCertified.blobId
    } else {
      return NextResponse.json({ error: 'Unexpected Walrus response' }, { status: 502 })
    }

    console.log(`[Walrus] Blob uploaded: ${blobId}`)
    return NextResponse.json({ blobId, cost })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Upload failed'
    console.error('[Walrus] Upload failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
