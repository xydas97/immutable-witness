# Immutable Witness

An on-chain evidence archival platform that permanently preserves proof of real-world conflict events using **Walrus** decentralized storage on the **Sui** blockchain.

**Live demo:** https://immutable-witness.vercel.app/

---

## What It Does

Immutable Witness lets journalists, investigators, and citizens submit verifiable evidence (photos, documents, testimonies, URLs) for real-world conflict events sourced from GDELT. Each piece of evidence is:

1. **Uploaded to Walrus** — decentralized, tamper-proof blob storage
2. **Registered on-chain** — a Sui Move smart contract records the blob ID, SHA-256 content hash, submitter address, and AI relevance score
3. **Verifiable by anyone** — third parties can download the blob, recompute the hash, and compare it against the immutable on-chain record

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App    │────▶│  Walrus Publisher │────▶│  Walrus Storage │
│  (frontend +     │     │  (blob upload)    │     │  (aggregator)   │
│   API routes)    │     └──────────────────┘     └─────────────────┘
│                  │
│                  │     ┌──────────────────┐
│                  │────▶│   Sui Blockchain  │
│                  │     │  (Move contract)  │
└─────────────────┘     └──────────────────┘
        │
        ▼
┌──────────────────┐     ┌──────────────────┐
│   GDELT / News   │     │  Anthropic Claude │
│  (event source)  │     │ (relevance score) │
└──────────────────┘     └──────────────────┘
```

**Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Leaflet maps
**Wallet:** @mysten/dapp-kit (Sui Wallet Standard)
**Storage:** Walrus HTTP Publisher + Aggregator APIs
**Blockchain:** Sui Move smart contract
**AI:** Anthropic Claude for proof-to-event relevance scoring

---

## Pages

| Route | Description |
|---|---|
| `/` | **Live Map** — Interactive map of conflict events with clustered markers. Click an event to browse submitted proofs, verify integrity, or submit new evidence. |
| `/history` | **Historic Events** — Searchable table of past conflict events with country/severity filters. |
| `/my-proofs` | **My Proofs** — Dashboard for your submitted evidence. Extend storage, view content, delete low-score blobs. Requires wallet connection. |

---

## Walrus Integration — Challenge Requirements

### CR-1: Single Blob Upload

**Files:** `frontend/app/api/walrus/upload/route.ts`, `frontend/lib/walrus.ts`, `frontend/hooks/useSubmitProof.ts`

- Single file or text testimony uploaded via `PUT /v1/blobs?epochs={N}` to the Walrus Publisher
- User selects storage duration (1–53 epochs) via an interactive slider
- Blobs are uploaded as **deletable** (no `permanent` flag), respecting the user's epoch selection
- Server computes SHA-256 hash of the exact bytes sent to Walrus — this hash is stored on-chain
- Publisher response parsed for both `newlyCreated` and `alreadyCertified` cases
- Returns: `blobId`, `contentHash`, `cost`, `endEpoch`, `size`

**How to test:**
1. Connect a Sui testnet wallet
2. Click any event on the Live Map → "Submit Proof"
3. Select proof type (File, URL, or Testimony)
4. Enter content and description
5. AI relevance check runs automatically
6. Adjust storage epochs on the Storage step
7. Upload proceeds: Walrus upload → wallet signature → on-chain registration

### CR-2: Single Blob Download

**Files:** `frontend/components/proofs/ProofViewerModal.tsx`, `frontend/lib/walrus.ts`

- Blobs downloaded from the Walrus Aggregator via `GET /v1/blobs/{blobId}`
- Content-type detection chain: declared MIME type → HTTP header → magic bytes → UTF-8 text → raw download
- Renders images inline, displays text/testimony formatted, provides download link for PDFs and other files
- Error handling: 404 (blob not found/expired), network failures, legacy quilt IDs
- Retry button + "View on Explorer" link when download fails

**How to test:**
1. Go to My Proofs → click "View" on any proof
2. The modal fetches the blob from the Walrus aggregator and renders it
3. Images display inline; text shows formatted; other types offer download

### CR-3: Batch Upload via Quilts

**Files:** `frontend/app/api/walrus/quilt/route.ts`, `frontend/lib/walrus.ts`

- Multiple files uploaded as individual Walrus blobs
- A JSON manifest is created listing all patches: `{ type: "quilt", patches: [{ blobId, filename, mimeType, size }] }`
- The manifest itself is uploaded as a Walrus blob — its `blobId` becomes the `quiltId`
- Server computes SHA-256 of the manifest bytes for on-chain integrity
- Partial success supported: returns uploaded patches + error details for any failures

**How to test:**
1. Submit a proof with multiple files selected (drag and drop or file picker)
2. Each file is uploaded separately, then a manifest blob ties them together
3. The on-chain record stores the manifest's blobId as the proof's blob ID

### CR-4: Quilt Retrieval

**Files:** `frontend/components/proofs/ProofViewerModal.tsx`

- When viewing a proof, the modal fetches the blob from the aggregator
- If the response is JSON with `type: "quilt"`, it parses the manifest and displays the patch list
- Each patch shows: filename, MIME type, size, individual download button, and Walrus Explorer link
- Individual patches are downloadable via their own `blobId` from the aggregator

**How to test:**
1. Upload a multi-file proof (quilt)
2. View it from My Proofs → the modal shows the manifest with each patch listed
3. Click "Download" on individual patches to fetch them from Walrus

### CR-5: Upload History & Blob Registry

**Files:** `frontend/hooks/useMyProofs.ts`, `frontend/hooks/useProofsForEvent.ts`, `frontend/app/my-proofs/page.tsx`, `frontend/components/proofs/StatsBar.tsx`

- Upload history tracked via on-chain `ProofSubmitted` events emitted by the Move contract
- `useMyProofs` queries all events, filters by connected wallet address, enriches with Walrus metadata (blob size, MIME type, endEpoch via HEAD requests and `/api/walrus/blob-info`)
- `useProofsForEvent` filters proofs by GDELT event ID for per-event evidence browsing
- My Proofs page shows: total proofs, high-relevance count, storage used, expiring soon count
- Proofs table with pagination, blob explorer links

**How to test:**
1. Connect wallet → go to My Proofs
2. All your submitted proofs are listed with metadata
3. Stats bar shows aggregate storage metrics
4. Click blob ID links to view on Walrus Explorer (walruscan.com)

### CR-6: Basic Error Handling

**Files:** All API routes under `frontend/app/api/walrus/`, all UI components

- **Upload errors:** Progress indicator with phase labels (uploading → signing → confirming), error state with message
- **Download errors:** Error modal with retry button and Walrus Explorer link
- **Delete errors:** Toast notification with specific error message
- **Extension errors:** Toast with failure reason, disabled button states
- **API routes:** Consistent HTTP error codes (400 validation, 404 not found, 502 upstream failure, 500 internal)
- **Network errors:** Try-catch around all Walrus and Sui RPC calls

**How to test:**
1. Try submitting a proof without wallet connected — shows connection prompt
2. Try viewing a deleted/expired blob — shows error with retry option
3. Check browser console during uploads for detailed `[Walrus]` log lines

### CR-7: Smart Contract Integration

**Files:** `contracts/immutable_witness/sources/immutable_witness.move`, `frontend/hooks/useSubmitProof.ts`, `frontend/hooks/useMyProofs.ts`, `frontend/components/proofs/EpochExtensionModal.tsx`

**Contract:** `immutable_witness::immutable_witness` on Sui testnet

| Function | Description |
|---|---|
| `submit_proof()` | Register proof with blob_id, content_hash, relevance_score, proof_type, description |
| `remove_proof()` | Remove low-score proof (moderator/admin only, score < 75) |
| `add_moderator()` | Grant moderator role (admin only) |
| `event_exists()` | Check if GDELT event is registered |
| `total_proofs()` | Count all proofs across all events |

**Events emitted:** `ProofSubmitted`, `ProofRemoved`, `IncidentCreated`, `ModeratorAdded`

- Frontend builds Programmable Transaction Blocks (PTBs) via `@mysten/sui`
- Wallet signing via `@mysten/dapp-kit` `useSignAndExecuteTransaction`
- Transaction confirmation via `suiClient.waitForTransaction()`
- All proofs queryable from on-chain events — no off-chain database needed

**How to test:**
1. Submit a proof → wallet prompts for signature → transaction confirmed on-chain
2. Go to My Proofs → all proofs fetched from `ProofSubmitted` events
3. Blob explorer links show the proof on Sui/Walrus explorers

### CR-8: Blob Deletion

**Files:** `frontend/app/api/walrus/delete/route.ts`, `frontend/hooks/useRemoveProof.ts`, `frontend/app/my-proofs/page.tsx`

- Blobs uploaded without `permanent` flag → deletable by default (Walrus v1.33+)
- Delete flow: find blob's Sui object ID via event scanning → call `DELETE /v1/blobs/{objectId}` on publisher
- Publisher owns the blob objects (uploaded via its wallet), so it can process deletion
- UI: configurable threshold slider (0–74%) — proofs below threshold show a "Delete" button
- Confirmation modal explains: on-chain record remains, blob content removed from Walrus
- After deletion, the Verify button on the map shows "Blob not found" — proving deletion occurred

**How to test:**
1. Go to My Proofs → adjust the "Low-Score Deletion Threshold" slider
2. Proofs scoring below the threshold show a red "Delete" button
3. Click Delete → confirmation modal → blob removed from Walrus storage

### CR-9: Blob/Quilt Size Estimation

**Files:** `frontend/lib/walrus.ts` (`estimateStorageCost`), `frontend/components/proof/steps/StorageEstimate.tsx`, `frontend/components/proofs/EpochExtensionModal.tsx`

- Cost model based on Walrus testnet pricing:
  - Encoded size = 64 MB fixed overhead + raw size x 5 (erasure coding)
  - Billable units = ceil(encoded size / 1 MiB)
  - Cost = units x (storage_price x epochs + write_price)
- Displayed in SUI before upload (StorageEstimate step) and before extension (EpochExtensionModal)
- Interactive epoch slider updates cost estimate in real-time
- Epoch duration label adapts to network (testnet: 1 day, mainnet: 2 weeks)

**How to test:**
1. Start submitting a proof → reach the "Storage" step
2. Slide the epochs slider — cost updates in real-time
3. In My Proofs → click "Extend" on a proof — see extension cost estimate

### CR-10: Storage Extension (Epoch Renewal)

**Files:** `frontend/app/api/walrus/extend/route.ts`, `frontend/components/proofs/EpochExtensionModal.tsx`, `frontend/hooks/useWalrusEpoch.ts`, `frontend/app/api/walrus/epoch/route.ts`

- Extension modal shows: current epoch, blob expiration epoch, remaining epochs, new expiry after extension
- Max extension calculated: `currentEpoch + maxEpochsAhead - blobEndEpoch`
- If blob is already at max storage, shows "Already at maximum storage" message
- Extension via Move call: `walrus::system::extend_blob(system, blobObject, additionalEpochs)`
- Blob object ID found by scanning `BlobCertified` events on Sui
- Epoch info fetched from Walrus system state object (current epoch, max ahead, pricing)

**How to test:**
1. Upload a proof with a low epoch count (e.g., 1–5 epochs)
2. Go to My Proofs → click "Extend" on the proof
3. Slide the epoch slider → see cost estimate and new expiry
4. Confirm → wallet signs the extension transaction

### CR-11: Integrity Verification

**Files:** `frontend/components/map/ProofList.tsx` (`handleVerify`), `frontend/app/api/walrus/upload/route.ts`

- **At upload:** Server computes `SHA-256` of the exact bytes sent to Walrus → stored on-chain as `contentHash`
- **At verification:** Browser downloads blob from aggregator → computes `SHA-256` via `crypto.subtle.digest` → compares with on-chain hash
- Hash format: `sha256:<hex>`
- Match → green toast: "Integrity verified — hash matches on-chain record"
- Mismatch → red toast showing both hashes for comparison
- Blob not found → error toast: "Blob not found on Walrus"

**How to test:**
1. Go to the Live Map → click an event with submitted proofs
2. In the evidence panel, click "Verify" on any proof
3. Button shows "Checking..." while downloading and hashing
4. Result displayed as a toast notification

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Sui testnet wallet (e.g., Sui Wallet browser extension) with testnet SUI tokens
- (Optional) Anthropic API key for AI relevance scoring

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd immutable-witness/frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your values (see below)

# Run development server
npm run dev
```

