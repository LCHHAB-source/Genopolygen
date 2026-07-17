// ===== GENOPOLY - 40-Tile Official Monopoly Board =====
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { auctionSecondsLeft, fmtErr } from "./genlayer-ui.js";

const CONFIG = {
    rpcEndpoint: "https://studio.genlayer.com/api",
    contractAddress: "0x179D56c4eC5b8bE824b9d426F239606D44E8788b",
    explorerBase: "https://explorer-studio.genlayer.com",
    pollingInterval: 3000,
};

const METHOD_ARGS = {
    create_room: ["player_name"], join_room: ["room_id", "player_name"],
    leave_room: ["room_id"], cancel_room: ["room_id"], start_game: ["room_id"],
    play_turn: ["room_id"], buy_property: ["room_id"], skip_buy: ["room_id"],
    place_bid: ["room_id", "amount"], close_auction: ["room_id"],
    upgrade_property: ["room_id", "tile_index"], liquidate_asset: ["room_id", "tile_index"],
    pay_jail_fine: ["room_id"], skip_jail_turn: ["room_id"], declare_bankruptcy: ["room_id"],
    propose_trade: ["room_id", "target", "offer_tiles", "offer_cash", "want_tiles"],
    respond_trade: ["room_id", "trade_id", "accept"], cancel_trade: ["room_id", "trade_id"],
    get_game_state: ["room_id"], get_room: ["room_id"], get_room_activity: ["room_id"],
    get_trade: ["room_id", "trade_id"], get_player_rooms: ["wallet"],
    get_recent_rooms: ["limit"], get_protocol_stats: [], get_room_count: [],
};

const readClient = createClient({ chain: studionet, account: createAccount() });

function orderedArgs(fn, values = {}) {
    const names = METHOD_ARGS[fn];
    if (!names) throw new Error(`Unsupported contract method: ${fn}`);
    return names.map((name) => values[name]);
}

function setChainHealth(label, mode = "live") {
    const health = document.getElementById("chainHealth");
    const text = document.getElementById("chainHealthLabel");
    if (!health || !text) return;
    health.classList.toggle("is-live", mode === "live");
    health.classList.toggle("is-error", mode === "error");
    text.textContent = label;
}

function setTransactionStatus(label, hash = "") {
    const link = document.getElementById("transactionLink");
    if (!link) return;
    if (!hash) {
        link.classList.add("hidden");
        return;
    }
    link.href = `${CONFIG.explorerBase}/tx/${hash}`;
    link.textContent = `${label} ${hash.slice(0, 8)}...${hash.slice(-4)}`;
    link.classList.remove("hidden");
}

class RPC {
    constructor() { this.endpoint = CONFIG.rpcEndpoint; this.contract = CONFIG.contractAddress; this.identity = null; }
    setIdentity(n) { this.identity = n; }
    async call(fn, args = {}) {
        let hash = "";
        try {
            setChainHealth("Awaiting wallet approval", "pending");
            const client = await getWriteClient();
            hash = await client.writeContract({
                address: this.contract,
                functionName: fn,
                args: orderedArgs(fn, args),
                value: 0n,
            });
            setTransactionStatus("Submitted", hash);
            setChainHealth("Transaction pending", "pending");
            feed(`Transaction submitted: ${hash.slice(0, 10)}...`, "system");
            const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED", interval: 3000, retries: 240 });
            const leaderExecutions = receipt?.consensus_data?.leader_receipt || [];
            const executions = leaderExecutions.length > 0
                ? leaderExecutions
                : (receipt?.consensus_data?.validators || []);
            const succeeded = executions.some((entry) => entry?.execution_result === "SUCCESS"
                || entry?.result?.status === "return");
            const failed = receipt?.txExecutionResultName === "FINISHED_WITH_ERROR"
                || (!succeeded && executions.some((entry) => entry?.execution_result === "ERROR"
                    || entry?.result?.status === "contract_error"));
            if (failed) {
                const traceMessage = executions
                    .map((entry) => entry?.genvm_result?.stderr || entry?.error || "")
                    .find(Boolean) || "Contract execution reverted.";
                throw new Error(traceMessage);
            }
            setTransactionStatus("Finalized", hash);
            setChainHealth("Studionet finalized", "live");
            feed(`Finalized on Studionet: ${hash.slice(0, 10)}...`, "system");

            if (fn === "create_room") {
                const raw = await this.read("get_player_rooms", { wallet: walletAddress });
                const rooms = typeof raw === "string" ? JSON.parse(raw) : raw;
                if (!Array.isArray(rooms) || rooms.length === 0) throw new Error("Room was finalized but could not be indexed.");
                return String(rooms[rooms.length - 1]);
            }
            if (args.room_id !== undefined) {
                const raw = await this.read("get_game_state", { room_id: String(args.room_id) });
                if (raw) {
                    const current = typeof raw === "string" ? JSON.parse(raw) : raw;
                    return current.log || hash;
                }
            }
            return hash;
        } catch (error) {
            const message = fmtErr(error);
            setChainHealth("Transaction failed", "error");
            if (hash) setTransactionStatus("Inspect failed tx", hash);
            throw new Error(message, { cause: error });
        }
    }
    async read(fn, args = {}) {
        try {
            const result = await readClient.readContract({
                address: this.contract,
                functionName: fn,
                args: orderedArgs(fn, args),
            });
            setChainHealth("Studionet live", "live");
            return result;
        } catch (err) {
            console.warn(`[GenLayer read:${fn}]`, err);
            setChainHealth("Studionet read unavailable", "error");
            return null;
        }
    }
}

// ===== 40-TILE BOARD =====
const BOARD = [
    { name: "GO", icon: "🏁", type: "start", price: 0, group: "corner", color: "#4caf50" },
    { name: "Mediterranean Avenue", icon: "🏠", type: "property", price: 60, group: "brown", color: "#8B4513" },
    { name: "Community Chest", icon: "📦", type: "community", price: 0, group: "action", color: "#f5f5dc" },
    { name: "Baltic Avenue", icon: "🏠", type: "property", price: 60, group: "brown", color: "#8B4513" },
    { name: "Income Tax", icon: "💸", type: "tax", price: 0, group: "tax", color: "#808080" },
    { name: "Reading Railroad", icon: "🚂", type: "property", price: 200, group: "station", color: "#333333" },
    { name: "Oriental Avenue", icon: "🏠", type: "property", price: 100, group: "lightblue", color: "#87CEEB" },
    { name: "Chance", icon: "❓", type: "ai_event", price: 0, group: "chance", color: "#FF8C00" },
    { name: "Vermont Avenue", icon: "🏠", type: "property", price: 100, group: "lightblue", color: "#87CEEB" },
    { name: "Connecticut Avenue", icon: "🏠", type: "property", price: 120, group: "lightblue", color: "#87CEEB" },
    { name: "Jail / Just Visiting", icon: "🚔", type: "jail", price: 0, group: "corner", color: "#ff8a65" },
    { name: "St. Charles Place", icon: "🏠", type: "property", price: 140, group: "pink", color: "#FF69B4" },
    { name: "Electric Company", icon: "⚡", type: "property", price: 150, group: "utility", color: "#D3D3D3" },
    { name: "States Avenue", icon: "🏠", type: "property", price: 140, group: "pink", color: "#FF69B4" },
    { name: "Virginia Avenue", icon: "🏠", type: "property", price: 160, group: "pink", color: "#FF69B4" },
    { name: "Pennsylvania Railroad", icon: "🚂", type: "property", price: 200, group: "station", color: "#333333" },
    { name: "St. James Place", icon: "🏠", type: "property", price: 180, group: "orange", color: "#FF8C00" },
    { name: "Community Chest", icon: "📦", type: "community", price: 0, group: "action", color: "#f5f5dc" },
    { name: "Tennessee Avenue", icon: "🏠", type: "property", price: 180, group: "orange", color: "#FF8C00" },
    { name: "New York Avenue", icon: "🏠", type: "property", price: 200, group: "orange", color: "#FF8C00" },
    { name: "Free Parking", icon: "🚗", type: "free", price: 0, group: "corner", color: "#ef5350" },
    { name: "Kentucky Avenue", icon: "🏠", type: "property", price: 220, group: "red", color: "#DC143C" },
    { name: "Chance", icon: "❓", type: "ai_event", price: 0, group: "chance", color: "#FF8C00" },
    { name: "Indiana Avenue", icon: "🏠", type: "property", price: 220, group: "red", color: "#DC143C" },
    { name: "Illinois Avenue", icon: "🏠", type: "property", price: 240, group: "red", color: "#DC143C" },
    { name: "B. & O. Railroad", icon: "🚂", type: "property", price: 200, group: "station", color: "#333333" },
    { name: "Atlantic Avenue", icon: "🏠", type: "property", price: 260, group: "yellow", color: "#FFD700" },
    { name: "Ventnor Avenue", icon: "🏠", type: "property", price: 260, group: "yellow", color: "#FFD700" },
    { name: "Water Works", icon: "💧", type: "property", price: 150, group: "utility", color: "#D3D3D3" },
    { name: "Marvin Gardens", icon: "🏠", type: "property", price: 280, group: "yellow", color: "#FFD700" },
    { name: "Go To Jail", icon: "🚨", type: "go_to_jail", price: 0, group: "corner", color: "#ff7043" },
    { name: "Pacific Avenue", icon: "🏠", type: "property", price: 300, group: "green", color: "#228B22" },
    { name: "North Carolina Avenue", icon: "🏠", type: "property", price: 300, group: "green", color: "#228B22" },
    { name: "Community Chest", icon: "📦", type: "community", price: 0, group: "action", color: "#f5f5dc" },
    { name: "Pennsylvania Avenue", icon: "🏠", type: "property", price: 320, group: "green", color: "#228B22" },
    { name: "Short Line Railroad", icon: "🚂", type: "property", price: 200, group: "station", color: "#333333" },
    { name: "Chance", icon: "❓", type: "ai_event", price: 0, group: "chance", color: "#FF8C00" },
    { name: "Park Place", icon: "💎", type: "property", price: 350, group: "darkblue", color: "#00008B" },
    { name: "Luxury Tax", icon: "💍", type: "tax", price: 0, group: "tax", color: "#808080" },
    { name: "Boardwalk", icon: "💎", type: "property", price: 400, group: "darkblue", color: "#00008B" },
];

