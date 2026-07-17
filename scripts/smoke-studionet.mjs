import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

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

loadEnv(resolve(".env.studionet.local"));
const deployment = JSON.parse(readFileSync(resolve("deployment.json"), "utf8"));
const account = createAccount(process.env.STUDIONET_PRIVATE_KEY);
const client = createClient({ chain: studionet, account });
const transactions = {};

async function write(functionName, args) {
  const hash = await client.writeContract({ address: deployment.contractAddress, functionName, args, value: 0n });
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 3000, retries: 200 });
  const leaders = receipt?.consensus_data?.leader_receipt || [];
  const succeeded = leaders.some((entry) => entry?.execution_result === "SUCCESS" || entry?.result?.status === "return");
  if (!succeeded) {
    const detail = leaders.map((entry) => entry?.genvm_result?.stderr || JSON.stringify(entry?.result || {})).find(Boolean);
    throw new Error(`${functionName} finalized with contract error: ${detail || hash}`);
  }
  transactions[functionName] = hash;
  console.log(`${functionName}: ${hash}`);
  return hash;
}

await write("create_room", ["Deploy Check"]);
const roomsRaw = await client.readContract({
  address: deployment.contractAddress,
  functionName: "get_player_rooms",
  args: [account.address],
});
const rooms = typeof roomsRaw === "string" ? JSON.parse(roomsRaw) : roomsRaw;
if (!Array.isArray(rooms) || rooms.length === 0) throw new Error("create_room was not indexed");
const roomId = String(rooms[rooms.length - 1]);
const gameRaw = await client.readContract({ address: deployment.contractAddress, functionName: "get_game_state", args: [roomId] });
const game = typeof gameRaw === "string" ? JSON.parse(gameRaw) : gameRaw;
if (game.status !== "waiting" || game.host.toLowerCase() !== account.address.toLowerCase()) {
  throw new Error("unexpected room state");
}
await write("cancel_room", [roomId]);
const statsRaw = await client.readContract({ address: deployment.contractAddress, functionName: "get_protocol_stats", args: [] });
const stats = typeof statsRaw === "string" ? JSON.parse(statsRaw) : statsRaw;
if (stats.rooms < 1 || stats.board_tiles !== 40) throw new Error("protocol stats invariant failed");

deployment.smoke = {
  ...deployment.smoke,
  basicRoomId: roomId,
  basicCreateTx: transactions.create_room,
  basicCancelTx: transactions.cancel_room,
  basicResult: `Room ${roomId} created, indexed, read, and cancelled; ${stats.board_tiles}-tile invariant confirmed`,
};
writeFileSync(resolve("deployment.json"), `${JSON.stringify(deployment, null, 2)}\n`);
console.log(`SMOKE OK room=${roomId} rooms=${stats.rooms} board=${stats.board_tiles}`);
