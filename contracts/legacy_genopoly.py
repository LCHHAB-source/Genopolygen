# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json

BOARD = {0: {'group': 'corner', 'name': 'GO', 'price': 0, 'rent': 0, 'type': 'start'},
 1: {'group': 'brown',
     'name': 'Mediterranean Avenue',
     'price': 60,
     'rent': 6,
     'type': 'property'},
 2: {'group': 'action',
     'name': 'Community Chest',
     'price': 0,
     'rent': 0,
     'type': 'community'},
 3: {'group': 'brown',
     'name': 'Baltic Avenue',
     'price': 60,
     'rent': 6,
     'type': 'property'},
 4: {'group': 'tax',
     'name': 'Income Tax',
     'price': 0,
     'rent': 200,
     'type': 'tax'},
 5: {'group': 'station',
     'name': 'Reading Railroad',
     'price': 200,
     'rent': 25,
     'type': 'property'},
 6: {'group': 'lightblue',
     'name': 'Oriental Avenue',
     'price': 100,
     'rent': 10,
     'type': 'property'},
 7: {'group': 'chance',
     'name': 'Chance',
     'price': 0,
     'rent': 0,
     'type': 'ai_event'},
 8: {'group': 'lightblue',
     'name': 'Vermont Avenue',
     'price': 100,
     'rent': 10,
     'type': 'property'},
 9: {'group': 'lightblue',
     'name': 'Connecticut Avenue',
     'price': 120,
     'rent': 12,
     'type': 'property'},
 10: {'group': 'corner',
      'name': 'Jail / Just Visiting',
      'price': 0,
      'rent': 0,
      'type': 'jail'},
 11: {'group': 'pink',
      'name': 'St. Charles Place',
      'price': 140,
      'rent': 14,
      'type': 'property'},
 12: {'group': 'utility',
      'name': 'Electric Company',
      'price': 150,
      'rent': 15,
      'type': 'property'},
 13: {'group': 'pink',
      'name': 'States Avenue',
      'price': 140,
      'rent': 14,
      'type': 'property'},
 14: {'group': 'pink',
      'name': 'Virginia Avenue',
      'price': 160,
      'rent': 16,
      'type': 'property'},
 15: {'group': 'station',
      'name': 'Pennsylvania Railroad',
      'price': 200,
      'rent': 25,
      'type': 'property'},
 16: {'group': 'orange',
      'name': 'St. James Place',
      'price': 180,
      'rent': 18,
      'type': 'property'},
 17: {'group': 'action',
      'name': 'Community Chest',
      'price': 0,
      'rent': 0,
      'type': 'community'},
 18: {'group': 'orange',
      'name': 'Tennessee Avenue',
      'price': 180,
      'rent': 18,
      'type': 'property'},
 19: {'group': 'orange',
      'name': 'New York Avenue',
      'price': 200,
      'rent': 20,
      'type': 'property'},
 20: {'group': 'corner',
      'name': 'Free Parking',
      'price': 0,
      'rent': 0,
      'type': 'free'},
 21: {'group': 'red',
      'name': 'Kentucky Avenue',
      'price': 220,
      'rent': 22,
      'type': 'property'},
 22: {'group': 'chance',
      'name': 'Chance',
      'price': 0,
      'rent': 0,
      'type': 'ai_event'},
 23: {'group': 'red',
      'name': 'Indiana Avenue',
      'price': 220,
      'rent': 22,
      'type': 'property'},
 24: {'group': 'red',
      'name': 'Illinois Avenue',
      'price': 240,
      'rent': 24,
      'type': 'property'},
 25: {'group': 'station',
      'name': 'B. & O. Railroad',
      'price': 200,
      'rent': 25,
      'type': 'property'},
 26: {'group': 'yellow',
      'name': 'Atlantic Avenue',
      'price': 260,
      'rent': 26,
      'type': 'property'},
 27: {'group': 'yellow',
      'name': 'Ventnor Avenue',
      'price': 260,
      'rent': 26,
      'type': 'property'},
 28: {'group': 'utility',
      'name': 'Water Works',
      'price': 150,
      'rent': 15,
      'type': 'property'},
 29: {'group': 'yellow',
      'name': 'Marvin Gardens',
      'price': 280,
      'rent': 28,
      'type': 'property'},
 30: {'group': 'corner',
      'name': 'Go To Jail',
      'price': 0,
      'rent': 0,
      'type': 'go_to_jail'},
 31: {'group': 'green',
      'name': 'Pacific Avenue',
      'price': 300,
      'rent': 30,
      'type': 'property'},
 32: {'group': 'green',
      'name': 'North Carolina Avenue',
      'price': 300,
      'rent': 30,
      'type': 'property'},
 33: {'group': 'action',
      'name': 'Community Chest',
      'price': 0,
      'rent': 0,
      'type': 'community'},
 34: {'group': 'green',
      'name': 'Pennsylvania Avenue',
      'price': 320,
      'rent': 32,
      'type': 'property'},
 35: {'group': 'station',
      'name': 'Short Line Railroad',
      'price': 200,
      'rent': 25,
      'type': 'property'},
 36: {'group': 'chance',
      'name': 'Chance',
      'price': 0,
      'rent': 0,
      'type': 'ai_event'},
 37: {'group': 'darkblue',
      'name': 'Park Place',
      'price': 350,
      'rent': 35,
      'type': 'property'},
 38: {'group': 'tax',
      'name': 'Luxury Tax',
      'price': 0,
      'rent': 100,
      'type': 'tax'},
 39: {'group': 'darkblue',
      'name': 'Boardwalk',
      'price': 400,
      'rent': 40,
      'type': 'property'}}