const TIER_LABELS = ["Base", "1 House", "2 Houses", "3 Houses", "4 Houses", "Hotel"];
const PAWN_SYM = ["🐕", "🦆", "🎩", "🏎️"];
const PAWN_COLORS = ["#e91e63", "#1976d2", "#388e3c", "#f57c00"];

// Color group definitions (mirror of server)
const COLOR_GROUPS = {
    brown: [1, 3],
    lightblue: [6, 8, 9],
    pink: [11, 13, 14],
    orange: [16, 18, 19],
    red: [21, 23, 24],
    yellow: [26, 27, 29],
    green: [31, 32, 34],
    darkblue: [37, 39],
    station: [5, 15, 25, 35],
    utility: [12, 28],
};

// Check if player owns the full color set for a given tile
function ownsFullSet(gs, playerName, tileIdx) {
    const tile = BOARD[tileIdx];
    if (!tile || !tile.group) return false;
    const groupTiles = COLOR_GROUPS[tile.group];
    if (!groupTiles) return false;
    return groupTiles.every(idx => {
        const tName = BOARD[idx]?.name;
        return tName && gs.owners?.[tName]?.owner === playerName;
    });
}

// ===== GRID POSITION MAPPING (11x11) =====
// Bottom row L->R: tiles 0-10 (row 11, cols 11 down to 1), actually:
// Standard Monopoly: GO is bottom-right. Clockwise:
// Bottom row (row 11): GO at col 11, then tiles 1-9 go right-to-left (cols 10..2), Jail at col 1
// Left col (col 1): tiles 11-19 go bottom-to-top (rows 10..2), Free Parking at row 1
// Top row (row 1): tiles 21-29 go left-to-right (cols 2..10), Go To Jail at col 11
// Right col (col 11): tiles 31-39 go top-to-bottom (rows 2..10)
function getGridPos(idx) {
    if (idx === 0) return { col: 11, row: 11 };       // GO - bottom right
    if (idx >= 1 && idx <= 9) return { col: 11 - idx, row: 11 };  // bottom row R->L
    if (idx === 10) return { col: 1, row: 11 };       // Jail - bottom left
    if (idx >= 11 && idx <= 19) return { col: 1, row: 11 - (idx - 10) }; // left col bottom->top
    if (idx === 20) return { col: 1, row: 1 };        // Free Parking - top left
    if (idx >= 21 && idx <= 29) return { col: 1 + (idx - 20), row: 1 }; // top row L->R
    if (idx === 30) return { col: 11, row: 1 };       // Go To Jail - top right
    if (idx >= 31 && idx <= 39) return { col: 11, row: 1 + (idx - 30) }; // right col top->bottom
    return { col: 1, row: 1 };
}

// ===== STATE =====
const rpc = new RPC();
let state = { roomId: null, playerName: "", gameState: null, timer: null, waitingForBuyDecision: false, isRolling: false };
const $ = id => document.getElementById(id);

async function initChainRail() {
    const contractLink = $("contractLink");
    if (contractLink) {
        contractLink.href = `${CONFIG.explorerBase}/address/${CONFIG.contractAddress}`;
        contractLink.textContent = `Contract ${shortAddress(CONFIG.contractAddress)}`;
    }
    const raw = await rpc.read("get_protocol_stats");
    if (!raw) return;
    const stats = typeof raw === "string" ? JSON.parse(raw) : raw;
    setChainHealth(`${stats.network || "Studionet"} live · v${stats.version || "2.3.0"}`, "live");
}

// ===== BUILD BOARD =====
function buildBoard() {
    const board = $("board");
    board.innerHTML = "";

    for (let i = 0; i < 40; i++) {
        const tile = BOARD[i];
        const pos = getGridPos(i);
        const el = document.createElement("div");
        let classes = "tile";
        if (tile.group === "corner") classes += " corner";
        // Assign row orientation classes
        if (i >= 1 && i <= 9) classes += " row-bottom";
        if (i >= 11 && i <= 19) classes += " row-left";
        if (i >= 21 && i <= 29) classes += " row-top";
        if (i >= 31 && i <= 39) classes += " row-right";
        el.className = classes;
        el.id = `tile-${i}`;
        el.style.gridColumn = pos.col;
        el.style.gridRow = pos.row;
        board.appendChild(el);
    }

    // Center arena (cols 2-10, rows 2-10)
    const center = document.createElement("div");
    center.className = "center-arena";
    center.id = "centerArena";
    center.style.gridColumn = "2 / 11";
    center.style.gridRow = "2 / 11";
    center.style.backgroundColor = "transparent";
    center.style.borderRadius = "8px";
    center.style.zIndex = "1";
    center.innerHTML = `
        <div id="center-board-panel" style="background: transparent; padding: 40px 60px; z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; position: relative;">
            <div class="arena-logo">GENOPOLY</div>
            
            <div class="scene">
              <div class="cube" id="diceCube">
                <div class="cube__face cube__face--1">1</div>
                <div class="cube__face cube__face--2">2</div>
                <div class="cube__face cube__face--3">3</div>
                <div class="cube__face cube__face--4">4</div>
                <div class="cube__face cube__face--5">5</div>
                <div class="cube__face cube__face--6">6</div>
              </div>
            </div>
            <div class="dice-result" id="diceResult" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 5px;"></div>

            <div class="action-btns">
                <button class="btn btn-roll" id="btnRoll" disabled>🎲 Roll Dice</button>
                <button class="btn btn-green btn-sm" id="btnBuy" disabled>🏢 Buy</button>
                <button class="btn btn-sm" id="btnSkipBuy" disabled style="border-color:#888;color:#888;">⏭️ Skip</button>
                <button class="btn btn-orange btn-sm" id="btnUpgrade" disabled>⬆️ Upgrade</button>
            </div>
            <div class="jail-controls hidden" id="jailPanel" style="display:none;gap:5px;align-items:center;padding:6px 10px;border:2px solid #d32f2f;border-radius:6px;background:#ffebee;">
                <span style="font-size:0.7rem;font-weight:700;color:#d32f2f;">🚔 IN JAIL</span>
                <button class="btn btn-sm btn-red" id="btnPayFine">Pay 50 CR</button>
                <button class="btn btn-sm" id="btnSkipJail" style="border-color:#888;color:#888;">Skip Turn</button>
            </div>
            <div class="emergency hidden" id="emergencyPanel">
                <span class="emergency-label">⚠️ BANKRUPT</span>
                <select id="liquidateSelect" class="field" style="font-size:0.65rem;padding:3px;"><option value="">--</option></select>
                <button class="btn btn-orange btn-sm" id="btnLiquidate">Sell</button>
                <button class="btn btn-red btn-sm" id="btnBankrupt">Forfeit</button>
            </div>
            <div class="turn-info" id="turnInfo"></div>
        </div>
    `;
    board.appendChild(center);
    renderTiles(null);
}

