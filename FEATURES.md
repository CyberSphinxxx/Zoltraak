# 🧙‍♂️ Zoltraak Master Feature List

This document serves as the comprehensive reference catalog of every subsystem, mechanic, autonomous behavior, and utility built into Zoltraak.

---

## 📑 Category Index
1. [🧠 Conversational Intelligence & Human Chat Engine](#1--conversational-intelligence--human-chat-engine)
2. [💧 Movement, Scaffolding & Physics Clutches](#2--movement-scaffolding--physics-clutches)
3. [⚔️ Tactical Combat & Defense](#3-️-tactical-combat--defense)
4. [🪓 Resource Gathering & Base Automation](#4--resource-gathering--base-automation)
5. [📦 Storage, Crafting & Logistics](#5--storage-crafting--logistics)
6. [🤝 Social & Human Mannerisms](#6--social--human-mannerisms)
7. [🛌 Survival & Self-Care](#7--survival--self-care)
8. [🌐 Web Dashboard & Real-Time Telemetry](#8--web-dashboard--real-time-telemetry)
9. [⚙️ Hardening, Stability & Anticheat Evasion](#9-️-hardening-stability--anticheat-evasion)

---

## 1. 🧠 Conversational Intelligence & Human Chat Engine

### Anti-Interruption Filtering
- **Word-Boundary Direct Mention:** Zoltraak ignores general public chatter between other players unless explicitly addressed by name (`\b(zoltraak|<botname>)\b`).
- **15-Second Conversation Threading:** Remembers who is actively chatting with the bot. Follow-up messages from the same user within 15 seconds do not require repeating the bot's name.
- **Face-to-Face Proximity Check:** Unnamed greetings (`hi`, `yo`, `sup`) only trigger if the player is standing within 4 blocks and looking directly toward Zoltraak.
- **Anti-Spam Rate Limiter:** Enforces a 3-second cooldown per player and a 1.5-second global output throttle to prevent trolls from flooding chat.
- **Anti-Doxxing Stranger Protection:** Base coordinates and chest positions are never revealed to non-whitelisted strangers.

### Context-Aware Intent Responses
- **Live Activity Reporting (`wyd`, `status`):** Inspects actual state and coordinates to reply with authentic gamer slang (*"farming wheat rn"*, *"mining at y=-58"*, *"heading to base to dump inventory"*).
- **Location Awareness:** Calculates relative distance to the speaker (*"right behind u"*, *"near the crop farm"*) or exact XYZ coordinates for authorized friends.
- **Banter & Praise:** Responds naturally to compliments (*"np :)"*, *"ez"*, *"all in a day's work"*).
- **In-Character Lore:** Embodies a humble, stoic mage companion inspired by Frieren.
- **Combat & Danger Warnings:** Responds to calls of danger (*"watch out!"*, *"creeper!"*) by equipping shields and checking surroundings.

### Human Chat Dynamics
- **Dynamic Typing Delay:** Calculates delay based on character count ($250\text{ms} + \text{charCount} \times 25\text{ms}$) instead of robotic instant bursts.
- **Physical Head Tracking:** Turns head to make eye contact with whoever mentioned Zoltraak while "typing" and swings its arm.

---

## 2. 💧 Movement, Scaffolding & Physics Clutches

### Water Bucket MLG Clutch (`src/modules/clutch.js`)
- **Physics Monitoring:** Detects airborne state, negative downward velocity ($v_y < -0.55$), and fall distance ($\ge 2.2$ blocks).
- **Downward Raycasting:** Scans 1–4 blocks beneath the bot for solid impact ground.
- **Impact Negation:** Quick-swaps `water_bucket` to main hand, aims straight down, and places water just before landing.
- **Auto-Retrieval:** Equips an empty bucket 350ms after landing, scoops the water block back up, and leaves zero mess.
- **Toggle Control:** Can be enabled or disabled via `!clutch on/off`.

### Auto-Bridging (`src/modules/scaffold.js`)
- **Sneak-Edge Walking:** Automatically engages sneak (`Shift`) so the bot cannot physically fall off edges.
- **Side-Face Placement:** Detects gaps ahead, aims at the edge face of the supporting block, places a building block, and steps forward.
- **Cardinal & Relative Heading:** Supports directional bridging (`north`, `south`, `east`, `west`, or current view direction).
- **Material Detection:** Automatically uses cobblestone, dirt, stone, deepslate, planks, sandstone, or netherrack.

### Vertical Scaffolding / Towering (`src/modules/scaffold.js`)
- Jumps, aims directly straight down, and places blocks at the apex of the jump to climb cliffs or build vertical pillars.

### Navigation Hardening (`src/modules/navigation.js`)
- **Auto-Jump Assistant:** Automatically hops when walking into 1-block elevation obstacles with clear overhead clearance.
- **Anti-Stuck Watchdog:** Detects path obstructions ($< 8\text{cm}$ displacement over 600ms), performs unstick hops, or steps backward to clear collisions.

---

## 3. ⚔️ Tactical Combat & Defense

### Reactive Shield Parrying (`src/modules/combat.js`)
- Monitors incoming projectiles (arrows, tridents, fireballs, wind charges) within 10 blocks.
- Calculates trajectory angle, snaps gaze toward the projectile, and raises off-hand shield to block damage.

### Creeper Blast Deflection
- Detects hissing or ignited creepers within 6 blocks.
- Sprints backward to maximize distance and raises shield to absorb explosive damage.

### Dynamic Bodyguard Escort (`!guard`)
- Maintains a tight 3-block escort distance behind the owner.
- Faces outward to watch the owner's back when stationary.
- Automatically targets, intercepts, and neutralizes hostile mobs approaching within 12 blocks.

### Ranged Archer Stance (`!archer`)
- Equips bow or crossbow and maintains a safe 8–15 block kiting distance.
- Compensates for projectile gravitational drop and charges shots.

### Sentry Perimeter Patrol (`!patrol`)
- **Autonomous Perimeter:** Generates and patrols a 4-corner boundary around home anchor coordinates.
- **Custom Waypoints:** Allows recording live points with `!addpatrol` and walks them in sequence.
- **Sentry Radar:** Breaks route to eliminate intruders before resuming patrol.

### Totem of Undying Quick-Swap
- Automatically equips a Totem of Undying into the off-hand if health falls below 12 HP.

---

## 4. 🪓 Resource Gathering & Base Automation

### Auto-Lumberjack & Stump Replanting (`src/modules/lumber.js`)
- Scans up to 24 blocks for trees (Oak, Birch, Spruce, Jungle, Acacia, Dark Oak, Cherry, Mangrove).
- Equips highest-tier axe, cuts logs from bottom to top, and replants saplings on the dirt stump.

### Smart Ore Miner (`src/modules/mining.js`)
- Targets specific ores (`coal`, `iron`, `gold`, `diamond`, `lapis`, `copper`, `redstone`, `debris`, or `all`).
- Equips pickaxes matching harvest hardness tiers (e.g. Iron pickaxe for Diamonds).

### Safe Branch Tunneling (`src/modules/mining.js`)
- Excavates 1×2 corridors for specified distances.
- Checks overhead for falling gravel/sand and checks forward for lava/water flow.
- Automatically places illumination torches on walls when light level drops below 7.

### Auto-Smelter (`src/modules/smelter.js`)
- Locates nearby furnaces, blast furnaces, or smokers.
- Extracts completed smelted ingots and cooked food.
- Restocks fuel (coal, charcoal, blaze rods, planks) and loads raw ores/meat.

### Livestock Rancher (`src/modules/rancher.js`)
- Scans for adult cows, sheep, pigs, and chickens.
- Equips matching food (wheat, carrots, seeds) and breeds pairs to produce offspring.

### Farmland-Safe Crop Farming (`src/modules/farming.js`)
- Uses native $O(1)$ block palette scans to find mature crops without freezing server keepalive packets.
- Harvests and replants from 2-block reach distance to eliminate farmland trampling.
- Preserves emergency food and seeds in inventory.

### Autonomous AFK Fishing (`src/modules/fishing.js`)
- Finds nearby water, casts fishing rod, detects bite splash packets, and reels in catches.

---

## 5. 📦 Storage, Crafting & Logistics

### Smart Multi-Chest Logistics (`src/modules/chest.js`)
- **Category Registration:** `!setchest <category>` supports `ores`, `food`, `wood`, `mob`, `building`, and `default`.
- **Auto-Sorting Base Deposit (`!sortbase`):** Sequentially pathfinds to each registered container and deposits only matching items.
- **Emergency Inventory Reservation:** Preserves 16 carrots, 16 potatoes, 32 seeds, weapons, armor, tools, and water buckets.
- **Chest List Inspection (`!listchests`):** Whispers all configured container locations.

### In-Field Auto-Crafter (`src/modules/crafting.js`)
- Resolves crafting recipes in player 2×2 grid or navigates to a crafting table for 3×3 recipes.
- Automatically crafts replacement pickaxes, axes, or swords if they break during tasks.

### Courier Delivery (`src/modules/courier.js`)
- `!bring <item> [count]`: Withdraws items from base chests and delivers them directly to the owner's live position.

### Corpse & Gear Recovery (`src/modules/death.js`)
- Hooks death events, records exact XYZ coordinates, dimension, timestamp, and inventory manifest.
- Command `!recover` directs Zoltraak to pathfind back, vacuum dropped items, and re-equip gear.

---

## 6. 🤝 Social & Human Mannerisms

### Authentic Shift-Greeting (`src/modules/social.js`)
- Detects when a nearby player crouches twice within 2.5 seconds.
- Locks eye gaze, double-crouches in sync, and swings its arm in greeting.

### Life-Like Head Tracking
- Smoothly tracks the gaze of nearby players walking within 16 blocks.

---

## 7. 🛌 Survival & Self-Care

### Anti-Starvation Auto-Eat (`src/modules/survival.js`)
- Continuously monitors hunger and consumes food when hunger drops below 18.
- Banned foods (`rotten_flesh`, `pufferfish`, `spider_eye`, `poisonous_potato`) are strictly avoided.

### Automatic Bed Sleeping (`src/modules/survival.js`)
- Automatically seeks out beds within 30 blocks and sleeps through thunderstorms or night time.

---

## 8. 🌐 Web Dashboard & Real-Time Telemetry

### 2D Canvas Radar Minimap
- Live top-down radar with dynamic range scaling (16m, 24m, 36m).
- Visualizes bot heading cone, nearby players, hostiles (red), passives (green), dropped items (yellow), and registered category chests (colored by type).
- Displays patrol waypoint trails.

### Live Telemetry HUD
- Real-time animated health hearts, hunger/saturation, dimension indicator, and XYZ coordinates with 1-click clipboard copy.

### Interactive 36-Slot Inventory Grid
- Full visualizer for 4 armor slots, offhand slot, 27 main inventory slots, and 9 hotbar slots with item count badges and tooltips.

### 1-Click Action Control Center
- Instant buttons for: `Guard`, `Farm`, `Lumber`, `Mine`, `Bridge`, `Tower`, `Sort Base`, `MLG Clutch`, `Fish`, `Patrol`, `Archer`, `Smelt`, `Breed`, `Deposit`, `Sleep`, `Stop`.

### Live Visual Perception & Sensory Feed ("What Zoltraak Sees")
- **Live Gaze & Crosshair Target Tracking:** Raycasts directly from the bot's eyes to detect whatever entity or block Zoltraak is currently gazing at in real time (`bot.entityAtCursor` / `bot.blockAtCursor`).
- **Environmental Senses HUD Bar:** Displays current Biome, total/sky/block light level (highlighting safe green vs red hazard when block light is 0 during night), solar time of day & weather, block type under feet, and cardinal orientation (`South`, `Yaw 0°`).
- **Entities In Sight (Live Vision Tracker):** Breaks down every mob, player, and animal within visual range into interactive cards detailing name, distance, relative bearing (`Directly Ahead`, `Right`, `Left`, `Behind`), central FOV status (`In View` vs `Peripheral`), and classification tags (`THREAT`, `Owner`, `Player`).
- **Sensory Observation Log Stream:** High-resolution perception event feed documenting what Zoltraak's sensory loops detect (`[SIGHT]`, `[THREAT]`, `[FOCUS]`, `[ENV]`, `[TACTICAL]`, `[SENSORY]`) with 1-click category filters (`All Senses`, `Sight & Mobs`, `Environment`) and clear feed controls.

### Live In-Browser Console & Remote Terminal
- Streams in-game chat, whispers, and system logs in real time with an interactive input bar to dispatch commands from your browser.

---

## 9. ⚙️ Hardening, Stability & Anticheat Evasion

- **Crash-Resistant Entrypoint:** Safety wrappers catch unhandled promise rejections and socket disconnects, cleanly resetting intervals and reconnecting.
- **Anti-Spam Pre-Movement Bypass:** Performs a micro-displacement jump on spawn to satisfy GriefPrevention pre-movement checks.
- **Digging Timeout Wrapper:** Wraps block destruction in timeout promises to prevent bot lockups inside claim plugins.
- **O(1) Palette Lookups:** Replaces 32-block cube scans with native ID palette lookups, reducing scan times from 30s to <1ms.
- **Docker & Headless Support:** Runs 24/7 in lightweight Docker containers or background VPS environments.
