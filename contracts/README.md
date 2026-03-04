# Immutable Witness — Sui Move Contracts

On-chain evidence registry for conflict-zone proof archival. Links Walrus blob storage to GDELT events with cryptographic chain of custody.

## Architecture

```
EventRegistry (shared singleton, created at publish)
├── admin: address                          # publisher, can manage moderators
├── moderators: vector<address>             # can remove low-score proofs
├── total_proofs: u64
└── events: ObjectTable<String, IncidentEvent>
    │
    └── IncidentEvent (one per GDELT event, created on first proof)
        ├── gdelt_event_id: String
        ├── proof_count: u64
        └── proofs: Table<address, vector<Proof>>
            │
            └── Proof
                ├── blob_id: String         # Walrus blob ID
                ├── content_hash: String    # SHA-256 of original file
                ├── submitter: address
                ├── relevance_score: u8     # 0-100, from Claude AI
                ├── proof_type: String      # "file" | "url" | "testimony"
                ├── description: String
                ├── source_url: String
                └── timestamp: u64
```

There is **no on-chain UserRegistry**. Per-user proof lookups are done by querying `ProofSubmitted` events (see [Frontend Integration](#frontend-integration)).

## Functions

### `submit_proof`

Submits evidence for a GDELT event. If the event doesn't exist yet, it creates the `IncidentEvent` automatically.

```
submit_proof(
    registry: &mut EventRegistry,
    gdelt_event_id: String,
    blob_id: String,
    content_hash: String,
    relevance_score: u8,       // 0-100
    proof_type: String,        // "file" | "url" | "testimony"
    description: String,
    source_url: String,
    timestamp: u64,            // epoch ms
    ctx: &mut TxContext,
)
```

Validations:
- `relevance_score` must be <= 100
- `proof_type` must be one of `file`, `url`, `testimony`
- Duplicate `blob_id` per submitter+event is rejected

Emits: `IncidentCreated` (if new event), `ProofSubmitted`

### `remove_proof`

Moderators or admin can remove proofs with `relevance_score < 75`.

```
remove_proof(
    registry: &mut EventRegistry,
    gdelt_event_id: String,
    submitter: address,
    blob_id: String,
    ctx: &mut TxContext,
)
```

Validations:
- Caller must be admin or moderator (`ENotModerator`)
- Event must exist (`EEventNotFound`)
- Submitter must have proofs for the event (`ENoProofsForSubmitter`)
- Proof must exist (`EProofNotFound`)
- Score must be < 75 (`EScoreTooHigh`) — proofs with score >= 75 cannot be removed

Emits: `ProofRemoved`

### `add_moderator` / `remove_moderator`

Admin-only. Manage the moderator list on the `EventRegistry`.

```
add_moderator(registry: &mut EventRegistry, moderator: address, ctx: &mut TxContext)
remove_moderator(registry: &mut EventRegistry, moderator: address, ctx: &mut TxContext)
```

Emits: `ModeratorAdded` / `ModeratorRemoved`

### Read functions

| Function | Returns |
|---|---|
| `event_exists(registry, gdelt_event_id)` | `bool` |
| `total_proofs(registry)` | `u64` |
| `admin(registry)` | `address` |
| `moderators(registry)` | `&vector<address>` |
| `incident_proof_count(incident)` | `u64` |
| `incident_event_id(incident)` | `String` |
| `get_proofs_for_submitter(incident, addr)` | `&vector<Proof>` |
| `has_proofs_for_submitter(incident, addr)` | `bool` |

## Emitted Events

The contract emits Move events that can be queried by the frontend via `SuiClient.queryEvents()`.

### `ProofSubmitted`
```
{
    gdelt_event_id: String,
    blob_id: String,
    content_hash: String,
    submitter: address,
    relevance_score: u8,
    proof_type: String,
    description: String,
    timestamp: u64,
}
```

### `ProofRemoved`
```
{
    gdelt_event_id: String,
    blob_id: String,
    submitter: address,
    removed_by: address,
}
```

### `IncidentCreated`
```
{ gdelt_event_id: String }
```

### `ModeratorAdded` / `ModeratorRemoved`
```
{ moderator: address }
```

## Error Codes

| Code | Constant | Meaning |
|---|---|---|
| 0 | `EInvalidRelevanceScore` | Score > 100 |
| 1 | `EInvalidProofType` | Not `file`, `url`, or `testimony` |
| 2 | `EProofAlreadyExists` | Same blob_id by same submitter for same event |
| 3 | `ENotModerator` | Caller is not admin or moderator |
| 4 | `ENotAdmin` | Caller is not admin |
| 5 | `EScoreTooHigh` | Cannot remove proof with score >= 75 |
| 6 | `EProofNotFound` | blob_id not found in submitter's proofs |
| 7 | `ENoProofsForSubmitter` | Submitter has no proofs for this event |
| 8 | `EEventNotFound` | GDELT event ID not in registry |
| 9 | `EAlreadyModerator` | Address is already a moderator |
| 10 | `EModeratorNotFound` | Address is not in moderator list |

## Frontend Integration

### Submitting a proof (PTB)

```typescript
import { Transaction } from '@mysten/sui/transactions';

const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::immutable_witness::submit_proof`,
  arguments: [
    tx.object(REGISTRY_OBJECT_ID),       // EventRegistry shared object
    tx.pure.string(gdeltEventId),
    tx.pure.string(walrusBlobId),
    tx.pure.string(sha256Hash),
    tx.pure.u8(relevanceScore),
    tx.pure.string(proofType),           // "file" | "url" | "testimony"
    tx.pure.string(description),
    tx.pure.string(sourceUrl),
    tx.pure.u64(Date.now()),
  ],
});
```

### Querying user's proofs (via events)

```typescript
const { data } = await suiClient.queryEvents({
  query: {
    MoveEventType: `${PACKAGE_ID}::immutable_witness::ProofSubmitted`,
  },
  // Filter client-side by submitter field, or paginate through all
});

const myProofs = data.filter(e => e.parsedJson.submitter === walletAddress);
```

### Reading an IncidentEvent's proofs

Read the `EventRegistry` object, then use dynamic field access to get specific `IncidentEvent` objects by GDELT event ID.

## Build & Test

```bash
cd contracts/immutable_witness

# Build
sui move build

# Run tests (24 tests)
sui move test

# Publish to testnet
sui client switch --env testnet
sui client publish --gas-budget 100000000
```

After publishing, save the package ID and `EventRegistry` object ID to `contracts/deployed.json`:

```json
{
  "packageAddress": "0x...",
  "registryObjectId": "0x..."
}
```

The `EventRegistry` object ID can be found in the publish transaction's created objects — it's the shared object of type `EventRegistry`.

## Test Coverage

24 tests covering:
- Proof submission (creates incident, multiple proofs, multiple users, cross-event)
- Input validation (score bounds, proof types, duplicates)
- Moderator management (add, remove, admin-only, duplicates)
- Proof removal (moderator/admin, score < 75 gate, boundary at 74/75, non-moderator rejection, nonexistent event/blob, partial removal)
