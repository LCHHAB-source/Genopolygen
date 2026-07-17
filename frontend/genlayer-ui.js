const CONTRACT_ERRORS = {
    auction_still_open: "Auction bidding is still open. Settlement unlocks when the on-chain deadline passes.",
    auction_bidding_closed: "The on-chain auction deadline has passed. Settle the auction to continue.",
    auction_already_closed: "This auction has already been settled.",
    trades_paused_during_auction: "Trades are paused while an auction is active.",
    not_your_turn: "It is another player's turn.",
    host_only: "Only the room host can do that.",
    trade_target_only: "Only the player receiving this offer can answer it.",
    trade_already_resolved: "This trade has already been resolved.",
    insufficient_game_credits: "There are not enough game credits for this action.",
    invalid_phase_expected_roll: "Finish the current game decision before rolling again.",
};

function serialized(error) {
    try {
        return JSON.stringify(error);
    } catch {
        return "";
    }
}

export function fmtErr(error) {
    const code = error?.code ?? error?.cause?.code ?? error?.error?.code;
    if (Number(code) === 4001) return "Transaction rejected in the wallet.";

    const payload = [
        error?.shortMessage,
        error?.details,
        error?.cause?.shortMessage,
        error?.cause?.details,
        error?.cause?.message,
        error?.error?.message,
        error?.message,
        typeof error === "string" ? error : "",
        serialized(error),
    ].filter((value) => typeof value === "string" && value.trim()).join(" | ");

    for (const [needle, message] of Object.entries(CONTRACT_ERRORS)) {
        if (payload.includes(needle)) return message;
    }
    if (/insufficient funds/i.test(payload)) return "The wallet does not have enough GEN for this transaction.";
    if (/failed to fetch|network error|load failed/i.test(payload)) return "Studionet is unreachable right now. Check the network and try again.";
    if (/user rejected|user denied|request rejected/i.test(payload)) return "Transaction rejected in the wallet.";
    if (/timeout|timed out/i.test(payload)) return "The transaction is still pending on Studionet. Check its explorer link before retrying.";

    const first = payload.split(" | ").find((value) => value && value !== "[object Object]");
    return (first || "The transaction failed without a readable RPC reason.")
        .replace(/^Error:\s*/i, "")
        .slice(0, 260);
}

export function auctionSecondsLeft(closesAt, nowMs = Date.now()) {
    const deadline = Number(closesAt || 0) * 1000;
    if (!Number.isFinite(deadline) || deadline <= 0) return 0;
    return Math.max(0, Math.ceil((deadline - nowMs) / 1000));
}
