# CLAUDE.md — Immutable Witness

> On-chain evidence archival platform. Permanent. Tamper-proof. Unstoppable.

This file is the source of truth for Claude Code when working in this repository. Read it fully before touching any file.

---

## Project Overview

**Immutable Witness** lets users submit evidence (files, images, URLs, testimony) tied to real-world conflict events sourced from GDELT and NewsAPI. Each submission is:
1. Scored for relevance by Claude AI before upload
2. Hashed client-side (SHA-256)
3. Archived permanently on Walrus (deletable=false)
4. Registered on Sui testnet via a Move smart contract

The result is a cryptographically verifiable, decentralised chain of custody for digital evidence.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript strict, Tailwind CSS |
| Wallet | @mysten/dapp-kit, @mysten/sui.js |
| Storage | Walrus testnet SDK |
| Blockchain | Sui testnet — Move 2024 edition |
| Data | GDELT v2 API, NewsAPI v2 |
| AI Filter | Anthropic Claude API (claude-sonnet-4-20250514) |
| Map | react-leaflet, react-leaflet-cluster |
| State / Fetching | TanStack Query (React Query v5) |
| Notifications | sonner |
| File input | react-dropzone |
| Deployment | Vercel (frontend), Sui testnet (contracts) |

---

## Repository Structure

```
/
├── frontend/                   # Next.js application
│   ├── app/                    # App Router pages
│   │   ├── page.tsx            # Page 1 — Live map
│   │   ├── history/
│   │   │   └── page.tsx        # Page 2 — Historic events explorer
│   │   ├── my-proofs/
│   │   │   └── page.tsx        # Page 3 — My blobs / proof registry
│   │   └── api/
│   │       └── relevance/
│   │           └── route.ts    # POST /api/relevance — Claude scoring
│   ├── components/
│   │   ├── layout/
│   │   │   ├── NavBar.tsx
│   │   │   └── PageShell.tsx
│   │   ├── map/
│   │   │   ├── EventPin.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   └── EventDrawer.tsx
│   │   ├── proof/
│   │   │   └── ProofSubmissionModal.tsx
│   │   ├── wallet/
│   │   │   └── ConnectButton.tsx
│   │   └── ui/
│   │       ├── Spinner.tsx
│   │       └── ErrorBoundary.tsx
│   ├── lib/
│   │   ├── gdelt.ts            # GDELT API service
│   │   ├── newsapi.ts          # NewsAPI fallback service
│   │   ├── walrus.ts           # Walrus single blob operations
│   │   ├── walrusQuilt.ts      # Walrus Quilt (batch) operations
│   │   ├── sui.ts              # Sui transaction service
│   │   └── __tests__/          # Unit tests
│   ├── hooks/
│   │   ├── useEvents.ts        # Fetches + caches GDELT events
│   │   ├── useProofsForEvent.ts
│   │   └── useMyProofs.ts
│   ├── types/
│   │   └── index.ts            # ALL shared TypeScript types (source of truth)
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── .env.local.example
├── contracts/                  # Sui Move smart contracts
│   ├── Move.toml
│   ├── sources/
│   │   └── immutable_witness.move
│   └── deployed.json           # Package address + Registry object ID
├── CLAUDE.md                   # This file
└── README.md
```

---

## Environment Variables

Never hardcode these. Always read from env vars.

```bash
# frontend/.env.local
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_CONTRACT_ADDRESS=           # Sui package address after deploy
NEXT_PUBLIC_REGISTRY_OBJECT_ID=         # Shared Registry object ID
GDELT_API_URL=http://api.gdeltproject.org/api/v2/events/search
NEWS_API_KEY=                           # NewsAPI key
ANTHROPIC_API_KEY=                      # Never expose client-side
```

`ANTHROPIC_API_KEY` is **server-side only**. It is used exclusively in `frontend/app/api/relevance/route.ts`. Never import it in any file under `frontend/components` or `frontend/hooks`.

---

## Core Types

All types live in `frontend/types/index.ts`. Never redefine them locally. Import from `@/types`.

