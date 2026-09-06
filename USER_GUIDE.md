# 🧙‍♂️ Zoltraak User Guide & Command Reference

Welcome to the official manual for **Zoltraak**, an autonomous, human-like companion bot for modern Minecraft (`1.21.x`). This guide covers all in-game commands, configuration tips, and advanced automation features.

---

## 📑 Table of Contents
1. [Communication & Permissions](#-communication--permissions)
2. [Master Command Cheatsheet](#-master-command-cheatsheet)
3. [Combat & Tactical Defense](#-combat--tactical-defense)
4. [Resource Gathering & Automation](#-resource-gathering--automation)
5. [Building, Bridging & Towering](#-building-bridging--towering)
6. [Water Bucket MLG Clutch](#-water-bucket-mlg-clutch)
7. [Smart Multi-Chest Logistics](#-smart-multi-chest-logistics)
8. [Base Survival, Sleeping & Death Recovery](#-base-survival-sleeping--death-recovery)
9. [Web Dashboard & Radar Minimap](#-web-dashboard--radar-minimap)
10. [Troubleshooting & Tips](#-troubleshooting--tips)

---

## 💬 Communication & Permissions

### How to Issue Commands
Commands can be issued in two ways:
- **Private Whisper (Recommended):** `/msg Zoltraak <command>` or `/tell Zoltraak <command>`
  - Keeps public server chat clean and prevents other players from eavesdropping.
- **Public Chat:** `!<command>` (e.g. `!guard`, `!status`)

### Security & Whitelisting
Zoltraak only accepts commands from its designated **owner** and players listed in the authorization whitelist.

To authorize players, edit `config.json`:
```json
{
  "owner": "YourMinecraftUsername",
  "privacy": {
    "audienceMode": "whisper_only",
    "whitelist": ["YourMinecraftUsername", "TrustedFriend"]
  }
}
```

---

## 📋 Master Command Cheatsheet

| Command | Arguments | Aliases | Description |
| :--- | :--- | :--- | :--- |
| **`guard`** | — | `bodyguard` | Escorts owner within 3 blocks and attacks hostile mobs. |
| **`follow`** | — | `come` | Follows owner directly without engaging in combat. |
| **`stay`** | — | `stop` | Immediately cancels all movement, combat, and pathfinding. |
| **`roam`** | — | — | Wanders naturally around the home anchor area. |
| **`sethome`** | — | — | Updates home anchor coordinates to Zoltraak's current position. |
| **`archer`** | — | `snipe` | Equips bow/crossbow and kites hostiles at 8–15 block distance. |
| **`patrol`** | — | `sentry` | Starts perimeter patrol around home or custom waypoints. |
| **`addpatrol`** | — | `addpoint` | Adds your current position as a patrol waypoint. |
| **`clearpatrol`** | — | — | Clears all custom patrol waypoints. |
| **`bridge`** | `[length] [dir]` | — | Sneak-places blocks ahead across ravines or lava lakes. |
| **`tower`** | `[height]` | `scaffold` | Jumps and places blocks under feet to climb up cliffs. |
| **`clutch`** | `[on/off]` | — | Toggles the automatic Water Bucket MLG clutch. |
| **`lumber`** | — | `chop`, `wood` | Chops nearby trees and replants saplings on the stump. |
| **`mine`** | `[ore_name]` | — | Mines veins of coal, iron, gold, diamond, lapis, or debris. |
| **`tunnel`** | `[steps]` | `stripminer` | Excavates a safe 1×2 branch mine with torches and fluid checks. |
| **`smelt`** | — | `cook` | Automates nearby furnaces: loads fuel and ores/food, collects ingots. |
| **`breed`** | `[species]` | `ranch` | Feeds pairs of cows, sheep, pigs, or chickens with crops/seeds. |
| **`farm`** | — | — | Harvests mature crops and replants without trampling farmland. |
| **`fish`** | — | `fishing` | Finds nearby water, casts fishing rod, and reels in catches. |
| **`craft`** | `<item> [count]` | — | Crafts specified item using 2×2 grid or crafting table. |
| **`bring`** | `<item> [count]` | `deliver` | Fetches item from base storage and delivers to owner's feet. |
| **`setchest`** | `[category]` | — | Registers container under `ores`, `food`, `wood`, `mob`, `building`, or `default`. |
| **`listchests`**| — | `chests` | Whispers all registered storage containers and coordinates. |
| **`sortbase`** | — | `sort`, `deposit` | Automatically deposits and sorts inventory into category chests. |
| **`recover`** | — | `corpse`, `tomb` | Pathfinds back to death coordinates to retrieve dropped gear. |
| **`eat`** | — | — | Forces Zoltraak to eat food from inventory immediately. |
| **`sleep`** | — | — | Finds the nearest bed and sleeps through the night or storm. |
| **`drop`** | — | — | Empties entire inventory onto the ground for the owner. |
| **`skin`** | `<player>` | — | Sets Zoltraak's skin (supports SkinsRestorer `/skin set`). |
| **`status`** | — | — | Whispers current HP, hunger level, active state, and patrol points. |
| **`help`** | — | — | Shows a quick categorized list of commands in chat. |

---

## ⚔️ Combat & Tactical Defense

### 1. Dynamic Bodyguard (`!guard`)
- Zoltraak maintains a tight 3-block escort distance behind the owner.
- When you are moving, Zoltraak follows smoothly. When you stop, Zoltraak faces outwards to watch your back.
- If hostile mobs (Zombies, Skeletons, Spiders, Endermen) approach within 12 blocks of the owner, Zoltraak equips the highest-tier sword/axe and intercepts them.

### 2. Reactive Shield Parrying
- Zoltraak continuously monitors incoming projectiles (arrows, tridents, fireballs, wind charges) within 10 blocks.
- If a projectile is headed directly towards the bot, Zoltraak instantly turns to face the incoming vector and raises its off-hand shield to block the damage.

### 3. Creeper Blast Avoidance
- When a creeper ignites or begins ticking within 6 blocks, Zoltraak immediately sprints backward and raises its shield to absorb blast damage.

### 4. Archer Stance (`!archer`)
- Equips a bow or crossbow from inventory.
- Maintains a tactical 8–15 block distance, kiting backward if enemies push closer.
- Aims and charges shots, compensating for gravitational arrow drop.

### 5. Sentry Perimeter Patrol (`!patrol`)
- **Default mode:** Patrols a 4-corner perimeter around home anchor coordinates.
- **Custom waypoints:** Stand at desired locations and type `!addpatrol`. Zoltraak will walk between your custom points in sequence.
- Any hostile mob breaching the perimeter is intercepted and eliminated before Zoltraak returns to its route.

---

## 🪓 Resource Gathering & Automation

### 1. Auto-Lumberjack (`!lumber` or `!chop`)
- Scans up to 24 blocks for tree trunks (Oak, Birch, Spruce, Jungle, Acacia, Dark Oak, Cherry, Mangrove).
- Equips highest-tier axe and breaks wood blocks from the bottom up.
- Collects dropped logs and replants saplings directly back onto the dirt stump.

### 2. Smart Ore Miner (`!mine <ore>`)
- Searches for visible or exposed ore veins (`coal`, `iron`, `gold`, `diamond`, `lapis`, `copper`, `redstone`, `debris`, or `all`).
- Pathfinds to the vein, equips a pickaxe with appropriate harvest hardness (e.g. Iron pickaxe for Diamonds), and excavates the vein.

### 3. Safe Branch Tunneling (`!tunnel [steps]`)
- Mines a standard 1×2 corridor ahead for the specified number of blocks (default: 8).
- **Safety checks:** Detects overhead falling sand/gravel and checks for lava/water flow before breaking blocks.
- Automatically places illumination torches along the tunnel wall when light levels drop below 7.

### 4. Auto-Smelter (`!smelt`)
- Finds nearby furnaces, blast furnaces, or smokers within 8 blocks.
- Withdraws smelted ingots and cooked food.
- Loads available fuel (Coal, Charcoal, Blaze Rods, Wood Planks).
- Loads raw ores (Raw Iron, Raw Copper, Raw Gold) or raw meats into the input slot.

### 5. Livestock Rancher (`!breed [species]`)
- Scans for nearby adult animals: `cow`, `sheep`, `pig`, `chicken`, or `all`.
- Equips appropriate feed (Wheat for cows/sheep, Carrots for pigs, Seeds for chickens).
- Feeds pairs to trigger love hearts and produce baby animals.

---

## 🧱 Building, Bridging & Towering

### 1. Auto-Bridging (`!bridge [length] [direction]`)
Bridge across ravines, chasms, rivers, or Nether lava lakes without fear of falling off:
- **Command:** `!bridge 12` (bridges 12 blocks in the direction Zoltraak is facing).
- **Directional:** `!bridge 16 north`, `!bridge 20 east`, `!bridge 8 south`, `!bridge 8 west`.
- **How it works:** Zoltraak enables sneak (`Shift`), backs towards the block edge, places blocks against the supporting face, and advances forward step-by-step.

### 2. Vertical Scaffolding (`!tower [height]`)
Climb steep cliffs, walls, or build pillars:
- **Command:** `!tower 6` (or `!scaffold 6`)
- **How it works:** Zoltraak looks directly down, jumps, places a block at the apex of its jump, and lands on top of the newly placed block.

---

## 💧 Water Bucket MLG Clutch

Zoltraak features an automatic physics-based Water MLG clutch:
- **Detection:** When falling rapidly (`velocity.y < -0.55` and `fallDistance >= 2.5`), Zoltraak detects the approaching ground.
- **Action:** Quick-equips a `water_bucket` into the main hand, looks straight down, and places water on the landing surface just before impact to cancel fall damage.
- **Auto-Retrieval:** 350ms after landing in the water, Zoltraak automatically equips an empty `bucket`, picks the water back up, and continues moving without leaving puddles everywhere.
- **Toggle:** Whisper `!clutch on` or `!clutch off` to toggle this feature.

> **Requirement:** Keep at least one `Water Bucket` in Zoltraak's inventory.

---

## 📦 Smart Multi-Chest Logistics

Instead of dumping everything into one messy container, Zoltraak supports categorized storage containers!

### 1. Registering Storage Containers
Stand within 5 blocks of a Chest, Barrel, or Shulker Box and run:
- `!setchest ores` — For raw ores, ingots, diamonds, coal, lapis, redstone.
- `!setchest food` — For crops, cooked/raw meats, bread, apples.
- `!setchest wood` — For logs, planks, saplings, sticks.
- `!setchest mob` — For bones, arrows, gunpowder, string, rotten flesh, pearls.
- `!setchest building` — For cobblestone, stone, dirt, deepslate, netherrack.
- `!setchest default` — For miscellaneous fallback items.

### 2. Viewing Registered Containers
- Whisper `!listchests` to see all configured categories and coordinates.

### 3. Sorting Inventory (`!sortbase`)
- Run `!sortbase` (or `!deposit`).
- Zoltraak analyzes its inventory, groups items by category, and pathfinds to each respective container in sequence to deposit matching items.
- **Smart Preservation:** Automatically reserves 16 carrots, 16 potatoes, 32 seeds, weapons, armor, tools, and water buckets in inventory.

### 4. Courier Delivery (`!bring <item> [count]`)
- Need supplies while exploring or mining? Whisper `/msg Zoltraak bring iron_ingot 16` or `/msg Zoltraak bring bread 8`.
- Zoltraak visits the base chest, withdraws the requested items, pathfinds to your exact live coordinates, and drops them at your feet.

---

## 🛌 Base Survival, Sleeping & Death Recovery

### 1. Automatic Sleeping (`!sleep`)
- When night falls (time > 12541) or during thunderstorms, Zoltraak automatically seeks out the nearest bed within 30 blocks and sleeps.
- Can be forced at any time with `!sleep`.

### 2. Auto-Eat & Anti-Starvation (`!eat`)
- Continuously monitors hunger. When hunger drops below 18 (configurable), Zoltraak consumes available food.
- Banned foods (`rotten_flesh`, `pufferfish`, `spider_eye`, `poisonous_potato`) are avoided.

### 3. Corpse & Gear Recovery (`!recover`)
- If Zoltraak ever falls in combat:
  - Zoltraak automatically logs the exact XYZ coordinates, dimension, and inventory manifest.
  - Alerts the owner in chat immediately.
  - When Zoltraak respawns, whisper `!recover`. Zoltraak will pathfind back to its death point, vacuum up dropped items, and re-equip its armor and weapons.

---

## 🌐 Web Dashboard & Radar Minimap

Zoltraak includes a built-in real-time Web Dashboard running natively on Node.js:
- **URL:** Open `http://localhost:3000` in your web browser.
- **Features:**
  - **2D Canvas Radar Minimap:** Live top-down radar showing Zoltraak's heading cone, nearby players, hostiles (red blips), passive mobs (green blips), dropped items (yellow blips), and registered chests.
  - **Live Vitals HUD:** Real-time health hearts, hunger/saturation, dimension, and live XYZ coordinates with 1-click copy.
  - **Inventory Visualizer:** Interactive grid of armor slots, offhand item, main inventory, and hotbar with item counts.
  - **1-Click Control Panel:** Switch modes (`Guard`, `Farm`, `Lumber`, `Mine`, `Fish`, `Patrol`, `Archer`, `Smelt`, `Breed`, `Deposit`, `Stop`) with a single click.
  - **Live Chat Console:** Stream in-game chat and send commands directly from your browser.

---

## 💡 Troubleshooting & Tips

- **Bot not responding to commands?** Verify your username matches `"owner"` in `config.json` (case-sensitive).
- **Bot getting stuck on server anti-bot plugins?** Zoltraak includes a micro-jump on spawn to satisfy GriefPrevention/anti-bot pre-movement checks.
- **Bot trampling crops?** Zoltraak uses 2-block reach harvesting to avoid stepping on farmland blocks. Ensure farmland is properly hydrated.
- **Running 24/7 on a VPS or Server?** Use Docker Compose: `docker compose up -d`.
- **Modifying Code?** Run `npm run dev` to enable auto-reloading whenever `.js` files are modified.
