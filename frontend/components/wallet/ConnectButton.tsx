'use client'

import { ConnectButton as DappKitConnectButton } from '@mysten/dapp-kit'
import { useCurrentAccount } from '@mysten/dapp-kit'

export function ConnectButton() {
  const account = useCurrentAccount()

  return (
    <div className="flex items-center gap-2">
      {account && (
        <span className="h-2 w-2 rounded-full bg-teal" title="Wallet connected" />
      )}
      <DappKitConnectButton
        connectText="Connect Wallet"
        className="!rounded-lg !bg-surface !px-4 !py-2 !text-sm !font-medium !text-white hover:!bg-teal/20 !border !border-white/10 !transition-colors"
      />
    </div>
  )
}
