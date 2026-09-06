# Zoltraak - Autonomous Minecraft Companion Bot

[![Node.js Version](https://img.shields.io/badge/node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Mineflayer](https://img.shields.io/badge/Mineflayer-4.38%2B-blue.svg)](https://github.com/PrismarineJS/mineflayer)
[![Minecraft Version](https://img.shields.io/badge/Minecraft-1.21.2+-orange.svg)](https://minecraft.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributing Guide](https://img.shields.io/badge/Contributions-Welcome-brightgreen.svg)](CONTRIBUTING.md)
[![User Guide](https://img.shields.io/badge/User%20Guide-Command%20Manual-purple.svg)](USER_GUIDE.md)
[![Feature Catalog](https://img.shields.io/badge/Features-Master%20Catalog-blue.svg)](FEATURES.md)

**Zoltraak** is an intelligent, human-like autonomous companion bot designed for modern Minecraft servers (`1.21.x`). Unlike basic AFK bots, Zoltraak interacts naturally with player mechanics, engages in realistic context-aware conversations without interrupting strangers, defends its owner, performs Water MLG clutches, auto-bridges across chasms, manages crop farms without trampling soil, catches fish autonomously, chops trees and replants saplings, digs branch mines, sorts multi-chest storages, automates smelting furnaces, breeds livestock, craft tools on the fly, patrols base perimeters, and greets players using authentic community mannerisms.

---

## ✨ Features

### 🪓 Resource Gathering & Automation
- **🌲 Auto-Lumberjack & Replanting (`lumber`, `chop`):** Scans for nearby trees (oak, birch, spruce, jungle, acacia, dark oak, cherry, mangrove), equips the highest-tier axe, chops the tree trunk from bottom to top, collects drops, and replants saplings back onto the dirt stump.
- **⛏️ Smart Ore Miner & Branch Miner (`mine <ore>`, `tunnel`):**
  - Targets specific ores (`coal`, `iron`, `gold`, `diamond`, `lapis`, `copper`, `redstone`, `debris`) with pickaxes matching harvest hardness tiers.
  - Excavates safe 1×2 branch mines (`tunnel 8`), checks for overhead falling gravel or lava fluids, and places illumination torches when light levels drop below 7.
- **🔥 Auto-Smelter & Furnace Helper (`smelt`):** Locates nearby furnaces, blast furnaces, or smokers. Automatically extracts smelted ingots/food, loads fuel (`coal`, `charcoal`, `blaze rods`, `planks`), and inputs raw ores or raw meat.
- **🐑 Animal Breeder & Rancher (`breed`):** Detects nearby adult cows, sheep, chickens, and pigs, equips the corresponding feed (`wheat`, `seeds`, `carrots`), and feeds pairs to produce offspring.

### 🧱 Building, Bridging & Movement Clutches
- **💧 Water Bucket MLG Clutch (`clutch`):** Continuously monitors fall velocity and height. If a dangerous fall occurs, Zoltraak instantly equips a water bucket, aims straight down, cancels fall damage right before impact, and scoops the water back up 350ms later.
- **🧱 Auto-Bridging (`bridge [length] [dir]`):** Uses sneak physics (`Shift`) to safely walk towards edges and place blocks across ravines, rivers, or Nether lava lakes without falling off.
- **🗼 Vertical Scaffolding / Towering (`tower [height]` / `scaffold`):** Jumps and places blocks directly beneath feet at the apex of the jump to climb steep terrain or escape enemies.

### 📦 Smart Multi-Chest Logistics
- **🗃️ Categorized Storage Management (`setchest <category>`, `listchests`):** Register dedicated containers for `ores`, `food`, `wood`, `mob`, `building`, and `default`.
- **🔄 Auto-Sorting Base Deposit (`sortbase`, `sort`):** Sequentially pathfinds to each registered chest and deposits only matching items while safely preserving emergency food, seeds, weapons, and tools.

### ⚔️ Advanced Combat & Tactical Defense
- **🛡️ Shield Reflexes & Projectile Parrying:** Detects incoming projectiles (`arrows`, `tridents`, `fireballs`, `wind charges`) within 10 blocks, instantly turns to face the incoming threat, and raises its off-hand shield to parry.
- **💥 Creeper Blast Deflection:** Tactically sprints backward and raises its shield when creepers ignite or tick within 6 blocks.
- **🏹 Ranged Archer Mode (`archer`, `snipe`):** Equips bows or crossbows, kites hostiles by maintaining a safe 7–15 block distance, compensates for projectile gravitational drop, charges, and snipes enemies from afar.
- **🏰 Perimeter Patrol & Sentry Radar (`patrol`, `sentry`):**
  - Continuously walks sequential custom waypoints or generates an autonomous 4-corner perimeter around home.
  - Features an active sentry radar: sounds chat alerts and intercepts any hostile mob that breaches the perimeter.
- **🔮 Totem of Undying Quick-Swap:** Automatically equips a Totem of Undying in the off-hand if health falls below 12 HP.

### 🛠️ Survival Quality of Life
- **🔨 In-Field Auto-Crafter & Tool Replenisher (`craft <item>`):**
  - Resolves crafting recipes in player 2×2 inventory or navigates to a workbench for 3×3 table recipes.
  - If pickaxes, axes, or swords break during tasks, Zoltraak autonomously crafts replacements on the fly.
- **📦 Courier Item Delivery (`bring <item> [count]`):**
  - Withdraws requested materials from base chests and navigates to the owner's exact live coordinates.
  - Drops items directly at the owner's feet with a whisper notification.
- **💀 Death Marker & Corpse Retriever (`recover`):**
  - Hooks player death events, logs exact XYZ coordinates, dimension, timestamp, and an inventory manifest, alerting the owner immediately.
  - Command `!recover` directs Zoltraak to pathfind to the death marker, vacuum dropped items, and re-equip recovered armor and weapons.

### 🤝 Companion & Base Automation
- **🤝 Authentic Shift-Greeting:** Detects player double-crouches within 2.5s and responds by locking eye gaze, double-crouching, and swinging its arm.
- **🛡️ Bodyguard Escort (`guard`):** Follows at a tight 3-block distance, watches the owner's back when stationary, and neutralizes incoming threats.
- **🌾 Infinite Crop Farming (`farm`):** Uses $O(1)$ block palette scans to harvest and replant mature crops (`wheat`, `carrots`, `potatoes`, `beetroots`) without trampling farmland.
- **🎣 Autonomous Fishing (`fish`):** Locates water bodies, casts fishing rods, detects bite splashes, and catches fish and treasure.
- **🍗 Anti-Starvation Auto-Eat:** Continuously consumes stored food when hunger drops below 18.
- **🛌 Bed Sleeping (`sleep`):** Automatically seeks out and sleeps in nearby beds during thunderstorms or night time.

### 🧠 Conversational Intelligence & Anti-Interruption
- **🤫 Strict Anti-Interruption Filter:** Never butts into conversations between strangers. In public chat, only responds when directly mentioned (`\bZoltraak\b`), or face-to-face within 4 blocks.
- **💬 15-Second Active Threading:** Follow-up dialogue with the same player flows naturally without requiring repeating the bot's name every sentence.
- **⚡ Dynamic Human Typing Delays:** Calculates reaction time plus character-based typing speed, paired with physical head tracking and arm swings.
- **🛡️ Anti-Doxxing Privacy:** Sensitive base coordinates are only shared with whitelisted friends, giving safe vague answers to strangers.

### 🌐 Web Dashboard & Live Visualization
- **🧭 2D Tactical Radar Minimap:** Smooth Canvas-based top-down radar with dynamic range scaling (16m, 24m, 36m), view angle direction cone, player username tags, hostile mob blips, dropped items, base chest markers, and patrol waypoint trails.
- **📊 Real-Time Vitals & Coordinates HUD:** Live animated health hearts, hunger/saturation levels, dimension indicators, and X/Y/Z coordinates with 1-click clipboard copy.
- **🎒 Interactive Minecraft Inventory Grid:** Full visualizer for 4 armor slots, off-hand slot, 27 main inventory slots, and 9 hotbar slots with item count badges and hover tooltips.
- **⚡ One-Click Action Control Center:** Instant command buttons to switch Zoltraak into any behavior (`Guard`, `Farm`, `Lumber`, `Mine`, `Fish`, `Patrol`, `Archer`, `Smelt`, `Breed`, `Deposit`, `Sleep`, `Stop`).
- **💬 In-Browser Live Chat & Command Console:** Streams in-game chat, whispers, and system logs in real time with an interactive input bar to dispatch commands directly from your browser.
- **🚀 Zero Extra Dependencies:** Built natively on Node.js core `http` and Server-Sent Events (SSE) on `http://localhost:3000`.

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (`v18.0.0` or higher) & npm
- A Minecraft Server (`Paper`, `Purpur`, `Spigot`, or `Fabric`) supporting Minecraft `1.21.x`

### Installation

1. **Clone or Fork the repository:**
   ```bash
   git clone https://github.com/<your-username>/zoltraak.git
   cd zoltraak
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the bot:**
   ```bash
   cp config.example.json config.json
   ```
   Edit `config.json` with your server address and in-game name:
   ```json
   {
     "host": "localhost",
     "port": 25565,
     "username": "Zoltraak",
     "owner": "YourMinecraftUsername",
     "version": "1.21.2",
     "roamRadius": 16,
     "autoSleep": true,
     "autoDefend": true,
     "autoFarm": true
   }
   ```

4. **Start Zoltraak:**
   ```bash
   # Standard start
   npm start

   # Development mode (auto-reloads on file changes)
   npm run dev
   ```

### 🐳 Running with Docker
```bash
docker compose up -d
```

---

## 💬 Command Reference

All commands can be sent privately via `/msg Zoltraak <command>` or publicly via `!<command>`. For full syntax, arguments, and in-depth guides, see **[USER_GUIDE.md](USER_GUIDE.md)**:

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `guard` | — | Follows within 3 blocks, shields your back, and intercepts hostiles. |
| `archer` | — | Equips bow/crossbow and kiting combat stance for ranged sniping. |
| `patrol` | — | Starts sentry perimeter patrol around home or custom waypoints. |
| `addpatrol` | — | Adds current coordinates as a sentry waypoint. |
| `clearpatrol` | — | Clears all custom patrol waypoints. |
| `bridge` | `[length] [dir]` | Sneak-places blocks ahead across ravines, rivers, or lava lakes. |
| `tower` | `[height]` | Jumps and places blocks under feet to climb up cliffs or towers. |
| `clutch` | `[on/off]` | Toggles automatic Water Bucket MLG clutch on/off. |
| `lumber` / `chop` | — | Locates trees, chops trunks from bottom-up, and replants saplings. |
| `mine` | `[ore_name]` | Searches and mines veins of coal, iron, gold, diamond, or debris. |
| `tunnel` | `[steps]` | Excavates a safe 1×2 branch mine with fluid checks and torches. |
| `smelt` | — | Opens furnace, loads fuels and smeltable ores/food, collects ingots. |
| `breed` | `[species]` | Feeds pairs of cows, sheep, pigs, or chickens to breed offspring. |
| `craft` | `<item> [count]` | Crafts specified items using 2×2 grid or nearby crafting table. |
| `bring` | `<item> [count]` | Fetches item from base storage and delivers directly to owner. |
| `recover` | — | Pathfinds back to death coordinates to retrieve dropped gear. |
| `farm` | — | Scans for mature crops, harvests, replants, and deposits excess yields. |
| `fish` | — | Travels to nearby water, casts fishing rod, and reels in fish and treasures. |
| `setchest` | `[category]` | Registers container under `ores`, `food`, `wood`, `mob`, `building`, or `default`. |
| `listchests` | — | Whispers all registered category chests and their coordinates. |
| `sortbase` | — | Automatically deposits and sorts inventory into category chests. |
| `sethome` | — | Updates home anchor coordinates to current position. |
| `follow` | — | Follows the owner directly. |
| `stay` / `stop` | — | Halts all movement and actions immediately. |
| `roam` | — | Naturally wanders and patrols the base anchor area. |
| `eat` | — | Forces the bot to consume food from inventory. |
| `sleep` | — | Locates the nearest bed and sleeps through the night. |
| `drop` | — | Empties inventory on the ground for the owner. |
| `status` | — | Privately reports HP, hunger points, active mode, and patrol status. |

---

## 🛠️ Modular Architecture

```
public/                 # Live Web Dashboard frontend
├── index.html          # Glassmorphic cyber-fantasy dashboard UI
├── dashboard.css       # Design system & animations
└── dashboard.js        # Canvas radar, SSE client & telemetry rendering
src/
├── index.js            # Bot lifecycle, Mineflayer plugins, shared context (ctx)
├── config.js           # Configuration loader with env variable support
├── state.js            # BotState model (tracking active states & coordinates)
├── commands.js         # Chat & whisper command parser
├── loops.js            # Autonomous background intervals (farming, defense, roaming)
├── modules/            # Autonomous feature modules
│   ├── web/
│   │   └── server.js   # Native HTTP server with SSE telemetry & command API
│   ├── dialogue.js     # Human-like conversation & anti-interruption filter
│   ├── clutch.js       # Water bucket MLG clutch & fall damage negation
│   ├── scaffold.js     # Auto-bridging & vertical tower climbing
│   ├── lumber.js       # Auto-lumberjack & sapling replanter
│   ├── mining.js       # Smart ore vein miner & branch tunnel excavator
│   ├── smelter.js      # Furnace automation & auto-smelting
│   ├── rancher.js      # Animal breeding & livestock management
│   ├── combat.js       # Shield reflexes, archer kiting, bodyguard escort
│   ├── patrol.js       # Perimeter sentry radar & waypoint walking
│   ├── crafting.js     # Auto-crafter & autonomous tool replenisher
│   ├── courier.js      # Base chest item retrieval & owner delivery
│   ├── death.js        # Death marker logging & corpse retrieval
│   ├── farming.js      # Farmland-safe crop harvesting, replanting, O(1) scans
│   ├── fishing.js      # Water detection, bobber casting, bite splash detection
│   ├── chest.js        # Multi-chest smart sorting, restocking, inventory drops
│   ├── navigation.js   # Movement setup, stuck detection, lifelike roaming
│   ├── social.js       # Shift-greeting recognition & head tracking
│   └── survival.js     # Food consumption, off-hand totem/shield, bed sleeping
└── utils/              # Helper utilities
    ├── block.js        # Safe block mining with timeout protection
    └── chat.js         # Humanized chat delays & whisper replies
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
