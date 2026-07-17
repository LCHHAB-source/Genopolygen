import assert from "node:assert/strict";
import test from "node:test";

import { auctionSecondsLeft, fmtErr } from "../frontend/genlayer-ui.js";


test("fmtErr unwraps nested wallet and RPC failures", () => {
  assert.equal(fmtErr({ code: 4001 }), "Transaction rejected in the wallet.");
  assert.equal(
    fmtErr({ cause: { details: { message: "ignored" }, message: "execution reverted: auction_still_open" } }),
    "Auction bidding is still open. Settlement unlocks when the on-chain deadline passes.",
  );
  assert.equal(
    fmtErr({ error: { message: "insufficient funds for gas" } }),
    "The wallet does not have enough GEN for this transaction.",
  );
  assert.notEqual(fmtErr({ unexpected: { value: 1 } }), "[object Object]");
});


test("auction countdown is derived from the contract deadline", () => {
  const now = Date.parse("2026-07-16T12:00:00Z");
  assert.equal(auctionSecondsLeft(1784203320, now), 120);
  assert.equal(auctionSecondsLeft(1784203200, now), 0);
  assert.equal(auctionSecondsLeft(0, now), 0);
});
