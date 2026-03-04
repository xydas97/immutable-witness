/// Module: immutable_witness
/// On-chain evidence registry for conflict-zone proof archival.
/// Each proof links a Walrus blob to a GDELT event with full chain of custody.
/// User-level queries are handled via emitted events (ProofSubmitted) — no on-chain UserRegistry needed.
module immutable_witness::immutable_witness;

use std::string::String;
use sui::table::{Self, Table};
use sui::object_table::{Self, ObjectTable};
use sui::event;

// ═══════════════════════════════════════════════════════════
// Error codes
// ═══════════════════════════════════════════════════════════

const EInvalidRelevanceScore: u64 = 0;
const EInvalidProofType: u64 = 1;
const EProofAlreadyExists: u64 = 2;
const ENotModerator: u64 = 3;
const ENotAdmin: u64 = 4;
const EScoreTooHigh: u64 = 5;
const EProofNotFound: u64 = 6;
const ENoProofsForSubmitter: u64 = 7;
const EEventNotFound: u64 = 8;
const EAlreadyModerator: u64 = 9;
const EModeratorNotFound: u64 = 10;

// ═══════════════════════════════════════════════════════════
// Structs
// ═══════════════════════════════════════════════════════════

/// Singleton shared object — the root of the entire registry.
/// Maps GDELT event IDs to IncidentEvent objects.
/// Holds moderator list — moderators can remove proofs with score < 75.
public struct EventRegistry has key {
    id: UID,
    admin: address,
    moderators: vector<address>,
    events: ObjectTable<String, IncidentEvent>,
    total_proofs: u64,
}

/// One per GDELT event. Holds all proofs grouped by submitter address.
public struct IncidentEvent has key, store {
    id: UID,
    gdelt_event_id: String,
    proofs: Table<address, vector<Proof>>,
    proof_count: u64,
}

/// Individual proof record — stored inside IncidentEvent.proofs.
public struct Proof has store, copy, drop {
    blob_id: String,
    content_hash: String,
    submitter: address,
    relevance_score: u8,
    proof_type: String,
    description: String,
    source_url: String,
    timestamp: u64,
}

// ═══════════════════════════════════════════════════════════
// Events (emitted for indexing — frontend uses these for queries)
// ═══════════════════════════════════════════════════════════

public struct IncidentCreated has copy, drop {
    gdelt_event_id: String,
}

/// Emitted on every proof submission. Frontend queries these by submitter
/// to build the "My Proofs" page without needing an on-chain user registry.
public struct ProofSubmitted has copy, drop {
    gdelt_event_id: String,
    blob_id: String,
    content_hash: String,
    submitter: address,
    relevance_score: u8,
    proof_type: String,
    description: String,
    timestamp: u64,
}

public struct ProofRemoved has copy, drop {
    gdelt_event_id: String,
    blob_id: String,
    submitter: address,
    removed_by: address,
}

public struct ModeratorAdded has copy, drop {
    moderator: address,
}

public struct ModeratorRemoved has copy, drop {
    moderator: address,
}

// ═══════════════════════════════════════════════════════════
// Init — creates the shared registry at publish time
// ═══════════════════════════════════════════════════════════

fun init(ctx: &mut TxContext) {
    let event_registry = EventRegistry {
        id: object::new(ctx),
        admin: ctx.sender(),
        moderators: vector::empty(),
        events: object_table::new(ctx),
        total_proofs: 0,
    };
    transfer::share_object(event_registry);
}

// ═══════════════════════════════════════════════════════════
// Admin functions
// ═══════════════════════════════════════════════════════════

/// Add a moderator. Only the admin (publisher) can call this.
public fun add_moderator(
    registry: &mut EventRegistry,
    moderator: address,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == registry.admin, ENotAdmin);

    let len = registry.moderators.length();
    let mut i = 0;
    while (i < len) {
        assert!(registry.moderators[i] != moderator, EAlreadyModerator);
        i = i + 1;
    };

    registry.moderators.push_back(moderator);
    event::emit(ModeratorAdded { moderator });
}

/// Remove a moderator. Only the admin can call this.
public fun remove_moderator(
    registry: &mut EventRegistry,
    moderator: address,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == registry.admin, ENotAdmin);

    let len = registry.moderators.length();
    let mut i = 0;
    let mut found = false;
    while (i < len) {
        if (registry.moderators[i] == moderator) {
            registry.moderators.swap_remove(i);
            found = true;
            break
        };
        i = i + 1;
    };
    assert!(found, EModeratorNotFound);
    event::emit(ModeratorRemoved { moderator });
}

// ═══════════════════════════════════════════════════════════
// Public functions
// ═══════════════════════════════════════════════════════════

