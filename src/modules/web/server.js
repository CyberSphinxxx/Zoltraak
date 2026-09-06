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

let perceptionLogs = [];

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

function addPerceptionLog(category, message, details = {}) {
  const entry = {
    id: Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
    category: (category || 'SENSORY').toUpperCase(),
    message,
    details
  };
  perceptionLogs.push(entry);
  if (perceptionLogs.length > 100) perceptionLogs.shift();
  broadcastEvent('perceptionLog', entry);
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
      environment: {
        biome: 'Connecting...',
        light: 15,
        skyLight: 15,
        blockLight: 0,
        groundBlock: 'grass_block',
        weather: 'Clear',
        solarPhase: 'Day',
        timeVal: 6000
      },
      gaze: {
        type: 'horizon',
        name: 'Scanning Horizon...',
        dist: null
      },
      facing: {
        cardinal: 'South',
        yawDeg: 0,
        pitchDeg: 0
      },
      visibleEntities: [],
      recentLogs,
      perceptionLogs
    };
  }

  // Calculate nearby entities with FOV & relative bearings
  const entities = [];
  const visibleEntities = [];
  const yaw = bot.entity.yaw || 0;
  const pitch = bot.entity.pitch || 0;
  const viewDirX = -Math.sin(yaw);
  const viewDirZ = -Math.cos(yaw);

  if (bot.entities) {
    for (const id in bot.entities) {
      const ent = bot.entities[id];
      if (!ent || !ent.position || ent.id === bot.entity.id) continue;
      const dist = bot.entity.position.distanceTo(ent.position);
      if (dist <= 36) {
        const isHostile = ent.name && HOSTILE_MOBS.includes(ent.name.toLowerCase());
        const isPlayer = ent.type === 'player';
        const isOwner = isPlayer && ent.username && config.owner && ent.username.toLowerCase() === config.owner.toLowerCase();

        // Direction & FOV calculation
        const dx = ent.position.x - bot.entity.position.x;
        const dz = ent.position.z - bot.entity.position.z;
        const entDirX = dx / (dist || 1);
        const entDirZ = dz / (dist || 1);
        const dot = viewDirX * entDirX + viewDirZ * entDirZ;
        const cross = viewDirX * entDirZ - viewDirZ * entDirX;
        const angleDiffRad = Math.atan2(cross, dot);
        const angleDiffDeg = Math.round((angleDiffRad * 180) / Math.PI);

        const inFov = Math.abs(angleDiffDeg) <= 45;
        let bearing = 'Ahead';
        if (Math.abs(angleDiffDeg) <= 25) bearing = 'Directly Ahead';
        else if (angleDiffDeg > 25 && angleDiffDeg <= 110) bearing = 'Right';
        else if (angleDiffDeg < -25 && angleDiffDeg >= -110) bearing = 'Left';
        else bearing = 'Behind';

        const entData = {
          id: ent.id,
          name: ent.username || ent.displayName || ent.name,
          type: ent.type,
          isHostile,
          isPlayer,
          isOwner,
          x: Math.round(ent.position.x * 10) / 10,
          y: Math.round(ent.position.y * 10) / 10,
          z: Math.round(ent.position.z * 10) / 10,
          dist: Math.round(dist * 10) / 10,
          yaw: ent.yaw || 0,
          inFov,
          bearing,
          angleDiffDeg,
          yDiff: Math.round((ent.position.y - bot.entity.position.y) * 10) / 10
        };

        entities.push(entData);
        visibleEntities.push(entData);
      }
    }
  }

  // Sort visible entities by proximity
  visibleEntities.sort((a, b) => a.dist - b.dist);

  // Environment data
  let currentBiome = 'Plains';
  let lightLevel = 15;
  let skyLight = 15;
  let blockLight = 0;
  let groundBlock = 'grass_block';

  if (bot.blockAt && bot.entity && bot.entity.position) {
    try {
      const curBlock = bot.blockAt(bot.entity.position);
      if (curBlock) {
        if (curBlock.biome && curBlock.biome.name) {
          currentBiome = curBlock.biome.name.replace('minecraft:', '').replace(/_/g, ' ');
        }
        if (typeof curBlock.light === 'number') lightLevel = curBlock.light;
        if (typeof curBlock.skyLight === 'number') skyLight = curBlock.skyLight;
        if (typeof curBlock.blockLight === 'number') blockLight = curBlock.blockLight;
      }
      const under = bot.blockAt(bot.entity.position.offset(0, -1, 0));
      if (under && under.name) groundBlock = under.name.replace('minecraft:', '');
    } catch (e) {}
  }

  // Gaze / Line of Sight crosshair target
  let gazeTarget = null;
  if (typeof bot.entityAtCursor === 'function') {
    try {
      const entAtCursor = bot.entityAtCursor(32);
      if (entAtCursor) {
        gazeTarget = {
          type: 'entity',
          name: entAtCursor.username || entAtCursor.displayName || entAtCursor.name,
          entityType: entAtCursor.type,
          dist: Math.round(bot.entity.position.distanceTo(entAtCursor.position) * 10) / 10
        };
      }
    } catch (e) {}
  }

  if (!gazeTarget && typeof bot.blockAtCursor === 'function') {
    try {
      const blkAtCursor = bot.blockAtCursor(6);
      if (blkAtCursor && blkAtCursor.name && blkAtCursor.name !== 'air' && blkAtCursor.name !== 'cave_air') {
        gazeTarget = {
          type: 'block',
          name: blkAtCursor.name.replace('minecraft:', ''),
          dist: Math.round(bot.entity.position.distanceTo(blkAtCursor.position) * 10) / 10
        };
      }
    } catch (e) {}
  }

  // Facing orientation
  const pitchDeg = Math.round((pitch * 180) / Math.PI);
  let deg = (yaw * 180 / Math.PI) % 360;
  if (deg < 0) deg += 360;

  let cardinal = 'South';
  if (deg >= 337.5 || deg < 22.5) cardinal = 'South';
  else if (deg >= 22.5 && deg < 67.5) cardinal = 'South-West';
  else if (deg >= 67.5 && deg < 112.5) cardinal = 'West';
  else if (deg >= 112.5 && deg < 157.5) cardinal = 'North-West';
  else if (deg >= 157.5 && deg < 202.5) cardinal = 'North';
  else if (deg >= 202.5 && deg < 247.5) cardinal = 'North-East';
  else if (deg >= 247.5 && deg < 292.5) cardinal = 'East';
  else if (deg >= 292.5 && deg < 337.5) cardinal = 'South-East';

  const facing = {
    cardinal,
    yawDeg: Math.round(deg),
    pitchDeg
  };

  // Solar & Weather
  const timeVal = bot.time ? bot.time.timeOfDay : 0;
  let solarPhase = 'Day';
  if (timeVal >= 23000 || timeVal < 1000) solarPhase = 'Sunrise';
  else if (timeVal >= 1000 && timeVal < 12000) solarPhase = 'Day';
  else if (timeVal >= 12000 && timeVal < 13500) solarPhase = 'Sunset';
  else solarPhase = 'Night';

  const weather = bot.thunderState > 0 ? 'Thunder' : (bot.isRaining ? 'Rain' : 'Clear');

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

  const ownerEntity = bot.players?.[config.owner]?.entity;

  return {
    connected: true,
    botName: bot.username,
    ownerName: config.owner,
    state: state?.currentState || 'ROAM',
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
    home: state?.homePos || config.home || null,
    chest: state?.chestPos || config.chest || null,
    chests: config.chests || {},
    clutchEnabled: ctx.isClutchEnabled ? ctx.isClutchEnabled() : true,
    patrolWaypoints: state?.patrolWaypoints || [],
    currentPatrolIndex: state?.currentPatrolIndex || 0,
    serverHost: config.host || 'localhost',
    serverPort: config.port || 25565,
    version: config.version || '1.21.2',
    ownerNearby: !!ownerEntity,
    ownerDist: ownerEntity ? Math.round(bot.entity.position.distanceTo(ownerEntity.position) * 10) / 10 : null,
    entities,
    visibleEntities,
    environment: {
      biome: currentBiome,
      light: lightLevel,
      skyLight,
      blockLight,
      groundBlock,
      weather,
      solarPhase,
      timeVal
    },
    gaze: gazeTarget || { type: 'horizon', name: 'Scanning Horizon...', dist: null },
    facing,
    inventory,
    recentLogs,
    perceptionLogs
  };
}

