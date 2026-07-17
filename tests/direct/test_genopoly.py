"""Executable Genopoly lifecycle tests using genlayer-test Direct Mode."""

import json
from pathlib import Path


CONTRACT = str(Path(__file__).resolve().parents[2] / "genopoly.py")


def _state(contract, room_id="1"):
    return json.loads(contract.get_game_state(room_id))


def _started_game(deploy, vm, alice, bob):
    vm.sender = alice
    contract = deploy(CONTRACT)
    room_id = contract.create_room("Alice")
    vm.sender = bob
    contract.join_room(room_id, "Bob")
    vm.sender = alice
    contract.start_game(room_id)
    return contract, room_id


def test_host_permissions_and_turn_order_execute(deploy, direct_vm, direct_alice, direct_bob):
    direct_vm.sender = direct_alice
    contract = deploy(CONTRACT)
    room_id = contract.create_room("Alice")
    direct_vm.sender = direct_bob
    contract.join_room(room_id, "Bob")

    with direct_vm.expect_revert("host_only"):
        contract.start_game(room_id)

    direct_vm.sender = direct_alice
    contract.start_game(room_id)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("not_your_turn"):
        contract.play_turn(room_id)


def test_roll_uses_transaction_seed_and_records_audit_commitment(deploy, direct_vm, direct_alice, direct_bob):
    contract, room_id = _started_game(deploy, direct_vm, direct_alice, direct_bob)
    direct_vm.warp("2026-07-16T12:00:00Z")
    direct_vm.sender = direct_alice
    contract.play_turn(room_id)

    state = _state(contract, room_id)
    assert 1 <= state["last_dice"] <= 6
    assert len(state["last_roll_commitment"]) == 64
    assert state["last_roll_at"] == 1784203200


def test_auction_deadline_blocks_early_close_and_late_bids(deploy, direct_vm, direct_alice, direct_bob):
    contract, room_id = _started_game(deploy, direct_vm, direct_alice, direct_bob)
    room = contract._load(room_id)
    room["phase"] = "property_decision"
    room["pending_property"] = 1
    contract._save(room)

    direct_vm.warp("2026-07-16T12:00:00Z")
    direct_vm.sender = direct_alice
    contract.skip_buy(room_id)
    direct_vm.sender = direct_bob
    contract.place_bid(room_id, 100)

    with direct_vm.expect_revert("auction_still_open"):
        contract.close_auction(room_id)

    direct_vm.warp("2026-07-16T12:02:01Z")
    with direct_vm.expect_revert("auction_bidding_closed"):
        contract.place_bid(room_id, 120)
    contract.close_auction(room_id)

    state = _state(contract, room_id)
    assert state["auction"]["active"] is False
    assert state["owners"]["Mediterranean Avenue"]["owner"] == "Bob"
    assert state["players"]["Bob"]["balance"] == 1400


def test_trade_settlement_checks_target_and_replay(deploy, direct_vm, direct_alice, direct_bob):
    contract, room_id = _started_game(deploy, direct_vm, direct_alice, direct_bob)
    direct_vm.sender = direct_alice
    contract.propose_trade(room_id, "Bob", [], 100, [])

    with direct_vm.expect_revert("trade_target_only"):
        contract.respond_trade(room_id, "1", True)

    direct_vm.sender = direct_bob
    contract.respond_trade(room_id, "1", True)
    state = _state(contract, room_id)
    assert state["players"]["Alice"]["balance"] == 1400
    assert state["players"]["Bob"]["balance"] == 1600

    with direct_vm.expect_revert("trade_already_resolved"):
        contract.respond_trade(room_id, "1", True)


def test_bankruptcy_finalizes_winner_once(deploy, direct_vm, direct_alice, direct_bob):
    contract, room_id = _started_game(deploy, direct_vm, direct_alice, direct_bob)
    room = contract._load(room_id)
    bob = contract._find_wallet(room, "Bob")
    room["current_turn_index"] = 1
    room["phase"] = "bankruptcy"
    room["game_state"]["player_stats"][bob]["balance"] = -1
    room["game_state"]["player_stats"][bob]["is_bankrupt_pending"] = True
    contract._save(room)

    direct_vm.sender = direct_bob
    contract.declare_bankruptcy(room_id)
    state = _state(contract, room_id)
    assert state["status"] == "finished"
    assert state["phase"] == "finished"
    assert state["winner"] == "Alice"
    assert state["players"]["Bob"]["is_active"] is False

    with direct_vm.expect_revert("game_not_active"):
        contract.declare_bankruptcy(room_id)


def test_ai_event_runs_through_mocked_validator_consensus(deploy, direct_vm, direct_alice, direct_bob):
    contract, room_id = _started_game(deploy, direct_vm, direct_alice, direct_bob)
    room = contract._load(room_id)
    alice = contract._find_wallet(room, "Alice")
    room["game_state"]["player_stats"][alice]["position"] = 1
    contract._save(room)

    # Force a six only to reach Chance; the AI settlement path itself is real.
    original_dice = contract._instance._dice
    contract._instance._dice = lambda _room, _actor: 6
    direct_vm.mock_llm(
        r"neutral event engine inside Genopoly",
        json.dumps({"type": "reward", "amount": 75, "narrative": "A community grant clears on schedule."}),
    )
    direct_vm.sender = direct_alice
    contract.play_turn(room_id)
    contract._instance._dice = original_dice

    state = _state(contract, room_id)
    assert state["ai_event_count"] == 1
    assert state["last_consensus_event"]["source"] == "validator_consensus"
    assert state["last_consensus_event"]["amount"] == 75
    assert state["players"]["Alice"]["balance"] == 1575