/// Submit a proof for a GDELT event.
/// If the event doesn't exist in the registry yet, it is created automatically.
public fun submit_proof(
    registry: &mut EventRegistry,
    gdelt_event_id: String,
    blob_id: String,
    content_hash: String,
    relevance_score: u8,
    proof_type: String,
    description: String,
    source_url: String,
    timestamp: u64,
    ctx: &mut TxContext,
) {
    assert!(relevance_score <= 100, EInvalidRelevanceScore);
    assert!(is_valid_proof_type(&proof_type), EInvalidProofType);

    let submitter = ctx.sender();

    // Create the IncidentEvent if it doesn't exist yet
    if (!registry.events.contains(gdelt_event_id)) {
        let incident = IncidentEvent {
            id: object::new(ctx),
            gdelt_event_id: gdelt_event_id,
            proofs: table::new(ctx),
            proof_count: 0,
        };
        registry.events.add(gdelt_event_id, incident);
        event::emit(IncidentCreated { gdelt_event_id });
    };

    let incident = &mut registry.events[gdelt_event_id];

    let proof = Proof {
        blob_id,
        content_hash,
        submitter,
        relevance_score,
        proof_type,
        description,
        source_url,
        timestamp,
    };

    // Add to the submitter's vector in this incident
    if (!incident.proofs.contains(submitter)) {
        incident.proofs.add(submitter, vector::empty<Proof>());
    };

    let proofs_vec = &mut incident.proofs[submitter];

    // Check for duplicate blob_id under same submitter + event
    let len = proofs_vec.length();
    let mut i = 0;
    while (i < len) {
        assert!(proofs_vec[i].blob_id != blob_id, EProofAlreadyExists);
        i = i + 1;
    };

    proofs_vec.push_back(proof);
    incident.proof_count = incident.proof_count + 1;
    registry.total_proofs = registry.total_proofs + 1;

    event::emit(ProofSubmitted {
        gdelt_event_id,
        blob_id,
        content_hash,
        submitter,
        relevance_score,
        proof_type,
        description,
        timestamp,
    });
}

/// Remove a proof with relevance_score < 75. Only moderators or admin can call.
public fun remove_proof(
    registry: &mut EventRegistry,
    gdelt_event_id: String,
    submitter: address,
    blob_id: String,
    ctx: &mut TxContext,
) {
    let caller = ctx.sender();
    assert!(is_moderator_or_admin(registry, caller), ENotModerator);
    assert!(registry.events.contains(gdelt_event_id), EEventNotFound);

    let incident = &mut registry.events[gdelt_event_id];
    assert!(incident.proofs.contains(submitter), ENoProofsForSubmitter);

    let proofs_vec = &mut incident.proofs[submitter];

    let len = proofs_vec.length();
    let mut i = 0;
    let mut found = false;
    while (i < len) {
        if (proofs_vec[i].blob_id == blob_id) {
            assert!(proofs_vec[i].relevance_score < 75, EScoreTooHigh);
            proofs_vec.swap_remove(i);
            found = true;
            break
        };
        i = i + 1;
    };
    assert!(found, EProofNotFound);

    incident.proof_count = incident.proof_count - 1;
    registry.total_proofs = registry.total_proofs - 1;

    event::emit(ProofRemoved {
        gdelt_event_id,
        blob_id,
        submitter,
        removed_by: caller,
    });
}

// ═══════════════════════════════════════════════════════════
// Read functions
// ═══════════════════════════════════════════════════════════

public fun event_exists(registry: &EventRegistry, gdelt_event_id: String): bool {
    registry.events.contains(gdelt_event_id)
}

public fun total_proofs(registry: &EventRegistry): u64 {
    registry.total_proofs
}

public fun admin(registry: &EventRegistry): address {
    registry.admin
}

public fun moderators(registry: &EventRegistry): &vector<address> {
    &registry.moderators
}

public fun incident_proof_count(incident: &IncidentEvent): u64 {
    incident.proof_count
}

public fun incident_event_id(incident: &IncidentEvent): String {
    incident.gdelt_event_id
}

public fun get_proofs_for_submitter(incident: &IncidentEvent, submitter: address): &vector<Proof> {
    &incident.proofs[submitter]
}

public fun has_proofs_for_submitter(incident: &IncidentEvent, submitter: address): bool {
    incident.proofs.contains(submitter)
}

// ═══════════════════════════════════════════════════════════
// Proof field accessors
// ═══════════════════════════════════════════════════════════

public fun proof_blob_id(proof: &Proof): String { proof.blob_id }
public fun proof_content_hash(proof: &Proof): String { proof.content_hash }
public fun proof_submitter(proof: &Proof): address { proof.submitter }
public fun proof_relevance_score(proof: &Proof): u8 { proof.relevance_score }
public fun proof_type(proof: &Proof): String { proof.proof_type }
public fun proof_description(proof: &Proof): String { proof.description }
public fun proof_source_url(proof: &Proof): String { proof.source_url }
public fun proof_timestamp(proof: &Proof): u64 { proof.timestamp }

// ═══════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════

fun is_valid_proof_type(pt: &String): bool {
    let file = b"file".to_string();
    let url = b"url".to_string();
    let testimony = b"testimony".to_string();
    *pt == file || *pt == url || *pt == testimony
}

fun is_moderator_or_admin(registry: &EventRegistry, addr: address): bool {
    if (addr == registry.admin) return true;
    let len = registry.moderators.length();
    let mut i = 0;
    while (i < len) {
        if (registry.moderators[i] == addr) return true;
        i = i + 1;
    };
    false
}

// ═══════════════════════════════════════════════════════════
// Test-only helpers
// ═══════════════════════════════════════════════════════════

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
