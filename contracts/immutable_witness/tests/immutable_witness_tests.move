#[test_only]
module immutable_witness::immutable_witness_tests;

use std::string;
use sui::test_scenario::{Self as ts};
use immutable_witness::immutable_witness::{
    Self,
    EventRegistry,
};

const ADMIN: address = @0xAD;
const USER_A: address = @0xA;
const USER_B: address = @0xB;
const MODERATOR: address = @0xCD;

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

fun setup_registry(scenario: &mut ts::Scenario) {
    ts::next_tx(scenario, ADMIN);
    immutable_witness::init_for_testing(ts::ctx(scenario));
}

fun submit_test_proof(
    scenario: &mut ts::Scenario,
    sender: address,
    event_id: vector<u8>,
    blob_id: vector<u8>,
) {
    submit_test_proof_with_score(scenario, sender, event_id, blob_id, 85);
}

fun submit_test_proof_with_score(
    scenario: &mut ts::Scenario,
    sender: address,
    event_id: vector<u8>,
    blob_id: vector<u8>,
    score: u8,
) {
    ts::next_tx(scenario, sender);
    let mut registry = ts::take_shared<EventRegistry>(scenario);

    immutable_witness::submit_proof(
        &mut registry,
        string::utf8(event_id),
        string::utf8(blob_id),
        string::utf8(b"abc123hash"),
        score,
        string::utf8(b"file"),
        string::utf8(b"Test evidence"),
        string::utf8(b"https://example.com"),
        1700000000,
        ts::ctx(scenario),
    );

    ts::return_shared(registry);
}

// ═══════════════════════════════════════════════════════════
// Basic submission tests
// ═══════════════════════════════════════════════════════════

#[test]
fun test_submit_proof_creates_incident() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof(&mut scenario, USER_A, b"GDELT-001", b"blob-001");

    ts::next_tx(&mut scenario, USER_A);
    let registry = ts::take_shared<EventRegistry>(&scenario);

    assert!(immutable_witness::event_exists(&registry, string::utf8(b"GDELT-001")));
    assert!(immutable_witness::total_proofs(&registry) == 1);

    ts::return_shared(registry);
    ts::end(scenario);
}

#[test]
fun test_multiple_proofs_same_event_same_user() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof(&mut scenario, USER_A, b"GDELT-001", b"blob-001");
    submit_test_proof(&mut scenario, USER_A, b"GDELT-001", b"blob-002");

    ts::next_tx(&mut scenario, USER_A);
    let registry = ts::take_shared<EventRegistry>(&scenario);
    assert!(immutable_witness::total_proofs(&registry) == 2);

    ts::return_shared(registry);
    ts::end(scenario);
}

#[test]
fun test_multiple_users_same_event() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof(&mut scenario, USER_A, b"GDELT-001", b"blob-A");
    submit_test_proof(&mut scenario, USER_B, b"GDELT-001", b"blob-B");

    ts::next_tx(&mut scenario, ADMIN);
    let registry = ts::take_shared<EventRegistry>(&scenario);
    assert!(immutable_witness::total_proofs(&registry) == 2);

    ts::return_shared(registry);
    ts::end(scenario);
}

#[test]
fun test_proofs_across_events() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof(&mut scenario, USER_A, b"GDELT-001", b"blob-001");
    submit_test_proof(&mut scenario, USER_A, b"GDELT-002", b"blob-002");
    submit_test_proof(&mut scenario, USER_A, b"GDELT-003", b"blob-003");

    ts::next_tx(&mut scenario, USER_A);
    let registry = ts::take_shared<EventRegistry>(&scenario);

    assert!(immutable_witness::total_proofs(&registry) == 3);
    assert!(immutable_witness::event_exists(&registry, string::utf8(b"GDELT-001")));
    assert!(immutable_witness::event_exists(&registry, string::utf8(b"GDELT-002")));
    assert!(immutable_witness::event_exists(&registry, string::utf8(b"GDELT-003")));

    ts::return_shared(registry);
    ts::end(scenario);
}

