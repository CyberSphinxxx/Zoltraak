const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { handleCommand } = require('../../commands');
const { HOSTILE_MOBS } = require('../combat');

let server = null;
let sseClients = [];
let telemetryInterval = null;
const recentLogs = [];

const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function addLog(type, sender, message) {
  const entry = {
    id: Date.now() + Math.random(),
    time: new Date().toLocaleTimeString(),
    type,
    sender,
    message
  };
  recentLogs.push(entry);
  if (recentLogs.length > 80) recentLogs.shift();
  broadcastEvent('log', entry);
}

function broadcastEvent(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients = sseClients.filter(res => {
    try {
      res.write(payload);
      return true;
    } catch (e) {
      return false;
    }
  });
}

function getTelemetrySnapshot(ctx) {
  const { bot, state, config } = ctx;
  if (!bot || !bot.entity) {
    return {
      connected: false,
      botName: config?.username || 'Zoltraak',
      ownerName: config?.owner || 'Owner',
      serverHost: config?.host || 'localhost',
      serverPort: config?.port || 25565,
      version: config?.version || '1.21.2',
      state: state?.currentState || 'CONNECTING',
      config: config || {},
      recentLogs
    };
  }

  // Calculate nearby entities
  const entities = [];
  if (bot.entities) {
    for (const id in bot.entities) {
      const ent = bot.entities[id];
      if (!ent || !ent.position || ent.id === bot.entity.id) continue;
      const dist = bot.entity.position.distanceTo(ent.position);
      if (dist <= 36) {
        const isHostile = ent.name && HOSTILE_MOBS.includes(ent.name.toLowerCase());
        const isPlayer = ent.type === 'player';
        entities.push({
          id: ent.id,
          name: ent.username || ent.displayName || ent.name,
          type: ent.type,
          isHostile,
          isPlayer,
          x: Math.round(ent.position.x * 10) / 10,
          y: Math.round(ent.position.y * 10) / 10,
          z: Math.round(ent.position.z * 10) / 10,
          dist: Math.round(dist * 10) / 10,
          yaw: ent.yaw || 0
        });
      }
    }
  }

  // Map inventory
  const inventory = [];
  if (bot.inventory && bot.inventory.slots) {
    for (let i = 0; i < bot.inventory.slots.length; i++) {
      const item = bot.inventory.slots[i];
      if (item) {
        inventory.push({
          slot: i,
          name: item.name,
          displayName: item.displayName || item.name,
          count: item.count,
          type: item.type
        });
      }
    }
  }

  const ownerEntity = bot.players[config.owner]?.entity;

  return {
    connected: true,
    botName: bot.username,
    ownerName: config.owner,
    state: state.currentState,
    health: Math.round(bot.health || 20),
    food: Math.round(bot.food || 20),
    saturation: Math.round(bot.foodSaturation || 5),
    oxygen: Math.round(bot.oxygenLevel || 20),
    x: Math.round(bot.entity.position.x * 10) / 10,
    y: Math.round(bot.entity.position.y * 10) / 10,
    z: Math.round(bot.entity.position.z * 10) / 10,
    yaw: bot.entity.yaw,
    pitch: bot.entity.pitch,
    dimension: (bot.game && bot.game.dimension) ? bot.game.dimension : 'overworld',
    timeOfDay: bot.time ? bot.time.timeOfDay : 0,
    isRaining: !!bot.isRaining,
    home: state.homePos || config.home || null,
    chest: state.chestPos || config.chest || null,
    patrolWaypoints: state.patrolWaypoints || [],
    currentPatrolIndex: state.currentPatrolIndex || 0,
    serverHost: config.host || 'localhost',
    serverPort: config.port || 25565,
    version: config.version || '1.21.2',
    ownerNearby: !!ownerEntity,
    ownerDist: ownerEntity ? Math.round(bot.entity.position.distanceTo(ownerEntity.position) * 10) / 10 : null,
    entities,
    inventory,
    recentLogs
  };
}

let activeCtx = null;