```typescript
// Key types — memorise these shapes

GdeltEvent {
  id, title, eventCode, eventDescription,
  lat, lng, country, timestamp, severity,   // severity: 'critical'|'high'|'medium'|'low'
  sourceUrl, actionGeo
}

WitnessProof {
  blobId, contentHash, submitterAddress, eventId,
  relevanceScore, proofType,                // 'file'|'url'|'testimony'
  description, sourceUrl, epoch, timestamp,
  status                                    // 'verified'|'unconfirmed'|'blocked'
}

EventFilter {
  countries: string[],
  eventCodes: string[],
  timeRange: { from: Date, to: Date },
  verifiedOnly: boolean
}

RelevanceResult {
  score: number,      // 0-100
  reason: string,
  status: 'verified' | 'unconfirmed' | 'blocked'
  // score >= 75 → verified, 40-74 → unconfirmed, < 40 → blocked
}
```

---

## Service Layer Rules

### Walrus (`frontend/lib/walrus.ts`)

```typescript
// Endpoints
PUT  {PUBLISHER_URL}/v1/blobs?epochs=N     // upload
GET  {AGGREGATOR_URL}/v1/blobs/{blobId}    // download

// Always upload with deletable=false — immutability is a core feature, not an option
// Always compute SHA-256 before upload using Web Crypto API
// Hash computation:
const hashBuffer = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
```

### Walrus Quilts (`frontend/lib/walrusQuilt.ts`)

```typescript
// Quilt upload: multipart/form-data POST to /v1/quilts
// Patch identifier scheme: {eventId}_{sanitisedFilename}_{index}
// sanitisedFilename = filename.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
```

### Sui (`frontend/lib/sui.ts`)

```typescript
// Always use TransactionBlock (PTB) for writes
// Read with SuiClient.getObject and SuiClient.queryEvents
// Contract addresses come from /contracts/deployed.json — never hardcode
import deployed from '@/contracts/deployed.json'
// deployed.packageAddress, deployed.registryObjectId
```

### GDELT (`frontend/lib/gdelt.ts`)

```typescript
// Primary data source. Can be unreliable — always have the NewsAPI fallback ready.
// Cache responses for 15 minutes in memory to avoid rate limits during demo.
// Goldstein scale → severity:
// < -7  → 'critical'  (red pin)
// -7 to -4 → 'high'   (orange pin)
// -4 to -1 → 'medium' (yellow pin)
// > -1  → 'low'       (teal pin)
```

### Relevance API (`frontend/app/api/relevance/route.ts`)

```typescript
// Server-side only. POST endpoint.
// Calls claude-sonnet-4-20250514
// System prompt must instruct Claude to return ONLY valid JSON: {"score": N, "reason": "..."}
// On Claude API failure: return { score: 50, reason: "Check unavailable", status: "unconfirmed" }
// Never block a submission because Claude is down.
```

---

## Smart Contract (`/contracts/sources/immutable_witness.move`)

**Move 2024 edition syntax.** Key objects:

```move
// Registry — shared object, one per deployment
struct Registry has key { id: UID, incidents: Table<String, ID>, total_proofs: u64 }

// One per GDELT event
struct IncidentRecord has key, store { id: UID, event_id: String, ... }

// One per user submission
struct ProofRecord has key, store {
  id: UID, incident_id: ID, blob_id: String,
  content_hash: String, submitter: address,
  relevance_score: u8, proof_type: String,
  description: String, source_url: Option<String>,
  epoch: u64, timestamp: u64, status: String
}
```

**lat/lng stored as u64** — multiply float by 1_000_000 before storing, divide by 1_000_000 when reading.

Public entry functions: `register_incident`, `submit_proof`, `extend_epoch`, `verify_proof`.

After any contract change: `sui move build && sui move test && sui client publish` then update `/contracts/deployed.json`.

---

## Frontend Conventions

### Map (Page 1 — `frontend/app/page.tsx`)

- Leaflet must be dynamically imported with `ssr: false` — it breaks on SSR
- Map tiles: CartoDB Dark Matter — `https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png`
- Clicking a pin opens `EventDrawer` — never navigates away from the map
- Filter state lives in URL query params via `useSearchParams`

### Proof Submission Modal — Step Order

```
1. Type selection (single file / quilt / URL+text)
2. Content input + metadata
3. Relevance check → POST /api/relevance  ← must pass before proceeding
4. Storage cost estimate → walrus.estimateStorageCost(file.size)
5. Hash + upload → walrus.uploadBlob or walrusQuilt.uploadQuilt
6. On-chain registration → suiService.submitProof
7. Confirmation screen with blob ID + tx digest
```

Never skip or reorder these steps. The relevance check (step 3) gates all uploads.

### Wallet

- Use `useCurrentAccount()` and `useSignAndExecuteTransactionBlock()` from `@mysten/dapp-kit`
- Always check wallet connection before any write operation — show `ConnectButton` prompt if not connected
- Never pass raw private keys anywhere