#[test]
fun test_event_not_exists() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    ts::next_tx(&mut scenario, USER_A);
    let registry = ts::take_shared<EventRegistry>(&scenario);
    assert!(!immutable_witness::event_exists(&registry, string::utf8(b"NONEXISTENT")));

    ts::return_shared(registry);
    ts::end(scenario);
}

#[test]
fun test_same_blob_different_users_ok() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof(&mut scenario, USER_A, b"GDELT-001", b"blob-shared");
    submit_test_proof(&mut scenario, USER_B, b"GDELT-001", b"blob-shared");

    ts::next_tx(&mut scenario, ADMIN);
    let registry = ts::take_shared<EventRegistry>(&scenario);
    assert!(immutable_witness::total_proofs(&registry) == 2);

    ts::return_shared(registry);
    ts::end(scenario);
}

#[test]
fun test_boundary_relevance_scores() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof_with_score(&mut scenario, USER_A, b"EVT", b"blob-0", 0);
    submit_test_proof_with_score(&mut scenario, USER_A, b"EVT", b"blob-100", 100);

    ts::next_tx(&mut scenario, USER_A);
    let registry = ts::take_shared<EventRegistry>(&scenario);
    assert!(immutable_witness::total_proofs(&registry) == 2);
    ts::return_shared(registry);

    ts::end(scenario);
}

#[test]
fun test_all_proof_types() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    // file
    ts::next_tx(&mut scenario, USER_A);
    {
        let mut r = ts::take_shared<EventRegistry>(&scenario);
        immutable_witness::submit_proof(
            &mut r, string::utf8(b"E1"), string::utf8(b"b1"),
            string::utf8(b"h"), 50, string::utf8(b"file"),
            string::utf8(b"d"), string::utf8(b""), 0,
            ts::ctx(&mut scenario),
        );
        ts::return_shared(r);
    };

    // url
    ts::next_tx(&mut scenario, USER_A);
    {
        let mut r = ts::take_shared<EventRegistry>(&scenario);
        immutable_witness::submit_proof(
            &mut r, string::utf8(b"E1"), string::utf8(b"b2"),
            string::utf8(b"h"), 50, string::utf8(b"url"),
            string::utf8(b"d"), string::utf8(b""), 0,
            ts::ctx(&mut scenario),
        );
        ts::return_shared(r);
    };

    // testimony
    ts::next_tx(&mut scenario, USER_A);
    {
        let mut r = ts::take_shared<EventRegistry>(&scenario);
        immutable_witness::submit_proof(
            &mut r, string::utf8(b"E1"), string::utf8(b"b3"),
            string::utf8(b"h"), 50, string::utf8(b"testimony"),
            string::utf8(b"d"), string::utf8(b""), 0,
            ts::ctx(&mut scenario),
        );
        ts::return_shared(r);
    };

    ts::next_tx(&mut scenario, ADMIN);
    let r = ts::take_shared<EventRegistry>(&scenario);
    assert!(immutable_witness::total_proofs(&r) == 3);
    ts::return_shared(r);

    ts::end(scenario);
}

// ═══════════════════════════════════════════════════════════
// Validation failure tests
// ═══════════════════════════════════════════════════════════

#[test, expected_failure(abort_code = immutable_witness::EInvalidRelevanceScore)]
fun test_invalid_relevance_score() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof_with_score(&mut scenario, USER_A, b"GDELT-001", b"blob-bad", 101);

    ts::end(scenario);
}

#[test, expected_failure(abort_code = immutable_witness::EInvalidProofType)]
fun test_invalid_proof_type() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    ts::next_tx(&mut scenario, USER_A);
    let mut r = ts::take_shared<EventRegistry>(&scenario);

    immutable_witness::submit_proof(
        &mut r,
        string::utf8(b"GDELT-001"), string::utf8(b"blob-bad"),
        string::utf8(b"hash"), 50, string::utf8(b"invalid_type"),
        string::utf8(b"desc"), string::utf8(b""), 0,
        ts::ctx(&mut scenario),
    );

    ts::return_shared(r);
    ts::end(scenario);
}

#[test, expected_failure(abort_code = immutable_witness::EProofAlreadyExists)]
fun test_duplicate_blob_id() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof(&mut scenario, USER_A, b"GDELT-001", b"blob-dup");
    submit_test_proof(&mut scenario, USER_A, b"GDELT-001", b"blob-dup");

    ts::end(scenario);
}

