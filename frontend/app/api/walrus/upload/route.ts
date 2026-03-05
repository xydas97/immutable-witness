import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

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
    const senderAddress = formData.get('senderAddress') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()

    // Hash the exact bytes we send to Walrus so verification always matches
    const sha256 = createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex')
    const contentHash = `sha256:${sha256}`

    console.log(`[Walrus] Uploading blob, size: ${arrayBuffer.byteLength} bytes, epochs: ${epochs}`)

    // deletable=true lets the blob owner delete it later
    // send_object_to transfers blob ownership to the user's wallet
    const params = new URLSearchParams({ epochs: String(epochs), deletable: 'true' })
    if (senderAddress) params.set('send_object_to', senderAddress)

    const response = await fetch(
      `${WALRUS_PUBLISHER_URL}/v1/blobs?${params}`,
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

    const alreadyCertified = !!result.alreadyCertified
    console.log(`[Walrus] Blob uploaded: ${blobId}, endEpoch: ${endEpoch}, size: ${size}, alreadyCertified: ${alreadyCertified}`)
    return NextResponse.json({ blobId, contentHash, cost, endEpoch, startEpoch, size, alreadyCertified })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Upload failed'
    console.error('[Walrus] Upload failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
