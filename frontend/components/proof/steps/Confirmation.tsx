'use client'

import { toast } from 'sonner'

interface ConfirmationProps {
  blobId: string
  contentHash: string
  txDigest: string
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success(`${label} copied to clipboard`)
  })
}

export function Confirmation({ blobId, contentHash, txDigest }: ConfirmationProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal/20">
          <span className="text-2xl">✓</span>
        </div>
        <h3 className="text-lg font-semibold">Evidence Submitted!</h3>
        <p className="mt-1 text-sm text-text-muted">
          Your proof has been permanently stored on Walrus and recorded on-chain.
        </p>
      </div>

      <div className="space-y-3">
        <InfoRow
          label="Blob ID"
          value={blobId}
          onCopy={() => copyToClipboard(blobId, 'Blob ID')}
        />
        <InfoRow
          label="Content Hash"
          value={contentHash}
          onCopy={() => copyToClipboard(contentHash, 'Content hash')}
        />
        <InfoRow
          label="Transaction"
          value={txDigest}
          onCopy={() => copyToClipboard(txDigest, 'Transaction digest')}
          link={`https://suiscan.xyz/testnet/tx/${txDigest}`}
        />
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  onCopy,
  link,
}: {
  label: string
  value: string
  onCopy: () => void
  link?: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-background p-3">
      <p className="text-xs uppercase text-text-muted">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="truncate font-mono text-xs">{value}</p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onCopy}
            className="text-xs text-teal hover:underline"
          >
            Copy
          </button>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal hover:underline"
            >
              View
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