let activeCtx = null;
let perceptionInterval = null;
let lastGazeName = null;
const mobSightings = new Map();
let lastBiomeName = null;
let lastDarkAlertTime = 0;
let lastPerimeterScanTime = 0;

function runPerceptionScan(ctx) {
  if (!ctx || !ctx.bot || !ctx.bot.entity) return;
  const { bot, config, state } = ctx;
  const now = Date.now();

  // 1. Hostile Mobs Sighting Check
  if (bot.entities) {
    for (const id in bot.entities) {
      const ent = bot.entities[id];
      if (!ent || !ent.position || ent.id === bot.entity.id) continue;
      const isHostile = ent.name && HOSTILE_MOBS.includes(ent.name.toLowerCase());
      if (isHostile) {
        const dist = Math.round(bot.entity.position.distanceTo(ent.position) * 10) / 10;
        if (dist <= 20) {
          const lastSeen = mobSightings.get(ent.id) || 0;
          if (now - lastSeen > 12000) {
            mobSightings.set(ent.id, now);
            const mobName = ent.name.replace(/_/g, ' ').toUpperCase();
            addPerceptionLog('THREAT', `Hostile ${mobName} detected ${dist}m away - calculating tactical response`, {
              mob: ent.name,
              dist
            });
          }
        }
      }
    }
  }

  // Clean old mob sightings
  for (const [id, time] of mobSightings.entries()) {
    if (now - time > 30000) mobSightings.delete(id);
  }

  // 2. Gaze / Line of sight focus shift check
  if (typeof bot.entityAtCursor === 'function') {
    try {
      const target = bot.entityAtCursor(32);
      if (target) {
        const targetName = target.username || target.displayName || target.name;
        if (targetName && targetName !== lastGazeName) {
          lastGazeName = targetName;
          const dist = Math.round(bot.entity.position.distanceTo(target.position) * 10) / 10;
          const isPlayer = target.type === 'player';
          const isOwner = isPlayer && target.username && config.owner && target.username.toLowerCase() === config.owner.toLowerCase();
          const tag = isOwner ? 'owner' : (isPlayer ? 'player' : target.name);
          addPerceptionLog('FOCUS', `Locked gaze on ${tag} "${targetName}" (${dist}m)`, { target: targetName, dist });
        }
      } else {
        lastGazeName = null;
      }
    } catch (e) {}
  }

  // 3. Environmental changes (Biome & Mob Spawn Light Danger)
  if (bot.blockAt && bot.entity.position) {
    try {
      const curBlock = bot.blockAt(bot.entity.position);
      if (curBlock) {
        const bName = curBlock.biome?.name ? curBlock.biome.name.replace('minecraft:', '').replace(/_/g, ' ') : null;
        if (bName && bName !== lastBiomeName) {
          if (lastBiomeName !== null) {
            addPerceptionLog('ENV', `Traversed biome border into: ${bName.toUpperCase()}`, { biome: bName });
          }
          lastBiomeName = bName;
        }

        const bLight = typeof curBlock.blockLight === 'number' ? curBlock.blockLight : 0;
        const isNight = bot.time && (bot.time.timeOfDay >= 13000 && bot.time.timeOfDay <= 23000);
        if (bLight === 0 && (isNight || bot.game?.dimension === 'the_nether')) {
          if (now - lastDarkAlertTime > 30000) {
            lastDarkAlertTime = now;
            addPerceptionLog('ENV', `Area block light level is 0 - hostile mob spawn hazard`, { blockLight: bLight });
          }
        }
      }
    } catch (e) {}
  }

  // 4. Routine Perimeter Sweep (Every 20s)
  if (now - lastPerimeterScanTime > 20000) {
    lastPerimeterScanTime = now;
    let entCount = 0;
    if (bot.entities) {
      for (const id in bot.entities) {
        if (bot.entities[id] && bot.entities[id].id !== bot.entity.id) entCount++;
      }
    }
    const stateName = (state && state.currentState) ? state.currentState : 'ROAM';
    addPerceptionLog('SENSORY', `Perimeter scan: ${entCount} entities tracked within radar. Autonomous mode: [${stateName}].`, {
      trackedCount: entCount,
      state: stateName
    });
  }
}

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

          // Handle command internally through command system (whisper responses to owner)
          const targetCtx = activeCtx || ctx;
          handleCommand(targetCtx, targetCtx.config.owner, cmd, true);

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

    // 6. API: Drop inventory item
    if (pathname === '/api/inventory/drop' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { slot, count } = JSON.parse(body || '{}');
          const targetCtx = activeCtx || ctx;
          const bot = targetCtx?.bot;

          if (!bot || !bot.inventory) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Bot not connected' }));
            return;
          }

          const item = bot.inventory.slots[slot];
          if (!item) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: `No item in slot ${slot}` }));
            return;
          }

          const dropCount = (count === 'all' || count >= item.count) ? item.count : (parseInt(count, 10) || 1);

          try {
            await bot.toss(item.type, null, dropCount);
            const msg = `Dropped ${dropCount}x ${item.name}`;
            addLog('system', 'System', msg);
            console.log(`[Zoltraak Web] ${msg} (slot ${slot})`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, dropped: dropCount, item: item.name }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Bad request: ' + err.message }));
        }
      });
      return;
    }

    // 7. API: Equip inventory item to hand or offhand
    if (pathname === '/api/inventory/equip' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { slot, destination } = JSON.parse(body || '{}');
          const targetCtx = activeCtx || ctx;
          const bot = targetCtx?.bot;

          if (!bot || !bot.inventory) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Bot not connected' }));
            return;
          }

          const item = bot.inventory.slots[slot];
          if (!item) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: `No item in slot ${slot}` }));
            return;
          }

          // destination: 'hand' | 'off-hand' | 'head' | 'torso' | 'legs' | 'feet'
          const dest = destination || 'hand';
          try {
            await bot.equip(item, dest);
            const msg = `Equipped ${item.name} to ${dest}`;
            addLog('system', 'System', msg);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, equipped: item.name, destination: dest }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Bad request: ' + err.message }));
        }
      });
      return;
    }


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

  // Start sensory & perception scan loop (every 1.8s)
  perceptionInterval = setInterval(() => {
    runPerceptionScan(activeCtx || ctx);
  }, 1800);

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
  if (perceptionInterval) {
    clearInterval(perceptionInterval);
    perceptionInterval = null;
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
  addPerceptionLog,
  broadcastEvent
};