// ═══════════════════════════════════════════════════════════
// Moderator tests
// ═══════════════════════════════════════════════════════════

#[test]
fun test_admin_can_add_moderator() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    ts::next_tx(&mut scenario, ADMIN);
    let mut r = ts::take_shared<EventRegistry>(&scenario);
    immutable_witness::add_moderator(&mut r, MODERATOR, ts::ctx(&mut scenario));
    assert!(immutable_witness::moderators(&r).length() == 1);

    ts::return_shared(r);
    ts::end(scenario);
}

#[test, expected_failure(abort_code = immutable_witness::ENotAdmin)]
fun test_non_admin_cannot_add_moderator() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    ts::next_tx(&mut scenario, USER_A);
    let mut r = ts::take_shared<EventRegistry>(&scenario);
    immutable_witness::add_moderator(&mut r, MODERATOR, ts::ctx(&mut scenario));

    ts::return_shared(r);
    ts::end(scenario);
}

#[test, expected_failure(abort_code = immutable_witness::EAlreadyModerator)]
fun test_cannot_add_duplicate_moderator() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    ts::next_tx(&mut scenario, ADMIN);
    let mut r = ts::take_shared<EventRegistry>(&scenario);
    immutable_witness::add_moderator(&mut r, MODERATOR, ts::ctx(&mut scenario));
    immutable_witness::add_moderator(&mut r, MODERATOR, ts::ctx(&mut scenario));

    ts::return_shared(r);
    ts::end(scenario);
}

#[test]
fun test_admin_can_remove_moderator() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    ts::next_tx(&mut scenario, ADMIN);
    let mut r = ts::take_shared<EventRegistry>(&scenario);
    immutable_witness::add_moderator(&mut r, MODERATOR, ts::ctx(&mut scenario));
    assert!(immutable_witness::moderators(&r).length() == 1);

    immutable_witness::remove_moderator(&mut r, MODERATOR, ts::ctx(&mut scenario));
    assert!(immutable_witness::moderators(&r).length() == 0);

    ts::return_shared(r);
    ts::end(scenario);
}

#[test, expected_failure(abort_code = immutable_witness::EModeratorNotFound)]
fun test_cannot_remove_nonexistent_moderator() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    ts::next_tx(&mut scenario, ADMIN);
    let mut r = ts::take_shared<EventRegistry>(&scenario);
    immutable_witness::remove_moderator(&mut r, MODERATOR, ts::ctx(&mut scenario));

    ts::return_shared(r);
    ts::end(scenario);
}

// ═══════════════════════════════════════════════════════════
// Proof removal tests
// ═══════════════════════════════════════════════════════════

#[test]
fun test_moderator_can_remove_low_score_proof() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    // Add moderator
    ts::next_tx(&mut scenario, ADMIN);
    {
        let mut r = ts::take_shared<EventRegistry>(&scenario);
        immutable_witness::add_moderator(&mut r, MODERATOR, ts::ctx(&mut scenario));
        ts::return_shared(r);
    };

    // User submits a low-score proof (score 40)
    submit_test_proof_with_score(&mut scenario, USER_A, b"GDELT-001", b"blob-low", 40);

    // Moderator removes it
    ts::next_tx(&mut scenario, MODERATOR);
    {
        let mut r = ts::take_shared<EventRegistry>(&scenario);
        immutable_witness::remove_proof(
            &mut r,
            string::utf8(b"GDELT-001"), USER_A, string::utf8(b"blob-low"),
            ts::ctx(&mut scenario),
        );
        assert!(immutable_witness::total_proofs(&r) == 0);
        ts::return_shared(r);
    };

    ts::end(scenario);
}

#[test]
fun test_admin_can_remove_low_score_proof() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof_with_score(&mut scenario, USER_A, b"GDELT-001", b"blob-low", 50);

    ts::next_tx(&mut scenario, ADMIN);
    {
        let mut r = ts::take_shared<EventRegistry>(&scenario);
        immutable_witness::remove_proof(
            &mut r,
            string::utf8(b"GDELT-001"), USER_A, string::utf8(b"blob-low"),
            ts::ctx(&mut scenario),
        );
        assert!(immutable_witness::total_proofs(&r) == 0);
        ts::return_shared(r);
    };

    ts::end(scenario);
}