// ===== TILE ICON GENERATOR =====
function getTileIcon(tile, idx) {
    switch(tile.type) {
        case "start":
            return `<div class="icon-go"><span class="go-text">GO</span><span class="go-label">COLLECT 200G</span></div>`;
        case "ai_event":
            return `<div class="icon-chance">?</div>`;
        case "community":
            return `<div class="icon-chest">⊞</div>`;
        case "jail":
            return `<div class="icon-jail"><div class="jail-cell"><div class="jail-bars-bg"></div><span class="jail-text">IN JAIL</span></div><span class="jail-visiting">JUST VISITING</span></div>`;
        case "free":
            return `<div class="icon-parking"><span class="parking-p">P</span></div>`;
        case "go_to_jail":
            return `<div class="icon-gotojail"><div class="badge-outer"><div class="badge-inner">🚨</div></div><span class="gotojail-label">GO TO JAIL</span></div>`;
        case "tax":
            return `<div class="icon-tax">$</div>`;
        case "property":
            if (tile.group === "station") return `<div class="icon-train">🚂</div>`;
            if (tile.group === "utility") return tile.name.includes("Electric") ? `<div class="icon-electric">⚡</div>` : `<div class="icon-water">💧</div>`;
            return "";
        default:
            return "";
    }
}

// ===== RENDER TILES =====
function renderTiles(gs) {
    BOARD.forEach((tile, idx) => {
        const el = $(`tile-${idx}`);
        if (!el) return;

        // Upgrade indicators (houses/hotel)
        let upgradeHtml = "";
        if (gs && gs.owners && gs.owners[tile.name]) {
            const info = gs.owners[tile.name];
            const level = info.level;
            if (level === 5) {
                // Hotel
                upgradeHtml = `<div class="upgrade-indicators" style="font-size:0.7rem;">🏨</div>`;
            } else if (level > 0) {
                // 1-4 Houses
                upgradeHtml = `<div class="upgrade-indicators" style="font-size:0.55rem;letter-spacing:1px;">${'🏠'.repeat(level)}</div>`;
            }
        }

        // Owner dot
        let ownerDot = "";
        if (gs && gs.owners && gs.owners[tile.name]) {
            const pi = getPI(gs, gs.owners[tile.name].owner);
            ownerDot = `<div class="tile-owner-dot" style="background:${PAWN_COLORS[pi]}"></div>`;
        }

        // Player tokens
        let tokens = "";
        if (gs && gs.players) {
            const here = Object.entries(gs.players).filter(([_, s]) => s.position === idx && s.is_active).map(([n]) => n);
            if (here.length > 0) {
                tokens = here.map(n => {
                    const pi = getPI(gs, n);
                    return `<div class="pawn pawn-${pi}" title="${n}">${PAWN_SYM[pi] || n[0]}</div>`;
                }).join("");
            }
        }

        const priceStr = tile.price > 0 ? `${tile.price}G` : "";

        // Determine header color: use owner's color if property is owned, otherwise use group color
        let headerColor = tile.color;
        if (gs && gs.owners && gs.owners[tile.name]) {
            const ownerIdx = getPI(gs, gs.owners[tile.name].owner);
            headerColor = PAWN_COLORS[ownerIdx] || tile.color;
        }

        el.innerHTML = `
            <div class="tile-header" style="background:${headerColor}"></div>
            <div class="tile-info-wrapper">
                ${getTileIcon(tile, idx)}
                <div class="tile-name">${tile.name}</div>
                ${priceStr ? `<div class="tile-price">${priceStr}</div>` : ""}
                ${upgradeHtml}
            </div>
            <div class="token-holder">${tokens}</div>
            ${ownerDot}
        `;
    });
}

// ===== STATS =====
function renderStats(gs) {
    const body = $("statsBody");
    if (!gs || !gs.players) { body.innerHTML = ""; return; }
    body.innerHTML = Object.entries(gs.players).map(([n, s]) => {
        let cls = "status-active", sym = "🟢";
        if (!s.is_active) { cls = "status-eliminated"; sym = "💀"; }
        else if (s.is_bankrupt_pending) { cls = "status-bankrupt"; sym = "⚠️"; }
        const pi = getPI(gs, n);
        const pColor = PAWN_COLORS[pi] || "#ccc";
        const pSym = PAWN_SYM[pi] || n[0];
        return `<tr><td><span style="color:${pColor}; font-weight:bold; margin-right:4px; text-shadow: 0 0 5px ${pColor}80;">${pSym}</span> <span style="color:${pColor}; font-weight:bold;">${n}</span></td><td>${s.balance}</td><td>#${s.position}</td><td class="${cls}">${sym}</td></tr>`;
    }).join("");
}

// ===== ASSETS =====
function renderAssets(gs) {
    const el = $("assetList");
    if (!gs || !gs.owners || Object.keys(gs.owners).length === 0) { el.innerHTML = `<p class="muted">None</p>`; return; }
    el.innerHTML = Object.entries(gs.owners).map(([name, info]) => {
        const pi = getPI(gs, info.owner);
        const color = PAWN_COLORS[pi] || "#ccc";
        return `<div class="asset-item" style="border-left-color:${color}"><span class="a-name">${name}</span><span class="a-tier">${TIER_LABELS[info.level]}</span></div>`;
    }).join("");
}