COLOR_GROUPS = {'brown': [1, 3],
 'darkblue': [37, 39],
 'green': [31, 32, 34],
 'lightblue': [6, 8, 9],
 'orange': [16, 18, 19],
 'pink': [11, 13, 14],
 'red': [21, 23, 24],
 'station': [5, 15, 25, 35],
 'utility': [12, 28],
 'yellow': [26, 27, 29]}

RENT_MULT = {0: 1, 1: 5, 2: 15, 3: 45, 4: 80, 5: 125}



def _get_room(rooms: TreeMap, room_id: str) -> dict:
    if room_id not in rooms:
        raise Exception("Room not found.")
    return json.loads(rooms[room_id])


def _save_room(rooms: TreeMap, room_id: str, room: dict) -> None:
    rooms[room_id] = json.dumps(room, sort_keys=True)


def _advance_turn(room: dict) -> None:
    players = room["players"]
    total   = len(players)
    for _ in range(total):
        room["current_turn_index"] = (room["current_turn_index"] + 1) % total
        nxt = players[room["current_turn_index"]]
        if room["game_state"]["player_stats"][nxt]["is_active"]:
            break


def _evaluate_end_game(room: dict) -> str:
    active = [
        p for p in room["players"]
        if room["game_state"]["player_stats"][p]["is_active"]
    ]
    if len(active) == 1:
        room["status"] = "finished"
        winner = room["player_names"][active[0]]
        return f"Game Over! {winner} wins!"
    return ""


def _parse_ai_event(raw: str) -> dict:
    try:
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        s = cleaned.find("{")
        e = cleaned.rfind("}") + 1
        if s >= 0 and e > s:
            cleaned = cleaned[s:e]
        obj = json.loads(cleaned)
        val = max(0.0005, min(0.002, float(obj.get("value", 0.001))))
        typ = obj.get("type", "fine")
        if typ not in ("reward", "fine"):
            typ = "fine"
        return {
            "narrative": str(obj.get("narrative", "A mysterious event occurred."))[:200],
            "type":      typ,
            "value":     val,
        }
    except Exception:
        return {"narrative": "System glitch.", "type": "fine", "value": 0.0005}