function startWebServer(ctx) {
  activeCtx = ctx;
  if (server) return; // Keep server running across bot reconnects

  const config = ctx.config || {};
  if (config.dashboardEnabled === false) {
    console.log('[Zoltraak Web] Dashboard is disabled by configuration.');
    return;
  }

  const port = config.dashboardPort || 3000;

  server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    const pathname = reqUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. API: Server-Sent Events stream
    if (pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write('\n');
      sseClients.push(res);

      // Send initial state immediately
      const initial = getTelemetrySnapshot(activeCtx || ctx);
      res.write(`event: telemetry\ndata: ${JSON.stringify(initial)}\n\n`);

      req.on('close', () => {
        sseClients = sseClients.filter(c => c !== res);
      });
      return;
    }

    // 2. API: Snapshot state
    if (pathname === '/api/state' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getTelemetrySnapshot(activeCtx || ctx)));
      return;
    }

    // 3. API: Dispatch command
    if (pathname === '/api/command' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const cmd = (parsed.command || '').trim();
          if (!cmd) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No command provided' }));
            return;
          }

          console.log(`[Zoltraak Web] Dispatched command from web: ${cmd}`);
          addLog('command', 'Web User', cmd);

          // Handle command internally through command system
          const targetCtx = activeCtx || ctx;
          handleCommand(targetCtx, targetCtx.config.owner, cmd, false);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, command: cmd }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // 4. API: Retrieve configuration
    if (pathname === '/api/config' && req.method === 'GET') {
      const targetCtx = activeCtx || ctx;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, config: targetCtx?.config || {} }));
      return;
    }

    // 5. API: Update configuration with conditional hot-reloading
    if (pathname === '/api/config' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const targetCtx = activeCtx || ctx;
          if (!targetCtx || !targetCtx.config) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Configuration unavailable' }));
            return;
          }

          const current = targetCtx.config;

          // Check if core connection parameters changed
          const hostChanged = parsed.host !== undefined && parsed.host.trim() !== current.host;
          const portChanged = parsed.port !== undefined && parseInt(parsed.port, 10) !== current.port;
          const userChanged = parsed.username !== undefined && parsed.username.trim() !== current.username;
          const verChanged = parsed.version !== undefined && parsed.version.trim() !== current.version;
          const connectionChanged = hostChanged || portChanged || userChanged || verChanged;

          // 1. Connection & Identity
          if (parsed.host !== undefined) current.host = parsed.host.trim();
          if (parsed.port !== undefined) current.port = parseInt(parsed.port, 10) || 25565;
          if (parsed.username !== undefined) current.username = parsed.username.trim();
          if (parsed.owner !== undefined) current.owner = parsed.owner.trim();
          if (parsed.version !== undefined) current.version = parsed.version.trim();

          // 2. Core Toggles
          if (parsed.roamRadius !== undefined) current.roamRadius = parseInt(parsed.roamRadius, 10) || 16;
          if (parsed.autoSleep !== undefined) current.autoSleep = !!parsed.autoSleep;
          if (parsed.autoDefend !== undefined) current.autoDefend = !!parsed.autoDefend;
          if (parsed.autoFarm !== undefined) current.autoFarm = !!parsed.autoFarm;

          // 3. Privacy & Audience Settings
          if (parsed.privacy) {
            current.privacy = current.privacy || {};
            if (parsed.privacy.audienceMode !== undefined) current.privacy.audienceMode = parsed.privacy.audienceMode;
            if (Array.isArray(parsed.privacy.whitelist)) {
              current.privacy.whitelist = parsed.privacy.whitelist.map(u => String(u).trim()).filter(Boolean);
            }
            if (parsed.privacy.silentMode !== undefined) current.privacy.silentMode = !!parsed.privacy.silentMode;
            if (parsed.privacy.botPrefix !== undefined) current.privacy.botPrefix = parsed.privacy.botPrefix;
          }

          // 4. Combat & Defense Settings
          if (parsed.combat) {
            current.combat = current.combat || {};
            if (parsed.combat.targetPriority !== undefined) current.combat.targetPriority = parsed.combat.targetPriority;
            if (parsed.combat.shieldParry !== undefined) current.combat.shieldParry = !!parsed.combat.shieldParry;
            if (parsed.combat.shieldParryDistance !== undefined) current.combat.shieldParryDistance = parseFloat(parsed.combat.shieldParryDistance) || 10;
            if (parsed.combat.archerKiteDistance !== undefined) current.combat.archerKiteDistance = parseFloat(parsed.combat.archerKiteDistance) || 8;
            if (parsed.combat.totemThreshold !== undefined) current.combat.totemThreshold = parseFloat(parsed.combat.totemThreshold) || 12;
            if (parsed.combat.creeperAvoidance !== undefined) current.combat.creeperAvoidance = !!parsed.combat.creeperAvoidance;
          }

          // 5. Navigation & Movement Settings
          if (parsed.navigation) {
            current.navigation = current.navigation || {};
            if (parsed.navigation.followDistance !== undefined) current.navigation.followDistance = parseFloat(parsed.navigation.followDistance) || 3;
            if (parsed.navigation.allowSprinting !== undefined) {
              current.navigation.allowSprinting = !!parsed.navigation.allowSprinting;
              if (targetCtx.bot?.pathfinder?.movements) {
                targetCtx.bot.pathfinder.movements.allowSprinting = current.navigation.allowSprinting;
              }
            }
            if (parsed.navigation.autoJumpAssist !== undefined) current.navigation.autoJumpAssist = !!parsed.navigation.autoJumpAssist;
            if (parsed.navigation.antiStuckTimeout !== undefined) current.navigation.antiStuckTimeout = parseInt(parsed.navigation.antiStuckTimeout, 10) || 600;
          }

          // 6. Automation & Resource Settings
          if (parsed.automation) {
            current.automation = current.automation || {};
            if (parsed.automation.autoEatThreshold !== undefined) current.automation.autoEatThreshold = parseInt(parsed.automation.autoEatThreshold, 10) || 15;
            if (parsed.automation.autoReplantSaplings !== undefined) current.automation.autoReplantSaplings = !!parsed.automation.autoReplantSaplings;
            if (parsed.automation.mineBranchLength !== undefined) current.automation.mineBranchLength = parseInt(parsed.automation.mineBranchLength, 10) || 16;
            if (parsed.automation.mineTorchSpacing !== undefined) current.automation.mineTorchSpacing = parseInt(parsed.automation.mineTorchSpacing, 10) || 6;
            if (parsed.automation.breedLimit !== undefined) current.automation.breedLimit = parseInt(parsed.automation.breedLimit, 10) || 12;
          }

          targetCtx.saveConfig();

          if (connectionChanged) {
            addLog('system', 'System', `Connection settings updated (${current.host}:${current.port}). Reconnecting bot...`);
            console.log(`[Zoltraak Web] Connection settings changed: reconnecting to ${current.host}:${current.port}...`);
            if (targetCtx.bot) {
              try {
                targetCtx.bot.end();
              } catch (e) {}
            }
          } else {
            addLog('system', 'System', 'Runtime configuration updated and hot-applied.');
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, reconnected: connectionChanged, config: current }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // 5. Static file server
    let reqPath = pathname === '/' ? '/index.html' : pathname;
    reqPath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, reqPath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fallback to index.html for SPA-like experience
        const fallbackPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(fallbackPath, (fbErr, content) => {
          if (fbErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Internal Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Zoltraak Web] Port ${port} is already in use. Retrying on port ${port + 1}...`);
      server.close();
      ctx.config.dashboardPort = port + 1;
      startWebServer(ctx);
    } else {
      console.error('[Zoltraak Web] Server Error: ' + err.message);
    }
  });

  server.listen(port, () => {
    console.log('====================================================');
    console.log(`🌐 Zoltraak Web Dashboard active at: http://localhost:${port}`);
    console.log('====================================================');
    addLog('system', 'System', `Dashboard initialized at http://localhost:${port}`);
  });

  // Start telemetry broadcast interval (every 250ms = 4 Hz)
  telemetryInterval = setInterval(() => {
    if (sseClients.length > 0) {
      const snap = getTelemetrySnapshot(activeCtx || ctx);
      broadcastEvent('telemetry', snap);
    }
  }, 250);

  // Optional 3D viewer integration if prismarine-viewer is installed
  try {
    const { mineflayer: viewer } = require('prismarine-viewer');
    if (ctx.bot && typeof viewer === 'function') {
      viewer(ctx.bot, { port: port + 7, firstPerson: true });
      console.log(`[Zoltraak Web] 3D First-Person Viewer active on port ${port + 7}`);
    }
  } catch (e) {
    // Graceful fallback to 2D tactical radar
  }
}

function stopWebServer() {
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
    telemetryInterval = null;
  }
  if (server) {
    server.close();
    server = null;
  }
  sseClients = [];
}

module.exports = {
  startWebServer,
  stopWebServer,
  addLog,
  broadcastEvent
};
