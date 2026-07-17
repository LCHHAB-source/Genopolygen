import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";


const delay = (ms) => new Promise((done) => setTimeout(done, ms));
const PRIVATE_KEY_RE = /^0x[0-9a-fA-F]{64}$/;

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    const separator = value.indexOf("=");
    if (separator < 1) continue;
    const key = value.slice(0, separator).trim();
    const content = value.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (process.env[key] === undefined) process.env[key] = content;
  }
}

function keyFrom(path) {
  const content = readFileSync(path, "utf8");
  const key = content.match(/(?:STUDIONET_PRIVATE_KEY|DEPLOY_PRIVATE_KEY)=(0x[0-9a-fA-F]{64})/)?.[1];
  if (!PRIVATE_KEY_RE.test(key || "")) throw new Error(`Missing private key in ignored file ${path}`);
  return key;
}

loadEnv(resolve(".env.studionet.local"));
const deployment = JSON.parse(readFileSync(resolve("deployment.json"), "utf8"));
const host = createAccount(keyFrom(resolve(".env.studionet.local")));
const guest = createAccount(keyFrom(resolve(".env.studionet.secondary.local")));
const hostClient = createClient({ chain: studionet, account: host });
const guestClient = createClient({ chain: studionet, account: guest });
const clients = new Map([
  [host.address.toLowerCase(), hostClient],
  [guest.address.toLowerCase(), guestClient],
]);
const evidence = { happyPath: {}, permissionFailures: {}, auction: {}, trade: {}, aiEvent: {} };

async function submit(client, functionName, args) {
  return client.writeContract({
    address: deployment.contractAddress,
    functionName,
    args,
    value: 0n,
  });
}

async function finalized(client, hash, expectedError = "") {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 3000,
    retries: 240,
  });
  const leaderExecutions = receipt?.consensus_data?.leader_receipt || [];
  const executions = leaderExecutions.length > 0
    ? leaderExecutions
    : (receipt?.consensus_data?.validators || []);
  const succeeded = executions.some((entry) => entry?.execution_result === "SUCCESS"
    || entry?.result?.status === "return");
  const failed = receipt?.txExecutionResultName === "FINISHED_WITH_ERROR"
    || (!succeeded && executions.some((entry) => entry?.execution_result === "ERROR"
      || entry?.result?.status === "contract_error"));
  const detail = executions
    .map((entry) => entry?.genvm_result?.stderr || entry?.error || JSON.stringify(entry?.result || {}))
    .filter(Boolean)
    .join("\n");
  if (!failed && expectedError) throw new Error(`Expected ${expectedError}, but ${hash} succeeded`);
  if (failed && !expectedError) {
    throw new Error(`Unexpected contract failure in ${hash}: ${detail || "unknown error"}`);
  }
  if (failed && expectedError) {
    if (!detail.includes(expectedError)) {
      throw new Error(`Failure ${hash} did not include ${expectedError}: ${detail}`);
    }
  }
  return receipt;
}

async function write(client, functionName, args) {
  const hash = await submit(client, functionName, args);
  await finalized(client, hash);
  console.log(`PASS ${functionName}: ${hash}`);
  await delay(1500);
  return hash;
}

async function expectFailure(client, functionName, args, expectedError) {
  const hash = await submit(client, functionName, args);
  await finalized(client, hash, expectedError);
  console.log(`GUARD ${functionName} -> ${expectedError}: ${hash}`);
  await delay(1500);
  return hash;
}

async function state(roomId) {
  const raw = await hostClient.readContract({
    address: deployment.contractAddress,
    functionName: "get_game_state",
    args: [String(roomId)],
  });
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function latestHostRoom() {
  const raw = await hostClient.readContract({
    address: deployment.contractAddress,
    functionName: "get_player_rooms",
    args: [host.address],
  });
  const rooms = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(rooms) || rooms.length === 0) throw new Error("Host room index is empty");
  return String(rooms[rooms.length - 1]);
}

function clientFor(wallet) {
  const client = clients.get(String(wallet).toLowerCase());
  if (!client) throw new Error(`No smoke client for active wallet ${wallet}`);
  return client;
}

evidence.happyPath.create = await write(hostClient, "create_room", ["Review Host"]);
const roomId = await latestHostRoom();
evidence.permissionFailures.guestStart = await expectFailure(guestClient, "start_game", [roomId], "host_only");
evidence.happyPath.join = await write(guestClient, "join_room", [roomId, "Review Guest"]);
evidence.permissionFailures.joinedGuestStart = await expectFailure(guestClient, "start_game", [roomId], "host_only");
evidence.happyPath.start = await write(hostClient, "start_game", [roomId]);

evidence.trade.propose = await write(hostClient, "propose_trade", [roomId, "Review Guest", [], 100, []]);
evidence.permissionFailures.tradeSelfResponse = await expectFailure(hostClient, "respond_trade", [roomId, "1", true], "trade_target_only");
evidence.trade.accept = await write(guestClient, "respond_trade", [roomId, "1", true]);
evidence.permissionFailures.tradeReplay = await expectFailure(guestClient, "respond_trade", [roomId, "1", true], "trade_already_resolved");
let game = await state(roomId);
if (game.players["Review Host"].balance !== 1400 || game.players["Review Guest"].balance !== 1600) {
  throw new Error("Cash trade did not settle 1400/1600 atomically");
}