class Genopoly(gl.Contract):
    rooms:      TreeMap[str, str]
    room_count: u256
    owner:      Address

    def __init__(self):
        self.owner      = gl.message.sender_address
        self.room_count = u256(0)

    @gl.public.write
    def create_room(self, player_name: str) -> str:
        if not player_name.strip():
            raise Exception("Player name cannot be empty.")

        sender  = str(gl.message.sender_address)
        room_id = "room-" + str(int(self.room_count))

        room = {
            "room_id":            room_id,
            "host":               sender,
            "players":            [sender],
            "player_names":       {sender: str(player_name)[:32]},
            "status":             "waiting",
            "current_turn_index": 0,
            "turn_counter":       0,
            "game_state": {
                "player_stats":      {sender: {"balance": 0, "position": 0,
                                               "is_active": False,
                                               "is_bankrupt_pending": False,
                                               "in_jail": False,
                                               "jail_turns": 0}},
                "properties_owners": {},
                "property_levels":   {},
                "last_action_log":   "Room created.",
            },
        }
        _save_room(self.rooms, room_id, room)
        self.room_count = u256(int(self.room_count) + 1)
        return room_id

    @gl.public.write
    def join_room(self, room_id: str, player_name: str) -> str:
        sender = str(gl.message.sender_address)
        room   = _get_room(self.rooms, room_id)

        if room["status"] != "waiting":
            raise Exception("Game already started.")
        if sender in room["players"]:
            raise Exception("Already in room.")
        if len(room["players"]) >= 4:
            raise Exception("Lobby full.")
        if not player_name.strip():
            raise Exception("Player name cannot be empty.")

        room["players"].append(sender)
        room["player_names"][sender] = str(player_name)[:32]
        room["game_state"]["player_stats"][sender] = {
            "balance": 0, "position": 0,
            "is_active": False, "is_bankrupt_pending": False,
            "in_jail": False, "jail_turns": 0,
        }

        _save_room(self.rooms, room_id, room)
        return "Joined successfully."

    @gl.public.write
    def start_game(self, room_id: str) -> str:
        sender = str(gl.message.sender_address)
        room   = _get_room(self.rooms, room_id)

        if room["host"] != sender:
            raise Exception("Only host can start.")
        if len(room["players"]) < 2:
            raise Exception("Need at least 2 players.")
        if room["status"] != "waiting":
            raise Exception("Already started.")

        for p in room["players"]:
            room["game_state"]["player_stats"][p] = {
                "balance": 1.5, "position": 0,
                "is_active": True, "is_bankrupt_pending": False,
                "in_jail": False, "jail_turns": 0,
            }
        room["status"] = "playing"
        room["game_state"]["last_action_log"] = "Game started."

        _save_room(self.rooms, room_id, room)
        return "Game started."

    @gl.public.write
    def play_turn(self, room_id: str) -> str:
        sender = str(gl.message.sender_address)
        room   = _get_room(self.rooms, room_id)

        if room["status"] != "playing":
            raise Exception("Game not active.")

        active_wallet = room["players"][room["current_turn_index"]]
        if sender != active_wallet:
            raise Exception("Not your turn.")

        stats = room["game_state"]["player_stats"][sender]
        if not stats["is_active"]:
            raise Exception("You are eliminated.")
        if stats["is_bankrupt_pending"]:
            raise Exception("Resolve bankruptcy first.")
        if stats["in_jail"]:
            raise Exception("You are in jail. Pay fine or skip turn.")

        turn_counter  = int(room.get("turn_counter", 0))
        seed          = int(sender, 16) if sender.startswith("0x") else hash(sender)
        dice_roll     = ((seed + turn_counter * 7) % 6) + 1
        room["turn_counter"] = turn_counter + 1

        old_position  = stats["position"]
        new_position  = (old_position + dice_roll) % 40
        stats["position"] = new_position

        tile_name  = BOARD[new_position]["name"]
        pname      = room["player_names"][sender]
        action_msg = f"{pname} rolled {dice_roll} → {tile_name}."

        if new_position < old_position:
            stats["balance"] += 0.200
            action_msg += " Passed GO (+0.200 GEN)."

        tile          = BOARD[new_position]
        tile_str      = str(new_position)
        owners        = room["game_state"]["properties_owners"]

        if tile["type"] == "property":
            if tile_str in owners and owners[tile_str] != sender:
                owner = owners[tile_str]
                if room["game_state"]["player_stats"][owner]["is_active"]:
                    lvl = room["game_state"]["property_levels"].get(tile_str, 0)

                    # Special rent calculation for utilities (based on dice roll)
                    if new_position in [12, 28]:  # Electric Company, Water Works
                        final_rent = dice_roll * 0.010
                    # Special rent for railroads (based on number owned)
                    elif new_position in [5, 15, 25, 35]:  # Railroads
                        railroad_count = sum(1 for k, v in owners.items()
                                           if v == owner and int(k) in [5, 15, 25, 35])
                        final_rent = tile["rent"] * railroad_count
                    else:
                        # Full set double rent for unimproved properties
                        if lvl == 0:
                            group = tile.get("group", "")
                            if group in COLOR_GROUPS:
                                group_tiles = COLOR_GROUPS[group]
                                owns_all = all(owners.get(str(gt)) == owner for gt in group_tiles)
                                if owns_all:
                                    final_rent = tile["rent"] * 2
                                else:
                                    final_rent = tile["rent"] * RENT_MULT.get(lvl, 1)
                            else:
                                final_rent = tile["rent"] * RENT_MULT.get(lvl, 1)
                        else:
                            final_rent = tile["rent"] * RENT_MULT.get(lvl, 1)

                    stats["balance"] -= final_rent
                    room["game_state"]["player_stats"][owner]["balance"] += final_rent
                    action_msg += f" Paid {final_rent:.4f} GEN rent to {room['player_names'][owner]}."
                    if stats["balance"] <= 0:
                        stats["is_bankrupt_pending"] = True
                        action_msg += " Warning: Balance deficit! Liquidate or declare bankruptcy."

        elif tile["type"] == "ai_event":
            pname_local  = pname
            bal_local    = stats["balance"]
            parse_fn     = _parse_ai_event

            def run_ai_event() -> str:
                prompt = (
                    "Game context: Player " + pname_local +
                    " landed on AI Chance Node. Balance=" + str(bal_local) + " GEN. "
                    "Generate a 1-sentence cyberpunk narrative event. "
                    "Return ONLY JSON: "
                    "{\"narrative\": \"<str>\", \"type\": \"reward\"|\"fine\", \"value\": <0.0005-0.002>}"
                )
                raw    = gl.nondet.exec_prompt(prompt)
                parsed = parse_fn(raw)
                return json.dumps(parsed, sort_keys=True)

            try:
                result   = gl.eq_principle.strict_eq(run_ai_event)
                ai_data  = json.loads(result)
                val      = float(ai_data["value"])
                if ai_data["type"] == "reward":
                    stats["balance"] += val
                    action_msg += f" AI: {ai_data['narrative']} (+{val:.4f} GEN)"
                else:
                    stats["balance"] -= val
                    if stats["balance"] <= 0:
                        stats["is_bankrupt_pending"] = True
                        action_msg += f" AI: {ai_data['narrative']} (-{val:.4f} GEN). Bankrupt Pending!"
                    else:
                        action_msg += f" AI: {ai_data['narrative']} (-{val:.4f} GEN)"
            except Exception:
                stats["balance"] -= 0.0005
                if stats["balance"] <= 0:
                    stats["is_bankrupt_pending"] = True
                action_msg += " AI Default Fine (-0.0005 GEN)."

        elif tile["type"] == "go_to_jail":
            stats["position"] = 10
            stats["in_jail"] = True
            stats["jail_turns"] = 0
            action_msg += " Sent to JAIL!"

        elif tile["type"] == "tax":
            tax_amount = 0.100 if new_position == 38 else 0.050
            stats["balance"] -= tax_amount
            action_msg += f" Paid {tax_amount:.3f} GEN tax."
            if stats["balance"] <= 0:
                stats["is_bankrupt_pending"] = True
                action_msg += " Warning: Balance deficit!"

        elif tile["type"] == "community":
            def run_community_event() -> str:
                prompt = (
                    "Game context: Player " + pname +
                    " landed on Community Chest. Balance=" + str(stats["balance"]) + " GEN. "
                    "Generate a 1-sentence community event. "
                    "Return ONLY JSON: "
                    "{\"narrative\": \"<str>\", \"type\": \"reward\"|\"fine\", \"value\": <0.0005-0.002>}"
                )
                raw = gl.nondet.exec_prompt(prompt)
                parsed = _parse_ai_event(raw)
                return json.dumps(parsed, sort_keys=True)

            try:
                result = gl.eq_principle.strict_eq(run_community_event)
                comm_data = json.loads(result)
                val = float(comm_data["value"])
                if comm_data["type"] == "reward":
                    stats["balance"] += val
                    action_msg += f" Community: {comm_data['narrative']} (+{val:.4f} GEN)"
                else:
                    stats["balance"] -= val
                    if stats["balance"] <= 0:
                        stats["is_bankrupt_pending"] = True
                        action_msg += f" Community: {comm_data['narrative']} (-{val:.4f} GEN). Bankrupt Pending!"
                    else:
                        action_msg += f" Community: {comm_data['narrative']} (-{val:.4f} GEN)"
            except Exception:
                stats["balance"] -= 0.0005
                if stats["balance"] <= 0:
                    stats["is_bankrupt_pending"] = True
                action_msg += " Community Default Fine (-0.0005 GEN)."

        if not stats["is_bankrupt_pending"]:
            _advance_turn(room)

        room["game_state"]["last_action_log"] = action_msg
        _save_room(self.rooms, room_id, room)
        return action_msg

    @gl.public.write
    def buy_property(self, room_id: str) -> str:
        sender = str(gl.message.sender_address)
        room   = _get_room(self.rooms, room_id)
        stats  = room["game_state"]["player_stats"][sender]
        pos    = stats["position"]
        tile   = BOARD[pos]
        t_str  = str(pos)

        if tile["type"] != "property":
            raise Exception("Not a purchasable tile.")
        if t_str in room["game_state"]["properties_owners"]:
            raise Exception("Already owned.")
        if stats["balance"] < tile["price"]:
            raise Exception("Insufficient funds.")

        stats["balance"] -= tile["price"]
        room["game_state"]["properties_owners"][t_str] = sender
        room["game_state"]["property_levels"][t_str]   = 0

        _save_room(self.rooms, room_id, room)
        return f"Purchased {tile['name']}."

    @gl.public.write
    def upgrade_property(self, room_id: str, tile_index: int) -> str:
        sender = str(gl.message.sender_address)
        room   = _get_room(self.rooms, room_id)
        t_str  = str(tile_index)

        if room["game_state"]["properties_owners"].get(t_str) != sender:
            raise Exception("You do not own this asset.")

        lvl = room["game_state"]["property_levels"].get(t_str, 0)
        if lvl >= 5:
            raise Exception("Already has hotel (max level).")

        tile = BOARD[tile_index]
        group = tile.get("group", "")
        if group in ("station", "utility"):
            raise Exception("Cannot build on stations or utilities.")
        if group not in COLOR_GROUPS:
            raise Exception("Invalid group.")

        group_tiles = COLOR_GROUPS[group]
        for gt in group_tiles:
            if room["game_state"]["properties_owners"].get(str(gt)) != sender:
                raise Exception(f"Must own full {group} set to build.")

        # Even-building rule
        for gt in group_tiles:
            other_level = room["game_state"]["property_levels"].get(str(gt), 0)
            if other_level < lvl:
                raise Exception("Even-building rule violation.")

        group_costs = {"brown": 50, "lightblue": 50, "pink": 100, "orange": 100, "red": 150, "yellow": 150, "green": 200, "darkblue": 200}
        upgrade_cost = group_costs.get(group, 50)
        stats        = room["game_state"]["player_stats"][sender]

        if stats["balance"] < upgrade_cost:
            raise Exception("Cannot afford upgrade.")

        stats["balance"] -= upgrade_cost
        room["game_state"]["property_levels"][t_str] = lvl + 1

        labels = ["", "1 House", "2 Houses", "3 Houses", "4 Houses", "Hotel"]
        _save_room(self.rooms, room_id, room)
        return f"Built {labels[lvl+1]} on {tile['name']} (-{upgrade_cost} GEN)."

    @gl.public.write
    def liquidate_asset(self, room_id: str, tile_index: int) -> str:
        sender = str(gl.message.sender_address)
        room   = _get_room(self.rooms, room_id)
        t_str  = str(tile_index)

        if room["game_state"]["properties_owners"].get(t_str) != sender:
            raise Exception("Asset ownership mismatch.")

        liq_value = BOARD[tile_index]["price"] * 0.50
        stats     = room["game_state"]["player_stats"][sender]

        del room["game_state"]["properties_owners"][t_str]
        if t_str in room["game_state"]["property_levels"]:
            del room["game_state"]["property_levels"][t_str]

        stats["balance"] += liq_value
        msg = f"Liquidated asset {tile_index} (+{liq_value:.4f} GEN)."

        if stats["is_bankrupt_pending"] and stats["balance"] > 0:
            stats["is_bankrupt_pending"] = False
            msg += " Bankruptcy cleared!"
            _advance_turn(room)

        _save_room(self.rooms, room_id, room)
        return msg

    @gl.public.write
    def pay_jail_fine(self, room_id: str) -> str:
        sender = str(gl.message.sender_address)
        room   = _get_room(self.rooms, room_id)
        stats  = room["game_state"]["player_stats"][sender]

        if not stats["in_jail"]:
            raise Exception("You are not in jail.")

        fine_amount = 0.050
        if stats["balance"] < fine_amount:
            raise Exception("Insufficient funds to pay fine.")

        stats["balance"] -= fine_amount
        stats["in_jail"] = False
        stats["jail_turns"] = 0

        _save_room(self.rooms, room_id, room)
        return f"Paid {fine_amount:.3f} GEN fine. Released from jail."

    @gl.public.write
    def skip_jail_turn(self, room_id: str) -> str:
        sender = str(gl.message.sender_address)
        room   = _get_room(self.rooms, room_id)
        stats  = room["game_state"]["player_stats"][sender]

        if not stats["in_jail"]:
            raise Exception("You are not in jail.")

        stats["jail_turns"] += 1
        if stats["jail_turns"] >= 3:
            stats["in_jail"] = False
            stats["jail_turns"] = 0
            msg = f"Served 3 turns. Released from jail."
        else:
            msg = f"Skipping jail turn ({stats['jail_turns']}/3)."

        _advance_turn(room)
        _save_room(self.rooms, room_id, room)
        return msg

    @gl.public.write
    def declare_bankruptcy(self, room_id: str) -> str:
        sender = str(gl.message.sender_address)
        room   = _get_room(self.rooms, room_id)
        stats  = room["game_state"]["player_stats"][sender]

        if not stats["is_bankrupt_pending"]:
            raise Exception("You are not in bankruptcy state.")

        owners    = room["game_state"]["properties_owners"]
        to_remove = [k for k, v in owners.items() if v == sender]
        for k in to_remove:
            del owners[k]
            if k in room["game_state"]["property_levels"]:
                del room["game_state"]["property_levels"][k]

        stats["is_active"]          = False
        stats["is_bankrupt_pending"] = False

        msg        = f"{room['player_names'][sender]} declared bankruptcy."
        winner_log = _evaluate_end_game(room)
        if winner_log:
            msg += " " + winner_log
        else:
            _advance_turn(room)

        room["game_state"]["last_action_log"] = msg
        _save_room(self.rooms, room_id, room)
        return msg

    @gl.public.view
    def get_game_state(self, room_id: str) -> str:
        room    = _get_room(self.rooms, room_id)
        players = room["players"]
        idx     = room["current_turn_index"]
        current = room["player_names"].get(players[idx], "None") if players else "None"

        owners_display = {}
        for t_str, wallet in room["game_state"]["properties_owners"].items():
            tile_name = BOARD[int(t_str)]["name"]
            owners_display[tile_name] = {
                "owner": room["player_names"].get(wallet, wallet),
                "level": room["game_state"]["property_levels"].get(t_str, 0),
            }

        return json.dumps({
            "status":       room["status"],
            "current_turn": current,
            "players":      {
                room["player_names"][p]: v
                for p, v in room["game_state"]["player_stats"].items()
            },
            "owners": owners_display,
            "log":    room["game_state"]["last_action_log"],
        }, sort_keys=True)

    @gl.public.view
    def get_room_count(self) -> int:
        return int(self.room_count)