// ===== CONTROLS =====
function updateControls(gs) {
    if (!gs) return;
    const myTurn = gs.status === "playing" && gs.current_turn === state.playerName;
    const myStats = gs.players?.[state.playerName];
    const bankrupt = myStats?.is_bankrupt_pending;
    const inJail = myStats?.in_jail;
    const roll = $("btnRoll"), buy = $("btnBuy"), upg = $("btnUpgrade"), skipBuy = $("btnSkipBuy");
    const jailPanel = $("jailPanel");
    let onUnownedProperty = false;

    // CRITICAL: Always clear buy decision flag when it's not our turn
    if (!myTurn) {
        state.waitingForBuyDecision = false;
    }

    // Jail controls
    if (inJail && myTurn) {
        if (roll) roll.disabled = true;
        if (buy) buy.disabled = true;
        if (upg) upg.disabled = true;
        if (skipBuy) skipBuy.disabled = true;
        if (jailPanel) { jailPanel.style.display = "flex"; jailPanel.classList.remove("hidden"); }
    } else {
        if (jailPanel) { jailPanel.style.display = "none"; jailPanel.classList.add("hidden"); }

        // The contract owns the phase; the client never infers a buy window from board position.
        onUnownedProperty = myTurn && gs.phase === "property_decision" && !gs.auction?.active;
        state.waitingForBuyDecision = onUnownedProperty;

        if (onUnownedProperty) {
            // Buy/Skip decision phase: disable roll, enable buy/skip
            if (roll) roll.disabled = true;
            if (buy) buy.disabled = false;
            if (skipBuy) skipBuy.disabled = false;
            if (upg) upg.disabled = true;
        } else {
            // Normal phase - rolling is valid only in the canonical on-chain roll phase.
            if (roll) roll.disabled = !(myTurn && !bankrupt && gs.phase === "roll") || state.isRolling;
            if (buy) buy.disabled = true;
            if (skipBuy) skipBuy.disabled = true;
            // Upgrade enabled only if player owns a property in a complete color set,
            // not at hotel cap, AND respects the even-building rule
            if (upg) {
                if (myTurn && !bankrupt && (gs.phase === "roll" || gs.phase === "property_decision") && gs.owners) {
                    const upgradable = Object.entries(gs.owners).some(([tn, info]) => {
                        if (info.owner !== state.playerName) return false;
                        if (info.level >= 5) return false; // Already hotel
                        const idx = BOARD.findIndex(t => t.name === tn);
                        if (idx < 0) return false;
                        const grp = BOARD[idx].group;
                        if (grp === "station" || grp === "utility") return false;
                        if (!ownsFullSet(gs, state.playerName, idx)) return false;
                        // Even-building check: this tile's level must be <= every other tile in the group
                        const groupTiles = COLOR_GROUPS[grp];
                        const myLevel = info.level;
                        const evenOk = groupTiles.every(gt => {
                            const gName = BOARD[gt]?.name;
                            const gInfo = gs.owners[gName];
                            return (gInfo?.level ?? 0) >= myLevel;
                        });
                        return evenOk;
                    });
                    upg.disabled = !upgradable;
                } else {
                    upg.disabled = true;
                }
            }
        }
    }

    const ti = $("turnInfo");
    if (ti) {
        if (myTurn) {
            ti.textContent = onUnownedProperty ? "🏢 BUY or SKIP?" : `👉 It is YOUR Turn!`;
            ti.style.background = "#e8f5e9";
            ti.style.borderColor = "#388e3c";
            ti.style.color = "#2e7d32";
        } else {
            // Not our turn, clear buy decision flag
            state.waitingForBuyDecision = false;
            ti.textContent = `⏳ ${gs.current_turn}'s Turn`;
            ti.style.background = "#fff";
            ti.style.borderColor = "#ccc";
            ti.style.color = "#333";
        }
    }

    const ep = $("emergencyPanel");
    if (ep) {
        if (bankrupt && myTurn) {
            ep.classList.remove("hidden");
            ep.innerHTML = `
                <span class="emergency-label">⚠️ DEBT SETTLEMENT PHASE</span>
                <p style="font-size:0.6rem;color:#333;margin:4px 0;">Sell assets to cover your debt!</p>
                <select id="liquidateSelect" class="field" style="font-size:0.65rem;padding:3px;"><option value="">-- Select property --</option></select>
                <button class="btn btn-orange btn-sm" id="btnLiquidate">💰 Sell (50% value)</button>
                <button class="btn btn-red btn-sm" id="btnBankrupt">💀 Declare Bankruptcy</button>
            `;
            const sel = $("liquidateSelect");
            if (gs.owners) Object.entries(gs.owners).forEach(([tn, info]) => {
                if (info.owner === state.playerName) {
                    const idx = BOARD.findIndex(t => t.name === tn);
                    if (idx >= 0) {
                        const o = document.createElement("option");
                        o.value = idx;
                        o.textContent = `${tn} (+${Math.floor(BOARD[idx].price * 0.5)} CR)`;
                        sel.appendChild(o);
                    }
                }
            });
        } else { ep.classList.add("hidden"); }
    }

    // Check if player was eliminated (bankrupt and no longer active)
    if (myStats && !myStats.is_active && !$("bankruptcyOverlay").classList.contains("shown")) {
        showBankruptcyOverlay(state.playerName);
    }
}

// ===== FEED =====
function feed(msg, type = "event") {
    const el = $("gameFeed"); if (!el) return;
    const p = document.createElement("p");
    p.className = `feed-msg feed-${type}`;
    p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    el.appendChild(p); el.scrollTop = el.scrollHeight;
}

// ===== ANIMATION QUEUE =====
let animationQueue = [];
let isAnimating = false;
let displayedPositions = {}; // tracks visually shown positions per player

function queuePositionUpdates(gs) {
    if (!gs || !gs.players) return;

    const players = Object.entries(gs.players);
    const newMoves = [];

    players.forEach(([name, stats]) => {
        const prevPos = displayedPositions[name];
        if (prevPos !== undefined && prevPos !== stats.position && stats.is_active) {
            newMoves.push({ name, position: stats.position, stats });
        } else if (prevPos === undefined) {
            displayedPositions[name] = stats.position;
        }
    });

    if (newMoves.length > 0) {
        const human = newMoves.find(m => m.name === state.playerName);
        const bots = newMoves.filter(m => m.name !== state.playerName);

        if (human) animationQueue.push(human);
        bots.forEach(b => animationQueue.push(b));

        processAnimationQueue(gs);
    }
}

function processAnimationQueue(gs) {
    if (isAnimating || animationQueue.length === 0) return;
    isAnimating = true;

    const move = animationQueue.shift();
    displayedPositions[move.name] = move.position;
    renderTilesWithDisplayedPositions(gs);

    // Animate the token that just moved
    const tileEl = $(`tile-${move.position}`);
    if (tileEl) {
        const pawns = tileEl.querySelectorAll(".pawn");
        pawns.forEach(p => { p.classList.add("token-moving"); setTimeout(() => p.classList.remove("token-moving"), 500); });
    }

    // Check if rent was paid
    const log = gs.log || "";
    const rentMatch = log.match(/Paid (\d+) credits rent/i);
    if (rentMatch && log.includes(move.name)) {
        showBalanceDelta(rentMatch[1], false);
    }
    // Check if passed GO
    if (log.includes("Passed GO") && log.includes(move.name)) {
        showBalanceDelta("200", true);
    }

    setTimeout(() => {
        isAnimating = false;
        if (animationQueue.length > 0) {
            processAnimationQueue(gs);
        } else {
            // Animation done, do a final render to sync everything
            renderTilesWithDisplayedPositions(gs);
        }
    }, 1000);
}

// Floating rent alert animation
function showRentAlert(amount) {
    const alert = document.createElement("div");
    alert.className = "rent-alert";
    alert.textContent = `-${amount} CR`;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 2000);
}

// Balance delta emitter (positive or negative)
function showBalanceDelta(amount, isPositive) {
    const el = document.createElement("div");
    el.className = `balance-delta ${isPositive ? "positive" : "negative"}`;
    el.textContent = isPositive ? `+${amount} CR` : `-${amount} CR`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
}

// Purchase confetti burst on a tile
function showPurchaseBurst(tileIdx) {
    const el = $(`tile-${tileIdx}`);
    if (!el) return;
    const burst = document.createElement("div");
    burst.className = "purchase-burst";
    el.appendChild(burst);
    setTimeout(() => burst.remove(), 800);
}

// Upgrade halo flash on a tile
function showUpgradeFlash(tileIdx) {
    const el = $(`tile-${tileIdx}`);
    if (!el) return;
    const flash = document.createElement("div");
    flash.className = "upgrade-flash";
    el.appendChild(flash);
    setTimeout(() => flash.remove(), 700);
}

