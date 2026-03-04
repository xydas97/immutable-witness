import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const WALRUS_PUBLISHER_URL =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ||
  'https://publisher.walrus-testnet.walrus.space'

interface PatchResult {
  patchId: string
  blobId: string
  filename: string
  mimeType: string
  size: number
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const epochs = Number(formData.get('epochs')) || 5
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    console.log(`[Walrus Quilt] Uploading ${files.length} files, epochs: ${epochs}`)

    // Upload each file as a separate blob and collect results
    const patches: PatchResult[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()

        const response = await fetch(
          `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=${epochs}&permanent=true`,
          {
            method: 'PUT',
            body: arrayBuffer,
            headers: { 'Content-Type': 'application/octet-stream' },
          },
        )

        if (!response.ok) {
          errors.push(`Failed to upload ${file.name}: HTTP ${response.status}`)
          continue
        }

        const result = await response.json()
        let blobId: string

        if (result.newlyCreated) {
          blobId = result.newlyCreated.blobObject.blobId
        } else if (result.alreadyCertified) {
          blobId = result.alreadyCertified.blobId
        } else {
          errors.push(`Unexpected response for ${file.name}`)
          continue
        }

        patches.push({
          patchId: `${blobId}-${patches.length}`,
          blobId,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        })

        console.log(`[Walrus Quilt] Uploaded patch: ${file.name} → ${blobId}`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`${file.name}: ${msg}`)
      }
    }

    if (patches.length === 0) {
      return NextResponse.json(
        { error: 'All uploads failed', details: errors },
        { status: 502 },
      )
    }

    // Upload a JSON manifest as a Walrus blob — its blobId becomes the quiltId
    const manifest = JSON.stringify({
      type: 'quilt',
      patches: patches.map((p) => ({
        blobId: p.blobId,
        filename: p.filename,
        mimeType: p.mimeType,
        size: p.size,
      })),
    })

    const manifestRes = await fetch(
      `${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=${epochs}&permanent=true`,
      {
        method: 'PUT',
        body: new TextEncoder().encode(manifest),
        headers: { 'Content-Type': 'application/octet-stream' },
      },
    )

    if (!manifestRes.ok) {
      return NextResponse.json(
        { error: 'Failed to upload quilt manifest' },
        { status: 502 },
      )
    }

    const manifestResult = await manifestRes.json()
    let quiltId: string
    if (manifestResult.newlyCreated) {
      quiltId = manifestResult.newlyCreated.blobObject.blobId
    } else if (manifestResult.alreadyCertified) {
      quiltId = manifestResult.alreadyCertified.blobId
    } else {
      return NextResponse.json(
        { error: 'Unexpected manifest upload response' },
        { status: 502 },
      )
    }

    console.log(`[Walrus Quilt] Complete: ${patches.length}/${files.length} patches, quiltId: ${quiltId}`)

    return NextResponse.json({
      quiltId,
      patches,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Quilt upload failed'
    console.error('[Walrus Quilt] Failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
