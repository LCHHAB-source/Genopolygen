# Genopoly

**A four-player property strategy game whose rooms, turns, ownership, auctions, trades, and outcomes settle in GenLayer Studio.**

[Studionet contract](https://explorer-studio.genlayer.com/address/0x179D56c4eC5b8bE824b9d426F239606D44E8788b) | [Deployment transaction](https://explorer-studio.genlayer.com/tx/0x8870715a050de06134222bb35a5fe6ea6fd08439e568c0b7abefb811d0b5e7b9)

## The game

Genopoly keeps the familiar forty-tile property loop, but the game authority is an Intelligent Contract rather than a browser session or private server. A wallet opens a room, other wallets join it, and every move is finalized on Studionet before the interface advances.

- Two to four real wallet participants per room
- Canonical `roll`, `property_decision`, `auction`, `jail_decision`, and `bankruptcy` phases
- Integer game-credit economy: 1,500 starting credits, 200 for passing GO, consistent prices and rents
- Color-set upgrades, even-building rules, utilities, railroads, taxes, jail, liquidation, and end-game settlement
- Caller-authenticated bids with no bot or bidder impersonation path
- Two-minute auction deadlines enforced from GenLayer transaction time, with late bids and early settlement rejected on-chain
- Transaction-seeded dice rolls with a public commitment and timestamp recorded for every turn
- Two-party trade proposals that transfer assets only after the target wallet accepts and the contract revalidates ownership
- GenLayer comparative-consensus Chance and Community Chest events with bounded, deterministic fallback behavior

Game credits are accounting units inside the contract. They are not GEN tokens and cannot be withdrawn. Studionet provides the hosted development environment and gasless EVM-compatible wallet flow.

## On-chain deployment

| Field | Value |
| --- | --- |
| Network | GenLayer Studionet |
| Chain ID | `61999` (`0xf22f`) |
| RPC | `https://studio.genlayer.com/api` |
| Contract | `0x179D56c4eC5b8bE824b9d426F239606D44E8788b` |
| Deployer | `0x0CC3eb1475c0E1a414dc3B4Ba521762507C99aAD` |
| Contract source | [`genopoly.py`](./genopoly.py) |
| Deployment record | [`deployment.json`](./deployment.json) |

The public deployment record includes the deploy transaction, funding provenance, and smoke-test transaction hashes. Private keys and wallet secrets are intentionally absent from this repository.

## Verification record

The v2.3 deployment was exercised with two independent Studionet wallets. The hosted run created room `4`, settled a cash trade, proved both auction time guards, transferred the auctioned property, and reached a validator-consensus Chance event.

| Check | Finalized transaction |
| --- | --- |
| Trade accepted and settled atomically | [`0x2cfe...c75f`](https://explorer-studio.genlayer.com/tx/0x2cfefef7575a3ab83cf8b9272087213f34e9b893c7d54f32d6fc0f94710bc75f) |
| Early auction close rejected | [`0x35f8...82f6`](https://explorer-studio.genlayer.com/tx/0x35f8f97842333b0b8aec6b0120e5df0f48a89f25fdaf408667550a0297382f6a) |
| Late auction bid rejected | [`0xf3f3...ba90`](https://explorer-studio.genlayer.com/tx/0xf3f326c4c71d5a909e0d4013eb7058f8c5991380732cbc0377b8c7907b35ba90) |
| Auction ownership and 100-credit payment settled | [`0x063d...8d6a`](https://explorer-studio.genlayer.com/tx/0x063d511d3b00919cbbc70872c9a67cd4c4646dc799912f26daffabc7361e8d6a) |
| Chance event settled by validator consensus | [`0x386c...a40`](https://explorer-studio.genlayer.com/tx/0x386c7b75dd0f6ca37364ce7ebef331875664582694761a0f850aa29e66f7ba40) |

The complete machine-readable record, including permission failures and balance checks, is in [`deployment.json`](./deployment.json).

## Contract surface

The write API covers the complete multiplayer lifecycle:

```text
create_room       join_room          leave_room
cancel_room       start_game         play_turn
buy_property      skip_buy           place_bid
close_auction     upgrade_property   liquidate_asset
pay_jail_fine     skip_jail_turn     declare_bankruptcy
propose_trade     respond_trade      cancel_trade
```

Read methods expose room state, activity, trades, player room indexes, recent rooms, and aggregate protocol statistics. The browser uses `genlayer-js` for both reads and wallet-signed writes; it contains no custom unsigned `call_contract` bridge and no unrelated token-transfer workaround.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL, connect an injected EVM wallet, and approve GenLayer Studionet (`61999`). Use a different wallet or browser profile for each player.

Production build and executable contract tests:

```bash
npm test
npm run build
```

## Deploy and verify

Create an ignored `.env.studionet.local` from [`.env.example`](./.env.example), fund the deployer with the Studio faucet, then run:

```bash
npm run deploy:studionet
npm run smoke:studionet
```

`npm test` runs browser utility tests plus GenLayer Direct Mode lifecycle tests for caller permissions, seeded roll auditing, auction maturity, trade replay protection, bankruptcy settlement, and mocked validator consensus. `npm run smoke:reviewer` uses two ignored local wallets for hosted Studionet verification and never prints either key.

## Repository map

```text
genopoly.py                  canonical Intelligent Contract
frontend/                    existing game interface and board renderer
scripts/deploy-studionet.mjs key-safe deployment script
scripts/smoke-*.mjs          hosted Studionet lifecycle verification
tests/direct/                executable GenLayer Direct Mode lifecycle tests
tests/ui.test.mjs            error decoding and auction deadline tests
deployment.json              public deployment and smoke evidence
contracts/legacy_genopoly.py pre-v2 contract retained for comparison
```

## Security notes

- Every state-changing game action is authenticated by `gl.message.sender_address`.
- Turn and phase checks are enforced in the contract, not inferred by the interface.
- Auctions never accept a caller-supplied bidder identity.
- Auction closure is impossible before the stored deadline, late bids are rejected, and trades pause until auction settlement.
- Trade acceptance rechecks balances, ownership, duplicates, and building levels before atomic settlement.
- Activity and trade history are bounded to prevent unbounded room growth.
- Player names are length-limited and character-restricted before they enter public state.
- `.env*`, vault files, wallet exports, build output, and private-key material are excluded from Git.

Genopoly is testnet software. Do not use a production wallet or real funds.