function renderTilesWithDisplayedPositions(gs) {
    BOARD.forEach((tile, idx) => {
        const el = $(`tile-${idx}`);
        if (!el) return;

        // Remove old ownership classes
        el.classList.remove("owned-0", "owned-1", "owned-2", "owned-3");

        let upgradeHtml = "";
        if (gs && gs.owners && gs.owners[tile.name]) {
            const info = gs.owners[tile.name];
            const pi = getPI(gs, info.owner);
            // Add ownership glow class
            el.classList.add(`owned-${pi}`);
            const level = info.level;
            if (level === 5) {
                upgradeHtml = `<div class="upgrade-indicators" style="font-size:0.7rem;">🏨</div>`;
            } else if (level > 0) {
                upgradeHtml = `<div class="upgrade-indicators" style="font-size:0.55rem;letter-spacing:1px;">${'🏠'.repeat(level)}</div>`;
            }
        }

        let ownerDot = "";
        if (gs && gs.owners && gs.owners[tile.name]) {
            const pi = getPI(gs, gs.owners[tile.name].owner);
            ownerDot = `<div class="tile-owner-dot" style="background:${PAWN_COLORS[pi]}"></div>`;
        }

        let tokens = "";
        if (gs && gs.players) {
            const here = Object.entries(gs.players)
                .filter(([n, s]) => (displayedPositions[n] ?? s.position) === idx && s.is_active)
                .map(([n]) => n);
            if (here.length > 0) {
                tokens = here.map(n => {
                    const pi = getPI(gs, n);
                    return `<div class="pawn pawn-${pi}" title="${n}">${PAWN_SYM[pi] || n[0]}</div>`;
                }).join("");
            }
        }

        const priceStr = tile.price > 0 ? `${tile.price} CR` : "";

        // Determine header color: use owner's color if property is owned
        let headerColor = tile.color;
        if (gs && gs.owners && gs.owners[tile.name]) {
            const ownerIdx = getPI(gs, gs.owners[tile.name].owner);
            headerColor = PAWN_COLORS[ownerIdx] || tile.color;
        }

        el.innerHTML = `
            <div class="tile-header" style="background:${headerColor}"></div>
            <div class="tile-info-wrapper">
                ${getTileIcon(tile, idx)}
                <div class="tile-name">${tile.name}</div>
                ${priceStr ? `<div class="tile-price">${priceStr}</div>` : ""}
                ${upgradeHtml}
            </div>
            <div class="token-holder">${tokens}</div>
            ${ownerDot}
        `;
    });
}

// ===== POLLING =====
async function poll() {
    if (!state.roomId) return;
    try {
        const raw = await rpc.read("get_game_state", { room_id: state.roomId });
        if (!raw) return; // Network failure: skip this poll cycle, retry next interval
        const gs = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!gs || !gs.status) return; // Invalid response

        if (gs.status === "waiting" && gs.players) {
            $("playerList").innerHTML = Object.keys(gs.players).map(n => `<li>👤 ${n}</li>`).join("");
            // Initialize displayed positions for animation tracking
            Object.entries(gs.players).forEach(([name, stats]) => {
                if (displayedPositions[name] === undefined) {
                    displayedPositions[name] = stats.position;
                }
                // Sync jail warp (position changed without a "move" animation)
                if (stats.in_jail && displayedPositions[name] !== stats.position) {
                    displayedPositions[name] = stats.position;
                }
            });
        }

        if (gs.status === "playing") {
            if (!$("lobby-screen").classList.contains("hidden")) {
                $("lobby-screen").classList.add("hidden");
                $("gameplay-screen").classList.remove("hidden");
            }

            // Queue animated position updates instead of snapping
            queuePositionUpdates(gs);

            // Render non-position elements immediately
            renderStats(gs);
            renderAssets(gs);
            updateControls(gs);

            // If no animation is running, do a full render to catch non-move changes
            if (!isAnimating && animationQueue.length === 0) {
                renderTilesWithDisplayedPositions(gs);
            }

            if (gs.auction?.active) {
                if (!auctionActive) startAuction(gs);
                $("auctionCurrentBid").textContent = gs.auction.current_bid;
                $("auctionBidder").textContent = gs.auction.highest_bidder_name ? `Leading: ${gs.auction.highest_bidder_name}` : "No bids yet";
            } else if (auctionActive) {
                auctionActive = false;
                $("auctionModal")?.classList.add("hidden");
            }

            const oldLog = state.gameState?.log;
            if (gs.log && gs.log !== oldLog) {
                // Parse single die from log: "rolled 5"
                const diceMatch = gs.log.match(/rolled (\d+)/);
                if (diceMatch && !state.isRolling) {
                    const d = parseInt(diceMatch[1]);
                    const dr = $("diceResult");
                    if (dr) {
                        dr.innerHTML = `🎲 <strong>${d}</strong>${d === 6 ? ' <span style="color:#d32f2f;">(EXTRA TURN!)</span>' : ''}`;
                        dr.classList.add("dice-rolling");
                        setTimeout(() => dr.classList.remove("dice-rolling"), 800);
                    }
                    const cube = $("diceCube");
                    if (cube) cube.className = `cube show-${d}`;
                }
                // Play sound effects based on log content
                if (gs.log.includes("Sent to JAIL")) playSound(SOUNDS.jail);
                else if (gs.log.includes("Purchased") || gs.log.includes("AUCTION WON")) playSound(SOUNDS.purchase);
                else if (gs.log.includes("Upgraded")) playSound(SOUNDS.upgrade);
                else if (gs.log.includes("BANKRUPT") || gs.log.includes("declared bankruptcy")) playSound(SOUNDS.bankrupt);
                else if (gs.log.includes("Paid") && gs.log.includes("rent")) playSound(SOUNDS.rent);

                const type = gs.log.includes("🤖") ? "ai" : gs.log.includes("BANKRUPT") || gs.log.includes("bankrupt") || gs.log.includes("💀") ? "danger" : "event";
                feed(gs.log, type);
            }
        }
        state.gameState = gs;
        handleIncomingTrade(gs).catch((error) => console.warn("Trade response", error));
    } catch (e) {
        console.warn("[GenLayer poll]", fmtErr(e));
        setChainHealth("State refresh failed", "error");
    }
}

function startPolling() { if (state.timer) clearInterval(state.timer); state.timer = setInterval(poll, CONFIG.pollingInterval); poll(); }

// ===== HELPERS =====
function getPI(gs, name) { if (!gs || !gs.players) return 0; return Object.keys(gs.players).indexOf(name); }

// ===== ON-CHAIN ABSTRACTION LAYER =====
async function executeOnChainTransaction() {
    return getWriteClient();
}

async function buyPropertyOnChain(roomId) {
    await executeOnChainTransaction();
    return await rpc.call("buy_property", { room_id: roomId });
}

async function upgradePropertyOnChain(roomId, tileIndex) {
    await executeOnChainTransaction();
    return await rpc.call("upgrade_property", { room_id: roomId, tile_index: tileIndex });
}

async function payRentOnChain(roomId) {
    // Rent is auto-deducted server-side during play_turn
    return await rpc.call("play_turn", { room_id: roomId });
}

async function liquidateAssetOnChain(roomId, tileIndex) {
    return await rpc.call("liquidate_asset", { room_id: roomId, tile_index: tileIndex });
}

async function declareBankruptcyOnChain(roomId) {
    return await rpc.call("declare_bankruptcy", { room_id: roomId });
}

// ===== SOUND EFFECTS SYSTEM =====
function playSound(url) {
    try {
        const audio = new Audio(url);
        audio.volume = 0.5;
        audio.play().catch(() => {}); // Silently ignore autoplay restrictions
    } catch (e) { /* ignore */ }
}

// Sound URLs (using Google's free sound library)
const SOUNDS = {
    jail: "https://actions.google.com/sounds/v1/alarms/police_siren.ogg",
    purchase: "https://actions.google.com/sounds/v1/cash_register/cash_register_open.ogg",
    upgrade: "https://actions.google.com/sounds/v1/foley/wooden_thud.ogg",
    bankrupt: "https://actions.google.com/sounds/v1/cartoon/concussive_hit_guitar_boing.ogg",
    rent: "https://actions.google.com/sounds/v1/cash_register/cash_register_open.ogg",
};

// ===== DICE SOUND EFFECT =====
function playDiceSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const duration = 0.6;
    const steps = 8;
    for (let i = 0; i < steps; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        osc.frequency.value = 200 + Math.random() * 600;
        gain.gain.value = 0.08;
        const start = ctx.currentTime + (i * duration / steps);
        osc.start(start);
        osc.stop(start + 0.04);
    }
    // Final clack
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "triangle";
    osc2.frequency.value = 150;
    gain2.gain.value = 0.15;
    osc2.start(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration + 0.08);
}