### Environment Variables

```env
# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet

# Walrus Endpoints
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# Smart Contract (deployed on testnet)
NEXT_PUBLIC_CONTRACT_ADDRESS=0xe25047296dfdb147931004c8a07d44343d3e24971022cd2411bdf85f1e346aff
NEXT_PUBLIC_REGISTRY_OBJECT_ID=0x40c4fd83d3a558d0959b22637b8d5656c1052abcb0f6dda1a72094f943c46aa7

# GDELT (event data source)
GDELT_API_URL=http://api.gdeltproject.org/api/v2/events/search

# NewsAPI (optional, for additional event sources)
NEWS_API_KEY=

# Anthropic (optional — mock scores used when not set)
ANTHROPIC_API_KEY=
```

### Smart Contract

The Move contract is deployed on Sui testnet. To redeploy:

```bash
cd contracts/immutable_witness
sui client publish --gas-budget 100000000
```

Then update `NEXT_PUBLIC_CONTRACT_ADDRESS` and `NEXT_PUBLIC_REGISTRY_OBJECT_ID` in `.env.local` with the values from the publish output.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Maps | Leaflet + react-leaflet with marker clustering |
| Wallet | @mysten/dapp-kit (Sui Wallet Standard) |
| Storage | Walrus (Publisher + Aggregator HTTP APIs) |
| Blockchain | Sui Move smart contract |
| AI | Anthropic Claude (proof relevance scoring) |
| Data | GDELT Project + NewsAPI (conflict event feeds) |
| Hosting | Vercel |

