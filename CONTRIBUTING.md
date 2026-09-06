# 🛠️ Contributing to Zoltraak & Developer Guide

Thank you for your interest in contributing to Zoltraak! Whether you are forking Zoltraak to customize it for your private server or developing new autonomous behaviors to contribute back, this guide will help you get started quickly.

---

## 🚀 Quickstart for Forking & Local Development

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher ([Node 20+ LTS](https://nodejs.org/) recommended)
- **npm**: `v9.0.0` or higher
- A Minecraft server (`1.21.x` compatible: Paper, Purpur, Fabric, or Spigot)

> **Coming from Python?** Check out [requirements.txt](requirements.txt) for an environment and dependency overview. In Node.js, `npm install` is the equivalent of `pip install -r requirements.txt`.

### 2. Fork & Clone
1. Click **Fork** in the top right corner of the [Zoltraak GitHub repository](https://github.com/CyberSphinxxx/Zoltraak).
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/Zoltraak.git
   cd Zoltraak
   ```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configuration
Zoltraak automatically generates `config.json` from `config.example.json` if none exists on first run. You can also customize your settings directly:
```bash
# On Linux/macOS
cp config.example.json config.json

# On Windows (cmd)
copy config.example.json config.json
```

Edit `config.json` with your server host, port, and your Minecraft username:
```json
{
  "host": "localhost",
  "port": 25565,
  "username": "Zoltraak",
  "owner": "YourMinecraftUsername",
  "version": "1.21.2"
}
```

> **Tip:** You can also use environment variables (or a `.env` file) to override any configuration setting without editing `config.json`. See [.env.example](.env.example).

### 5. Running in Development (Watch Mode)
Run the bot with Node's native file watcher. Any time you save a `.js` file, Zoltraak will automatically restart:
```bash
npm run dev
```

If you prefer standard execution:
```bash
npm start
```

Or run directly in **VS Code**: Press `F5` to start debugging with the pre-configured `.vscode/launch.json`.

---

## 🐳 Docker Quickstart

If you prefer running Zoltraak in an isolated container:
```bash
# Build and run using Docker Compose
docker compose up -d

# View bot logs
docker compose logs -f
```

---

## 📂 Architecture & Codebase Map

Zoltraak is organized into clean, modular subsystems under `src/`:

```
Zoltraak/
├── bot.js                  # Entry point with crash-safety handlers
├── config.json             # Active bot configuration (auto-generated if missing)
├── config.example.json     # Default configuration template
├── package.json            # Node.js dependencies and scripts
├── requirements.txt        # Polyglot dependency reference
├── Dockerfile              # Docker container build specification
├── docker-compose.yml      # Multi-container / local orchestration
├── src/
│   ├── index.js            # Bot lifecycle, Mineflayer plugins, shared context (ctx)
│   ├── config.js           # Configuration loader with env variable support
│   ├── state.js            # BotState model (tracking active states & coordinates)
│   ├── commands.js         # Chat & whisper command parser
│   ├── loops.js            # Autonomous background intervals (farming, defense, roaming)
│   ├── modules/            # Autonomous feature modules
│   │   ├── combat.js       # Target selection, mob defense, bodyguard escort, weapon equip
│   │   ├── farming.js      # Farmland-safe crop harvesting, replanting, O(1) scans
│   │   ├── fishing.js      # Water detection, bobber casting, bite splash detection
│   │   ├── chest.js        # Base chest deposits, item restocking, inventory drops
│   │   ├── navigation.js   # Movement setup, stuck detection, lifelike roaming
│   │   ├── social.js       # Shift-greeting recognition & head tracking
│   │   └── survival.js     # Food consumption, off-hand totem/shield, bed sleeping
│   └── utils/              # Helper utilities
│       ├── block.js        # Safe block mining with timeout protection
│       └── chat.js         # Humanized chat delays & whisper replies
```

### The Shared Context (`ctx`)
All modules communicate through a shared context object `ctx` instantiated in `src/index.js`. It provides unified access to:
- `ctx.bot`: The Mineflayer bot instance.
- `ctx.state`: The `BotState` instance tracking coordinates, current state, and cooldowns.
- `ctx.config`: The active configuration object.
- `ctx.mcData`: Minecraft data provider for block, item, and entity IDs.
- `ctx.sendReply(text, isWhisper)`: Humanized chat output helper.
- Module actions (`ctx.depositIntoChest()`, `ctx.eatIfHungry()`, etc.).

---

## 💡 How-To Guides

### Tutorial 1: Adding a New In-Game Command

All commands received via `/msg Zoltraak <command>` or public `!<command>` are handled in `src/commands.js`.

To add a new command (for example, `jump` or `spin`):

1. Open `src/commands.js`.
2. Locate the `switch (cmd)` block in `handleCommand()`.
3. Add your new command case:

```javascript
case 'jump': {
  ctx.sendReply('Boing!', isWhisper);
  ctx.bot.setControlState('jump', true);
  setTimeout(() => {
    ctx.bot.setControlState('jump', false);
  }, 350);
  break;
}
```

4. Save the file. If running with `npm run dev`, the bot restarts automatically!
5. Test in-game by whispering `/msg Zoltraak jump`.

---

### Tutorial 2: Creating a New Autonomous Behavior Module

Suppose you want to add a module that automatically cuts down trees or lights torches.

1. Create a new file under `src/modules/`, e.g., `src/modules/torches.js`:
   ```javascript
   // src/modules/torches.js
   async function placeTorchIfDark(ctx) {
     const { bot, mcData, state } = ctx;
     if (!bot.entity || state.currentState === 'COMBAT') return;

     const lightLevel = bot.world.getBlock(bot.entity.position)?.light;
     if (lightLevel !== undefined && lightLevel < 4) {
       const torchItem = bot.inventory.items().find(i => i.name === 'torch');
       if (torchItem) {
         // Place torch logic here...
       }
     }
   }

   module.exports = { placeTorchIfDark };
   ```

2. Export the function in `src/index.js` and attach it to `ctx`:
   ```javascript
   const { placeTorchIfDark } = require('./modules/torches');
   // ... inside ctx:
   placeTorchIfDark: () => placeTorchIfDark(ctx)
   ```

3. Schedule it in `src/loops.js`:
   ```javascript
   const torchInterval = setInterval(async () => {
     try {
       await ctx.placeTorchIfDark();
     } catch (err) {}
   }, 15000);
   intervals.push(torchInterval);
   ```

---

## 🛡️ Coding Best Practices

1. **Non-blocking Execution:** Never block Node's single-threaded event loop. Wrap digging and long operations with timeout handlers (see `digWithTimeout` in `src/utils/block.js`).
2. **Crash Resilience:** Avoid throwing uncaught errors in event handlers or intervals. Always wrap async promises with `.catch(...)` or `try { ... } catch (e) { ... }`.
3. **Safe State Switching:** When initiating long actions (like depositing into a chest), set `state.currentState = 'ACTION'` and restore the previous state in a `finally` block to prevent command overlaps.
4. **Authentic Player Mannerisms:** Use `sendReply` in `src/utils/chat.js` for replies. It applies randomized micro-delays (400–800ms) to emulate human typing speed.

---

## 🤝 Submitting Changes & Pull Requests

1. **Create a Feature Branch:**
   ```bash
   git checkout -b feature/awesome-new-feature
   ```
2. **Test Your Changes:**
   Verify your code runs cleanly without uncaught exceptions on your test Minecraft server.
3. **Commit Your Changes:**
   ```bash
   git commit -m "feat(combat): add tactical shield cooldown management"
   ```
4. **Push to Your Fork:**
   ```bash
   git push origin feature/awesome-new-feature
   ```
5. **Open a Pull Request:**
   Submit a PR to the `main` branch of [CyberSphinxxx/Zoltraak](https://github.com/CyberSphinxxx/Zoltraak). Describe what your changes do and how you verified them.