// ===== EVENTS =====
function bindEvents() {
    // Connect Wallet: direct binding
    const walletBtn = document.getElementById("btnConnectWalletGlobal");
    if (walletBtn) {
        walletBtn.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("[Wallet] Button click intercepted");
            connectWallet();
        });
        console.log("[Init] Wallet button bound directly");
    } else {
        console.warn("[Init] Wallet button NOT FOUND in DOM at init time");
    }

    $("btnCreateRoom").addEventListener("click", async () => {
        const name = $("playerNameInput").value.trim(); if (!name) return alert("Enter your name.");
        state.playerName = name; rpc.setIdentity(name);
        try { 
            const rid = await rpc.call("create_room", { player_name: name }); 
            state.roomId = rid; 
            $("displayRoomCode").value = rid;
            $("lobby-initial").style.display = "none";
            $("lobby-waiting").style.display = "flex";
            $("lobby-waiting").classList.remove("hidden");
            $("btnStartGame").style.display = "block";
            $("lobbyStatus").textContent = `Waiting for players...`; 
            startPolling(); 
        }
        catch (e) { $("lobbyStatus").textContent = `Error: ${fmtErr(e)}`; }
    });
    $("btnJoinRoom").addEventListener("click", async () => {
        const name = $("playerNameInput").value.trim(); const raw = $("roomIdInput").value.trim();
        if (!name) return alert("Enter your name."); 
        if (!raw) return alert("Enter a room ID.");
        state.playerName = name; rpc.setIdentity(name); state.roomId = raw;
        try { 
            await rpc.call("join_room", { room_id: raw, player_name: name }); 
            $("displayRoomCode").value = raw;
            $("lobby-initial").style.display = "none";
            $("lobby-waiting").style.display = "flex";
            $("lobby-waiting").classList.remove("hidden");
            $("btnStartGame").style.display = "none"; // Only host can start
            $("lobbyStatus").textContent = `Joined room ${raw}. Waiting for host to start...`; 
            startPolling(); 
        }
        catch (e) { $("lobbyStatus").textContent = `Error: ${fmtErr(e)}`; }
    });

    // Copy Code Button
    const btnCopy = $("btnCopyCode");
    if (btnCopy) {
        btnCopy.addEventListener("click", () => {
            const codeInput = $("displayRoomCode");
            codeInput.select();
            document.execCommand("copy");
            btnCopy.textContent = "✅ Copied";
            setTimeout(() => btnCopy.textContent = "📋 Copy", 2000);
        });
    }
    $("btnStartGame").addEventListener("click", async () => {
        if (!state.roomId) return alert("Create or join a room first.");
        try { await rpc.call("start_game", { room_id: state.roomId }); } catch (e) { $("lobbyStatus").textContent = `Error: ${fmtErr(e)}`; }
    });
}

function bindGameEvents() {
    document.addEventListener("click", async (e) => {
        const id = e.target.id;
        if (id === "btnBuy") {
            const buyBtn = $("btnBuy");
            if (buyBtn.disabled) return;
            buyBtn.disabled = true;

            try {
                const m = await buyPropertyOnChain(state.roomId);
                state.waitingForBuyDecision = false;
                const myPos = state.gameState?.players?.[state.playerName]?.position;
                feed(m, "system");
                if (myPos !== undefined) showPurchaseBurst(myPos);

                const freshGs = await rpc.read("get_game_state", { room_id: state.roomId });
                if (freshGs) {
                    const gs = typeof freshGs === "string" ? JSON.parse(freshGs) : freshGs;
                    state.gameState = gs;
                    updateControls(gs);
                }
            } catch (error) {
                console.error(error);
                feed(`❌ Purchase failed: ${fmtErr(error)}`, "danger");
                buyBtn.disabled = false;
            }
        }
        else if (id === "btnRoll") {
            if (state.isRolling) return;
            state.isRolling = true;
            playDiceSound();
            const btn = $("btnRoll");
            btn.disabled = true;
            btn.textContent = "⏳ Rolling...";
            const dr = $("diceResult");
            if (dr) { dr.textContent = "🎲 ..."; dr.classList.add("dice-rolling"); }
            const cube = $("diceCube");
            if (cube) cube.className = "cube spinning";
            try {
                // Let the dice spin for 0.8 seconds before making the move
                await new Promise(resolve => setTimeout(resolve, 800));
                const m = await rpc.call("play_turn", { room_id: state.roomId });
                const diceMatch = m.match(/rolled (\d+)/);
                if (diceMatch) {
                    const d = parseInt(diceMatch[1]);
                    if (dr) dr.innerHTML = `🎲 <strong>${d}</strong>${d === 5 ? ' <span style="color:#d32f2f;">(LUCKY 5!)</span>' : ''}`;
                    if (cube) cube.className = `cube show-${d}`;
                }
                if (dr) { setTimeout(() => dr.classList.remove("dice-rolling"), 800); }
                feed(m, m.includes("🤖") ? "ai" : "event");
                // Force fresh state poll to update controls
                const freshGs = await rpc.read("get_game_state", { room_id: state.roomId });
                if (freshGs) {
                    const gs = typeof freshGs === "string" ? JSON.parse(freshGs) : freshGs;
                    if (gs.current_turn === state.playerName) {
                        const myPos = gs.players?.[state.playerName]?.position;
                        const tile = BOARD[myPos];
                        if (tile && tile.type === "property" && !gs.owners?.[tile.name]) {
                            state.waitingForBuyDecision = true;
                        }
                    }
                    state.gameState = gs;
                    updateControls(gs);
                }
            } catch (er) {
                feed(fmtErr(er), "danger");
                if (dr) { dr.classList.remove("dice-rolling"); }
            } finally {
                state.isRolling = false;
                btn.textContent = "🎲 Roll Dice";
                // Re-enable if it's still our turn (let updateControls decide)
                if (state.gameState) updateControls(state.gameState);
            }
        }
        else if (id === "btnPayFine") {
            try { 
                await executeOnChainTransaction();
                const m = await rpc.call("pay_jail_fine", { room_id: state.roomId }); 
                feed(m, "event"); 
            } catch (er) { feed(`Error: ${fmtErr(er)}`, "danger"); }
        }
        else if (id === "btnSkipJail") {
            try { const m = await rpc.call("skip_jail_turn", { room_id: state.roomId }); feed(m, "system"); } catch (er) { feed(`Error: ${fmtErr(er)}`, "danger"); }
        }
        else if (id === "btnSkipBuy") {
            state.waitingForBuyDecision = false;
            try { const m = await rpc.call("skip_buy", { room_id: state.roomId }); feed(m, "system"); } catch (er) { feed(fmtErr(er), "danger"); }
        }
        else if (id === "btnUpgrade") {
            const gs = state.gameState;
            if (!gs || !gs.owners) return;
            // Find all upgradable properties (full set, not hotel, respects even-building)
            const candidates = [];
            Object.entries(gs.owners).forEach(([tn, info]) => {
                if (info.owner !== state.playerName) return;
                if (info.level >= 5) return;
                const idx = BOARD.findIndex(t => t.name === tn);
                if (idx < 0) return;
                const grp = BOARD[idx].group;
                if (grp === "station" || grp === "utility") return;
                if (!ownsFullSet(gs, state.playerName, idx)) return;
                // Check even-building: this tile must be at minimum level in its group
                const groupTiles = COLOR_GROUPS[grp];
                const myLevel = info.level;
                const evenOk = groupTiles.every(gt => {
                    const gName = BOARD[gt]?.name;
                    const gInfo = gs.owners[gName];
                    return (gInfo?.level ?? 0) >= myLevel;
                });
                if (evenOk) candidates.push({ name: tn, idx, level: info.level });
            });

            if (candidates.length === 0) { feed("No upgradeable properties (need full set + even building).", "danger"); return; }

            // Prefer the one we're standing on; otherwise lowest level first
            const myPos = gs.players?.[state.playerName]?.position;
            const standingProp = candidates.find(p => p.idx === myPos);
            const target = standingProp || candidates.sort((a, b) => a.level - b.level)[0];

            try {
                const msg = await upgradePropertyOnChain(state.roomId, target.idx);
                feed(msg, "system");
                showUpgradeFlash(target.idx);
                const costMatch = msg.match(/for (\d+) credits/i);
                if (costMatch) showBalanceDelta(costMatch[1], false);
            }
            catch (er) { feed(fmtErr(er), "danger"); }
        }
        else if (id === "btnLiquidate") { const idx = parseInt($("liquidateSelect").value); if (isNaN(idx)) return; try { feed(await liquidateAssetOnChain(state.roomId, idx), "system"); } catch (er) { feed(`Error: ${fmtErr(er)}`, "danger"); } }
        else if (id === "btnBankrupt") { if (!confirm("Declare bankruptcy?")) return; try { feed(await declareBankruptcyOnChain(state.roomId), "danger"); } catch (er) { feed(`Error: ${fmtErr(er)}`, "danger"); } }
    });
}