---

## Design System

```css
/* Core palette */
--background:  #0F1923   /* dark navy */
--surface:     #1A2535   /* card background */
--teal:        #00C896   /* primary accent, CTAs, verified state */
--blue:        #1A56C4   /* links, info */
--orange:      #E67E22   /* warnings, unconfirmed state */
--red:         #C0392B   /* errors, blocked state, critical severity */
--text:        #FFFFFF   /* primary text */
--text-muted:  #888888   /* secondary text */

/* Severity pin colours */
critical → #C0392B (red)
high     → #E67E22 (orange)
medium   → #F1C40F (yellow)
low      → #00C896 (teal)
```

All styling via Tailwind utility classes. No inline styles except for dynamic values (e.g. map pin colours). No CSS modules.

---

## State Management

Use **TanStack Query** for all async server state. No Redux, no Zustand, no useEffect-based fetching.

```typescript
// Hook pattern used throughout
export function useProofsForEvent(eventId: string) {
  return useQuery({
    queryKey: ['proofs', eventId],
    queryFn: () => suiService.getProofsForEvent(eventId),
    staleTime: 30_000,
  })
}

// After a mutation, invalidate the relevant query
queryClient.invalidateQueries({ queryKey: ['proofs', eventId] })
```

---

## Error Handling Rules

1. **Services throw typed errors** — `WalrusUploadError`, `WalrusBlobNotFoundError`, `SuiTransactionError`. Never throw plain `Error`.
2. **Components catch at the boundary** — use try/catch in event handlers, show toast notifications via `sonner`.
3. **API routes always return** — never let a Next.js API route crash. Return a degraded response with a meaningful message.
4. **Relevance API failure is non-blocking** — if Claude is down, default to `unconfirmed` (score 50), never block the upload.
5. **GDELT failure is non-blocking** — fall back to NewsAPI silently, then show a banner if both fail.

---

## Testing

```bash
npm run test          # Jest unit tests
npm run test:watch    # Watch mode
```

Unit test files live at `frontend/lib/__tests__/*.test.ts`. Mock all external API calls. Do not make real network requests in tests.

Critical paths that must have tests:
- `gdelt.ts` — normaliseEvent(), getSeverityLabel()
- `walrus.ts` — computeHash(), estimateStorageCost()
- `app/api/relevance/route.ts` — score thresholds, Claude failure fallback

---

## Common Commands

```bash
# Frontend (run from /frontend)
cd frontend
npm run dev           # Start Next.js dev server on :3000
npm run build         # Production build
npm run lint          # ESLint check
npm run type-check    # tsc --noEmit

# Contracts (run from /contracts)
cd contracts
sui move build
sui move test
sui client publish --gas-budget 100000000
```

---

## Hackathon Requirements Checklist

When implementing any feature, verify it covers the relevant CR:

| CR | Feature |
|---|---|
| CR-1 | Single blob upload in ProofSubmissionModal (step 5) |
| CR-2 | Blob download in EventDrawer + integrity verification |
| CR-3 | Quilt upload for multi-file evidence packages |
| CR-4 | Patch listing + individual patch retrieval in EventDrawer |
| CR-5 | Proof list in EventDrawer + full registry in My Proofs page |
| CR-6 | Typed errors surfaced at every step of submission flow |
| CR-7 | Sui Move contract registers every proof on-chain |
| CR-8 | All blobs uploaded with `deletable=false` |
| CR-9 | Storage cost estimate shown in step 4 of submission modal |
| CR-10 | Epoch renewal UI in My Proofs page |
| CR-11 | Integrity verification in EventDrawer and My Proofs page |
| CR-12 | Deployed on Vercel, source on org GitHub |

---

## What Not To Do

- ❌ Do not use `useEffect` for data fetching — use TanStack Query
- ❌ Do not use `localStorage` or `sessionStorage`
- ❌ Do not expose `ANTHROPIC_API_KEY` client-side — server route only
- ❌ Do not use `deletable=true` on any Walrus upload — ever
- ❌ Do not hardcode contract addresses — read from `deployed.json`
- ❌ Do not use the Pages Router — App Router only
- ❌ Do not redefine types locally — import from `@/types`
- ❌ Do not use plain `Error` in service layer — use typed error classes
- ❌ Do not skip the relevance check step — it runs before every upload
- ❌ Do not use `any` in TypeScript — strict mode is enforced