---

## Project Structure

```
immutable-witness/
├── contracts/
│   └── immutable_witness/
│       └── sources/
│           └── immutable_witness.move    # Sui Move smart contract
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── walrus/
│   │   │   │   ├── upload/route.ts       # CR-1: Single blob upload
│   │   │   │   ├── quilt/route.ts        # CR-3: Batch upload (quilts)
│   │   │   │   ├── delete/route.ts       # CR-8: Blob deletion
│   │   │   │   ├── extend/route.ts       # CR-10: Epoch extension
│   │   │   │   ├── blob-info/route.ts    # CR-5: Blob metadata lookup
│   │   │   │   └── epoch/route.ts        # CR-10: Walrus epoch info
│   │   │   ├── events/route.ts           # GDELT event fetching
│   │   │   └── relevance/route.ts        # AI relevance scoring
│   │   ├── my-proofs/page.tsx            # CR-5, CR-8: Proof management
│   │   ├── history/page.tsx              # Historic events table
│   │   └── page.tsx                      # Live Map (main page)
│   ├── components/
│   │   ├── map/
│   │   │   ├── EventMap.tsx              # Leaflet map with clusters
│   │   │   ├── EventDrawer.tsx           # Event detail + proof list
│   │   │   └── ProofList.tsx             # CR-2, CR-11: Proof list + verify
│   │   ├── proof/
│   │   │   ├── ProofSubmissionModal.tsx  # Multi-step proof upload wizard
│   │   │   └── steps/
│   │   │       ├── StorageEstimate.tsx   # CR-9: Cost estimation UI
│   │   │       └── UploadStep.tsx        # Upload progress UI
│   │   └── proofs/
│   │       ├── ProofTable.tsx            # Proof table with actions
│   │       ├── ProofViewerModal.tsx      # CR-2, CR-4: Blob viewer
│   │       ├── EpochExtensionModal.tsx   # CR-10: Extend storage modal
│   │       └── StatsBar.tsx              # CR-5: Proof statistics
│   ├── hooks/
│   │   ├── useSubmitProof.ts             # CR-1, CR-7: Upload + on-chain reg
│   │   ├── useMyProofs.ts               # CR-5: Fetch user's proofs
│   │   ├── useProofsForEvent.ts          # CR-5: Proofs per event
│   │   ├── useRemoveProof.ts            # CR-8: Delete blob
│   │   └── useWalrusEpoch.ts            # CR-10: Epoch info hook
│   ├── lib/
│   │   └── walrus.ts                     # CR-1, CR-9: Upload, download, cost
│   └── types/
│       └── index.ts                      # Shared TypeScript interfaces
└── README.md
```