// ===== BANKRUPTCY OVERLAY =====
function showBankruptcyOverlay(playerName) {
    const overlay = $("bankruptcyOverlay");
    if (!overlay) return;
    overlay.classList.remove("hidden");
    overlay.classList.add("shown");
    $("bankruptMessage").textContent = `${playerName} failed to pay their debts and went entirely broke.`;
    $("bankruptBreakdown").textContent = "All assets have been seized by creditors.";
}

// ===== WEB3 WALLET INTEGRATION =====
const STUDIONET_CHAIN_ID = "0xf22f";

let walletConnected = false;
let walletAddress = null;
let writeClient = null;
let walletListenersBound = false;

async function ensureStudionet(provider) {
    try {
        await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: STUDIONET_CHAIN_ID }],
        });
    } catch (error) {
        if (error?.code !== 4902 && !/unrecognized chain/i.test(error?.message || "")) throw error;
        await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
                chainId: STUDIONET_CHAIN_ID,
                chainName: "GenLayer Studionet",
                nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
                rpcUrls: [CONFIG.rpcEndpoint],
                blockExplorerUrls: [CONFIG.explorerBase],
            }],
        });
    }
}

async function getWriteClient() {
    if (!walletConnected || !walletAddress) {
        const connected = await connectWallet();
        if (!connected) throw new Error("Wallet connection is required.");
    }
    if (writeClient) return writeClient;
    const provider = window.ethereum;
    await ensureStudionet(provider);
    writeClient = createClient({ chain: studionet, account: walletAddress, provider });
    await writeClient.connect("studionet");
    return writeClient;
}

async function connectWallet() {
    const provider = window.ethereum;
    if (!provider) {
        alert("No EVM wallet detected. Install MetaMask or Rabby to play on GenLayer Studionet.");
        return false;
    }
    try {
        const accounts = await provider.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
            await ensureStudionet(provider);
            walletAddress = accounts[0];
            walletConnected = true;
            writeClient = null;
            updateWalletButton();
            feed(`Wallet connected on Studionet: ${shortAddress(walletAddress)}`, "system");
            if (provider.on && !walletListenersBound) {
                walletListenersBound = true;
                provider.on("accountsChanged", (accs) => {
                    if (!accs || accs.length === 0) {
                        walletConnected = false;
                        walletAddress = null;
                    } else {
                        walletAddress = accs[0];
                        walletConnected = true;
                    }
                    writeClient = null;
                    updateWalletButton();
                });
                provider.on("chainChanged", () => { writeClient = null; });
            }
            return true;
        }
    } catch (error) {
        console.error("Wallet connection failed:", error);
        alert(`Wallet connection failed: ${fmtErr(error)}`);
    }
    return false;
}