let auctionOpened = false;
for (let step = 0; step < 24 && !auctionOpened; step += 1) {
  game = await state(roomId);
  if (game.phase === "roll") {
    await write(clientFor(game.current_turn_wallet), "play_turn", [roomId]);
  } else if (game.phase === "property_decision") {
    const openerClient = clientFor(game.current_turn_wallet);
    evidence.auction.open = await write(openerClient, "skip_buy", [roomId]);
    auctionOpened = true;
  } else if (game.phase === "jail_decision") {
    await write(clientFor(game.current_turn_wallet), "pay_jail_fine", [roomId]);
  } else if (game.phase === "bankruptcy") {
    await write(clientFor(game.current_turn_wallet), "declare_bankruptcy", [roomId]);
  } else {
    throw new Error(`Unexpected phase while finding auction: ${game.phase}`);
  }
}
if (!auctionOpened) throw new Error("Could not reach an unowned property for auction proof");

game = await state(roomId);
const openerAddress = game.current_turn_wallet.toLowerCase();
const bidderClient = openerAddress === host.address.toLowerCase() ? guestClient : hostClient;
const openerClient = clientFor(openerAddress);
const bidderName = openerAddress === host.address.toLowerCase() ? "Review Guest" : "Review Host";
const bidderBalanceBefore = game.players[bidderName].balance;
const earlyCloseHash = await submit(openerClient, "close_auction", [roomId]);
const bidHash = await submit(bidderClient, "place_bid", [roomId, 100]);
await Promise.all([
  finalized(openerClient, earlyCloseHash, "auction_still_open"),
  finalized(bidderClient, bidHash),
]);
evidence.permissionFailures.earlyAuctionClose = earlyCloseHash;
evidence.auction.bid = bidHash;
console.log(`GUARD close_auction -> auction_still_open: ${earlyCloseHash}`);
console.log(`PASS place_bid: ${bidHash}`);

game = await state(roomId);
const waitMs = Math.max(0, (Number(game.auction.closes_at) * 1000) - Date.now() + 2000);
if (waitMs > 0) await delay(waitMs);
evidence.permissionFailures.lateBid = await expectFailure(openerClient, "place_bid", [roomId, 120], "auction_bidding_closed");
evidence.auction.close = await write(bidderClient, "close_auction", [roomId]);
game = await state(roomId);
if (game.players[bidderName].balance !== bidderBalanceBefore - 100) {
  throw new Error("Auction winner balance did not decrease by the winning bid");
}
if (!Object.values(game.owners).some((item) => item.owner === bidderName)) {
  throw new Error("Auction winner did not receive on-chain ownership");
}
evidence.auction.winner = bidderName;
evidence.auction.balanceBefore = bidderBalanceBefore;
evidence.auction.balanceAfter = game.players[bidderName].balance;

let consensusEvent = game.last_consensus_event || {};
for (let step = 0; step < 32 && consensusEvent.source !== "validator_consensus"; step += 1) {
  game = await state(roomId);
  if (game.status !== "playing") break;
  const activeClient = clientFor(game.current_turn_wallet);
  if (game.phase === "roll") {
    const before = Number(game.ai_event_count || 0);
    const hash = await write(activeClient, "play_turn", [roomId]);
    const fresh = await state(roomId);
    if (Number(fresh.ai_event_count || 0) > before) {
      evidence.aiEvent.roll = hash;
      consensusEvent = fresh.last_consensus_event || {};
    }
  } else if (game.phase === "property_decision") {
    await write(activeClient, "buy_property", [roomId]);
  } else if (game.phase === "jail_decision") {
    await write(activeClient, "pay_jail_fine", [roomId]);
  } else if (game.phase === "bankruptcy") {
    await write(activeClient, "declare_bankruptcy", [roomId]);
  } else if (game.phase === "auction") {
    const remaining = Math.max(0, (Number(game.auction.closes_at) * 1000) - Date.now() + 2000);
    if (remaining > 0) await delay(remaining);
    await write(activeClient, "close_auction", [roomId]);
  } else {
    throw new Error(`Unexpected phase during AI proof: ${game.phase}`);
  }
}
if (consensusEvent.source !== "validator_consensus") {
  throw new Error("No live validator-consensus board event was observed within 32 turns");
}
evidence.aiEvent.result = consensusEvent;

const statsRaw = await hostClient.readContract({
  address: deployment.contractAddress,
  functionName: "get_protocol_stats",
  args: [],
});
const stats = typeof statsRaw === "string" ? JSON.parse(statsRaw) : statsRaw;
if (stats.version !== "2.3.0" || stats.auction_duration_seconds !== 120) {
  throw new Error("Deployed protocol metadata is not v2.3.0");
}

deployment.smoke = {
  ...deployment.smoke,
  reviewerRoomId: roomId,
  reviewerEvidence: evidence,
  reviewerResult: "Hosted two-wallet lifecycle verified: permissions, atomic trade, auction maturity/late-bid guards, ownership settlement, and live AI consensus event.",
  reviewerVerifiedAt: new Date().toISOString(),
};
writeFileSync(resolve("deployment.json"), `${JSON.stringify(deployment, null, 2)}\n`);
console.log(`REVIEWER SMOKE OK room=${roomId} contract=${deployment.contractAddress}`);
