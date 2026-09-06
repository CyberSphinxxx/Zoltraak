# 🧙‍♂️ Zoltraak - Autonomous Minecraft Companion Bot

[![Node.js Version](https://img.shields.io/badge/node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Mineflayer](https://img.shields.io/badge/Mineflayer-4.38%2B-blue.svg)](https://github.com/PrismarineJS/mineflayer)
[![Minecraft Version](https://img.shields.io/badge/Minecraft-1.21.2-orange.svg)](https://minecraft.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Zoltraak** is an intelligent, human-like autonomous companion bot designed for modern Minecraft servers (`1.21.x`). Unlike basic AFK bots, Zoltraak interacts naturally with player mechanics, defends its owner, manages crop farms without trampling soil, catches fish autonomously, manages storage chests, and greets players using authentic community mannerisms.

---

## ✨ Features

- **🤝 Authentic Shift-Greeting:** Detects when a nearby player crouches twice within 2.5 seconds and responds by locking eye gaze, double-crouching, and swinging its arm.
- **🛡️ Dynamic Bodyguard & Escort (`guard`):** Follows the designated owner at a tight 3-block escort distance. Automatically targets, intercepts, and neutralizes hostile mobs that approach the owner. While the owner is stationary, Zoltraak faces outwards to watch their back.
- **🌾 Infinite Crop Farming & Farmland-Safe Replanting (`farm`):**
  - Uses native $O(1)$ block palette scans to locate mature crops (`wheat`, `carrots`, `potatoes`, `beetroots`) without freezing server keepalive packets.
  - Harvests and replants from a 2-block reach distance to eliminate farmland trampling and player hitbox collisions.
  - Automatically preserves at least 16 carrots, 16 potatoes, and 32 seeds in its inventory for eating and continuous farming.
- **🎣 Autonomous AFK Fishing (`fish`):** Locates water bodies, casts a fishing rod, detects bite splashes, and deposits caught fish, enchanted books, and treasures when full.
- **📦 Smart Base Chest Auto-Deposit (`deposit`):** Safely travels to registered base chests (`setchest`), deposits mob drops and farm yields, and rests.
- **🔨 Automatic Tool Restocking:** When tools or weapons break or run out, Zoltraak visits the base chest and restocks appropriate replacements.
- **🍗 Active Food Consumption & Anti-Starvation:** Continuously eats stored food (`carrots`, `bread`, `cooked salmon`, `golden carrots`) when hunger drops below 18. Dynamically disables sprinting when starved to prevent sprint-particle lockups.
- **🛌 Bed Sleeping & Night Patrol (`sleep`):** Automatically seeks out and sleeps in nearby beds during thunderstorms or night time.
- **⚔️ Tactical Combat & Shield Parrying:** Equips highest-tier weapons, blocks incoming skeleton arrows with offhand shields, switches to Totems of Undying when low on health, and tactically retreats from charging creepers.
- **🤫 Discreet Whisper-Only Control:** Controlled entirely through private in-game whispers (`/msg Zoltraak <cmd>`), keeping public chat clean. Only responds to its designated owner.

---

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- A Minecraft Server (`Paper`, `Purpur`, `Spigot`, or `Fabric`) supporting Minecraft `1.21.x`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/zoltraak.git
   cd zoltraak
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the bot:**
   Copy `config.example.json` to `config.json`:
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
   npm start
   ```
   *(Or on Windows, double-click `start_zoltraak.bat`)*

---

## 💬 Command Reference

All commands can be sent privately via `/msg Zoltraak <command>` or `/tell Zoltraak <command>`:

| Command | Description |
| :--- | :--- |
| `guard` / `bodyguard` | Follows within 3 blocks, shields your back, and intercepts hostiles. |
| `farm` | Scans for mature crops, harvests them, replants, and deposits excess yields. |
| `fish` | Travels to nearby water, casts fishing rod, and reels in fish and treasures. |
| `roam` | Naturally wanders and patrols the base anchor area. |
| `follow` / `come` | Follows the owner directly. |
| `stay` / `stop` | Halts all movement and combat immediately. |
| `setchest` | Registers the container (chest, barrel, shulker) you are standing next to. |
| `deposit` | Walks to the registered chest and deposits excess loot and crops. |
| `sethome` | Updates home anchor coordinates to current position. |
| `eat` | Forces the bot to consume food from inventory. |
| `sleep` | Locates the nearest bed and sleeps through the night. |
| `drop` | Empties inventory on the ground for the owner. |
| `status` | Privately reports HP, hunger points, and current active state. |

---

## 🛠️ Architecture & Hardening

- **Keepalive Timeout Prevention:** Full 32-block cube scans are replaced with native block ID palette lookups (`findBlocks`), reducing CPU scan time from ~30s down to <1ms.
- **Digging Timeout Wrapper:** All block destruction is wrapped in an asynchronous promise timeout to prevent bot freezes inside GriefPrevention claims or laggy network states.
- **Anti-Spam Pre-Movement Bypass:** Performs a micro-displacement jump on spawn to satisfy anti-bot and anti-spam verification plugins.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