function shortAddress(addr) {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function updateWalletButton() {
    const btn = $("btnConnectWalletGlobal");
    if (!btn) return;
    if (walletConnected && walletAddress) {
        btn.textContent = `✅ ${shortAddress(walletAddress)}`;
        btn.style.borderColor = "#4caf50";
        btn.style.color = "#4caf50";
        btn.style.background = "#e8f5e9";
        unlockLobby();
    } else {
        btn.textContent = "🔗 Connect Wallet";
        btn.style.borderColor = "#00bcd4";
        btn.style.color = "#00bcd4";
        btn.style.background = "#fff";
        lockLobby();
    }
}

function lockLobby() {
    const elements = [
        $("playerNameInput"),
        $("roomIdInput"),
        $("btnCreateRoom"),
        $("btnJoinRoom"),
        $("btnStartGame"),
    ];
    elements.forEach(el => {
        if (el) {
            el.disabled = true;
            el.style.opacity = "0.4";
            el.style.cursor = "not-allowed";
        }
    });
}

function unlockLobby() {
    const elements = [
        $("playerNameInput"),
        $("roomIdInput"),
        $("btnCreateRoom"),
        $("btnJoinRoom"),
        $("btnStartGame"),
    ];
    elements.forEach(el => {
        if (el) {
            el.disabled = false;
            el.style.opacity = "1";
            el.style.cursor = "";
        }
    });
}

// Lock the lobby on init (until wallet connects)
function initWalletGate() {
    lockLobby();
    // Show notification when locked elements are clicked
    document.addEventListener("click", (e) => {
        if (!walletConnected) {
            const id = e.target?.id;
            if (id === "btnCreateRoom" || id === "btnJoinRoom" || id === "btnStartGame") {
                e.preventDefault();
                e.stopPropagation();
                alert("Please connect your wallet first to play!");
            }
        }
    }, true); // Capture phase to intercept BEFORE other handlers
}

// ===== AUCTION SYSTEM (contract-authoritative deadline) =====
let auctionActive = false;
let auctionCountdownTimer = null;
let auctionClosing = false;

function renderAuctionDeadline() {
    const auction = state.gameState?.auction;
    if (!auction?.active) return;
    const seconds = auctionSecondsLeft(auction.closes_at);
    const timerDisplay = $("auction-timer");
    const timerLabel = $("auctionTimer");
    if (timerDisplay) timerDisplay.textContent = seconds > 0 ? `${seconds}s` : "READY";
    if (timerLabel) {
        timerLabel.textContent = seconds > 0
            ? `On-chain bidding closes in ${seconds}s`
            : "Deadline reached. Settling on-chain...";
    }
    if (seconds === 0 && !auctionClosing) forceCloseAuction();
}

function startAuction(gs) {
    if (!gs.auction || !gs.auction.active || auctionActive) return;
    state.gameState = gs;
    auctionActive = true;
    const modal = $("auctionModal");
    if (!modal) { auctionActive = false; return; }
    modal.classList.remove("hidden");
    modal.style.zIndex = "9999";

    $("auctionPropertyName").textContent = gs.auction.tile_name;
    $("auctionCurrentBid").textContent = gs.auction.current_bid;
    $("auctionBidder").textContent = gs.auction.highest_bidder_name ? `Leading: ${gs.auction.highest_bidder_name}` : "No bids yet";
    if (auctionCountdownTimer) clearInterval(auctionCountdownTimer);
    renderAuctionDeadline();
    auctionCountdownTimer = setInterval(renderAuctionDeadline, 1000);
}

async function forceCloseAuction() {
    if (!auctionActive || auctionClosing) return;
    auctionClosing = true;

    try {
        const msg = await rpc.call("close_auction", { room_id: state.roomId });
        if (msg) {
            feed(msg, "system");
            if (msg.includes("AUCTION WON")) playSound(SOUNDS.purchase);
        }
    } catch (e) {
        const message = fmtErr(e);
        if (!/already been settled/i.test(message)) feed(`Auction settlement: ${message}`, "danger");
    } finally {
        auctionClosing = false;
    }
    await poll();
    if (!state.gameState?.auction?.active) {
        auctionActive = false;
        if (auctionCountdownTimer) { clearInterval(auctionCountdownTimer); auctionCountdownTimer = null; }
        const modal = $("auctionModal");
        if (modal) modal.classList.add("hidden");
        state.waitingForBuyDecision = false;
    }
}

// ===== TRADE SYSTEM =====
let selectedOfferTiles = new Set();
let selectedWantTiles = new Set();
const reviewedTradeIds = new Set();

function openTradeModal() {
    selectedOfferTiles.clear();
    selectedWantTiles.clear();
    const target = $("tradeTarget");
    const candidates = Object.keys(state.gameState?.players || {}).filter((name) => {
        return name !== state.playerName && state.gameState.players[name]?.is_active;
    });
    target.innerHTML = candidates.map((name) => `<option value="${name}">${name}</option>`).join("");
    if (candidates.length === 0) {
        target.innerHTML = `<option value="">No active trade partner</option>`;
    }
    $("tradeModal").classList.remove("hidden");
    $("tradeResult").textContent = "";
    $("tradeOfferCash").value = "0";
    populateTradeCards();
}

function closeTradeModal() {
    $("tradeModal").classList.add("hidden");
}

function populateTradeCards() {
    const gs = state.gameState;
    if (!gs || !gs.owners) return;

    const offerList = $("tradeOfferList");
    const wantList = $("tradeWantList");
    const targetName = $("tradeTarget").value;

    // My properties
    const myProps = Object.entries(gs.owners).filter(([_, info]) => info.owner === state.playerName);
    if (myProps.length === 0) {
        offerList.innerHTML = `<span class="empty-msg">You own no properties</span>`;
    } else {
        offerList.innerHTML = myProps.map(([tileName, info]) => {
            const idx = BOARD.findIndex(t => t.name === tileName);
            const tile = BOARD[idx];
            return `<div class="trade-card" data-idx="${idx}" data-list="offer">
                <span class="card-dot" style="background:${tile?.color || '#ccc'}"></span>
                <span>${tileName}</span>
            </div>`;
        }).join("");
    }

    // Target's properties
    const theirProps = Object.entries(gs.owners).filter(([_, info]) => info.owner === targetName);
    if (theirProps.length === 0) {
        wantList.innerHTML = `<span class="empty-msg">${targetName} owns no properties</span>`;
    } else {
        wantList.innerHTML = theirProps.map(([tileName, info]) => {
            const idx = BOARD.findIndex(t => t.name === tileName);
            const tile = BOARD[idx];
            return `<div class="trade-card" data-idx="${idx}" data-list="want">
                <span class="card-dot" style="background:${tile?.color || '#ccc'}"></span>
                <span>${tileName}</span>
            </div>`;
        }).join("");
    }
}

// Handle trade card clicks (delegation)
document.addEventListener("click", (e) => {
    const card = e.target.closest(".trade-card");
    if (!card) return;
    const idx = parseInt(card.dataset.idx);
    const list = card.dataset.list;
    if (list === "offer") {
        if (selectedOfferTiles.has(idx)) { selectedOfferTiles.delete(idx); card.classList.remove("selected"); }
        else { selectedOfferTiles.add(idx); card.classList.add("selected"); }
    } else if (list === "want") {
        if (selectedWantTiles.has(idx)) { selectedWantTiles.delete(idx); card.classList.remove("selected"); }
        else { selectedWantTiles.add(idx); card.classList.add("selected"); }
    }
});

// Refresh cards when target changes
document.addEventListener("change", (e) => {
    if (e.target.id === "tradeTarget") {
        selectedWantTiles.clear();
        populateTradeCards();
    }
});

async function sendTradeOffer() {
    const target = $("tradeTarget").value;
    const offerCash = parseInt($("tradeOfferCash").value) || 0;
    const offerTiles = Array.from(selectedOfferTiles);
    const wantTiles = Array.from(selectedWantTiles);

    if (!target) {
        $("tradeResult").textContent = "No active trade partner is available.";
        return;
    }
    if (offerTiles.length === 0 && offerCash === 0) {
        $("tradeResult").textContent = "⚠️ You must offer something!";
        return;
    }
    if (wantTiles.length === 0) {
        $("tradeResult").textContent = "⚠️ Select what you want!";
        return;
    }

    $("tradeResult").textContent = "Sending offer...";

    try {
        const msg = await rpc.call("propose_trade", {
            room_id: state.roomId,
            target: target,
            offer_tiles: offerTiles,
            offer_cash: offerCash,
            want_tiles: wantTiles,
        });
        $("tradeResult").textContent = msg;
        feed(msg, msg.includes("ACCEPTED") ? "event" : "danger");
        if (msg.includes("ACCEPTED")) {
            setTimeout(closeTradeModal, 2000);
        }
    } catch (e) {
        $("tradeResult").textContent = `❌ ${fmtErr(e)}`;
    }
}

async function handleIncomingTrade(gs) {
    if (!walletConnected || !state.roomId || !Array.isArray(gs.open_trades)) return;
    const trade = gs.open_trades.find((item) => item.target_name === state.playerName && !reviewedTradeIds.has(String(item.id)));
    if (!trade) return;
    reviewedTradeIds.add(String(trade.id));
    const offeredNames = (trade.offer_tiles || []).map((index) => BOARD[index]?.name).filter(Boolean);
    const wantedNames = (trade.want_tiles || []).map((index) => BOARD[index]?.name).filter(Boolean);
    const summary = [
        `${trade.proposer_name} proposed trade #${trade.id}.`,
        `You receive: ${offeredNames.join(", ") || "no property"}${trade.offer_cash ? ` + ${trade.offer_cash} credits` : ""}.`,
        `They receive: ${wantedNames.join(", ") || "no property"}.`,
        "Accept this on-chain trade?",
    ].join("\n");
    const accept = window.confirm(summary);
    try {
        const message = await rpc.call("respond_trade", {
            room_id: state.roomId,
            trade_id: String(trade.id),
            accept,
        });
        feed(message, accept ? "event" : "system");
    } catch (error) {
        reviewedTradeIds.delete(String(trade.id));
        throw error;
    }
}

// ===== INIT =====
buildBoard();
bindEvents();
bindGameEvents();
initWalletGate();
initChainRail().catch((error) => setChainHealth(fmtErr(error), "error"));

// Bind auction & trade buttons via delegation
document.addEventListener("click", (e) => {
    if (e.target.id === "btnBid10") {
        const current = parseInt($("auctionCurrentBid").textContent) || 10;
        const newBid = current + 10;
        rpc.call("place_bid", { room_id: state.roomId, amount: newBid }).then((msg) => {
            $("auctionCurrentBid").textContent = newBid;
            $("auctionBidder").textContent = `Leading: ${state.playerName}`;
            feed(`🙋 You bid ${newBid} CR!`, "system");
        }).catch(err => feed(`Bid failed: ${fmtErr(err)}`, "danger"));
    }
    if (e.target.id === "btnBid50") {
        const current = parseInt($("auctionCurrentBid").textContent) || 10;
        const newBid = current + 50;
        rpc.call("place_bid", { room_id: state.roomId, amount: newBid }).then((msg) => {
            $("auctionCurrentBid").textContent = newBid;
            $("auctionBidder").textContent = `Leading: ${state.playerName}`;
            feed(`🙋 You bid ${newBid} CR!`, "system");
        }).catch(err => feed(`Bid failed: ${fmtErr(err)}`, "danger"));
    }
    if (e.target.id === "btnPassAuction") {
        feed("You passed on the auction.", "system");
        // Let the timer continue counting down; don't force close
    }
    if (e.target.id === "btnOpenTrade") openTradeModal();
    if (e.target.id === "btnCloseTrade") closeTradeModal();
    if (e.target.id === "btnSendTrade") sendTradeOffer();
    if (e.target.id === "btnSpectate") {
        $("bankruptcyOverlay").classList.add("hidden");
    }
});
