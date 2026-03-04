import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Walrus system object on testnet — holds committee epoch + storage params
const WALRUS_SYSTEM_OBJECT_ID =
  '0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af'
const SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443'

interface EpochInfo {
  currentEpoch: number
  maxEpochsAhead: number
  storagePricePerUnit: number
  writePricePerUnit: number
}

export async function GET(): Promise<NextResponse<EpochInfo | { error: string }>> {
  try {
    // Step 1: Get the dynamic field (SystemStateInnerV1) from the Walrus system object
    const fieldsRes = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getDynamicFields',
        params: [WALRUS_SYSTEM_OBJECT_ID, null, 1],
      }),
    })

    const fieldsData = await fieldsRes.json()
    const stateObjectId = fieldsData?.result?.data?.[0]?.objectId
    if (!stateObjectId) {
      return NextResponse.json({ error: 'Walrus system state not found' }, { status: 502 })
    }

    // Step 2: Read the SystemStateInnerV1 object for epoch + pricing
    const objRes = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'sui_getObject',
        params: [stateObjectId, { showContent: true }],
      }),
    })

    const objData = await objRes.json()
    const value = objData?.result?.data?.content?.fields?.value?.fields
    if (!value) {
      return NextResponse.json({ error: 'Could not parse system state' }, { status: 502 })
    }

    const currentEpoch = Number(value.committee?.fields?.epoch ?? 0)
    const maxEpochsAhead = Number(value.future_accounting?.fields?.length ?? 53)
    const storagePricePerUnit = Number(value.storage_price_per_unit_size ?? 1000)
    const writePricePerUnit = Number(value.write_price_per_unit_size ?? 2000)

    return NextResponse.json({
      currentEpoch,
      maxEpochsAhead,
      storagePricePerUnit,
      writePricePerUnit,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch epoch info'
    console.error('[Walrus Epoch]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