#[test, expected_failure(abort_code = immutable_witness::EScoreTooHigh)]
fun test_cannot_remove_high_score_proof() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof_with_score(&mut scenario, USER_A, b"GDELT-001", b"blob-high", 75);

    ts::next_tx(&mut scenario, ADMIN);
    let mut r = ts::take_shared<EventRegistry>(&scenario);
    immutable_witness::remove_proof(
        &mut r,
        string::utf8(b"GDELT-001"), USER_A, string::utf8(b"blob-high"),
        ts::ctx(&mut scenario),
    );

    ts::return_shared(r);
    ts::end(scenario);
}

#[test]
fun test_remove_proof_score_74_boundary() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof_with_score(&mut scenario, USER_A, b"GDELT-001", b"blob-74", 74);

    ts::next_tx(&mut scenario, ADMIN);
    {
        let mut r = ts::take_shared<EventRegistry>(&scenario);
        immutable_witness::remove_proof(
            &mut r,
            string::utf8(b"GDELT-001"), USER_A, string::utf8(b"blob-74"),
            ts::ctx(&mut scenario),
        );
        assert!(immutable_witness::total_proofs(&r) == 0);
        ts::return_shared(r);
    };

    ts::end(scenario);
}

#[test, expected_failure(abort_code = immutable_witness::ENotModerator)]
fun test_regular_user_cannot_remove_proof() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof_with_score(&mut scenario, USER_A, b"GDELT-001", b"blob-low", 30);

    ts::next_tx(&mut scenario, USER_B);
    let mut r = ts::take_shared<EventRegistry>(&scenario);
    immutable_witness::remove_proof(
        &mut r,
        string::utf8(b"GDELT-001"), USER_A, string::utf8(b"blob-low"),
        ts::ctx(&mut scenario),
    );

    ts::return_shared(r);
    ts::end(scenario);
}

#[test, expected_failure(abort_code = immutable_witness::EEventNotFound)]
fun test_remove_proof_nonexistent_event() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    ts::next_tx(&mut scenario, ADMIN);
    let mut r = ts::take_shared<EventRegistry>(&scenario);
    immutable_witness::remove_proof(
        &mut r,
        string::utf8(b"NONEXISTENT"), USER_A, string::utf8(b"blob"),
        ts::ctx(&mut scenario),
    );

    ts::return_shared(r);
    ts::end(scenario);
}

#[test, expected_failure(abort_code = immutable_witness::EProofNotFound)]
fun test_remove_proof_nonexistent_blob() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof_with_score(&mut scenario, USER_A, b"GDELT-001", b"blob-real", 30);

    ts::next_tx(&mut scenario, ADMIN);
    let mut r = ts::take_shared<EventRegistry>(&scenario);
    immutable_witness::remove_proof(
        &mut r,
        string::utf8(b"GDELT-001"), USER_A, string::utf8(b"blob-wrong"),
        ts::ctx(&mut scenario),
    );

    ts::return_shared(r);
    ts::end(scenario);
}

#[test]
fun test_remove_one_proof_keeps_others() {
    let mut scenario = ts::begin(ADMIN);
    setup_registry(&mut scenario);

    submit_test_proof_with_score(&mut scenario, USER_A, b"GDELT-001", b"blob-low", 40);
    submit_test_proof_with_score(&mut scenario, USER_A, b"GDELT-001", b"blob-high", 90);

    ts::next_tx(&mut scenario, ADMIN);
    {
        let mut r = ts::take_shared<EventRegistry>(&scenario);
        immutable_witness::remove_proof(
            &mut r,
            string::utf8(b"GDELT-001"), USER_A, string::utf8(b"blob-low"),
            ts::ctx(&mut scenario),
        );
        assert!(immutable_witness::total_proofs(&r) == 1);
        ts::return_shared(r);
    };

    ts::end(scenario);
}
