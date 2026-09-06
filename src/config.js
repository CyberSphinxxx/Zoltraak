const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

const exampleConfigPath = path.join(__dirname, '..', 'config.example.json');

let config = {};

function applyEnvOverrides(cfg) {
  if (process.env.MC_HOST || process.env.MINECRAFT_HOST) {
    cfg.host = process.env.MC_HOST || process.env.MINECRAFT_HOST;
  }
  if (process.env.MC_PORT || process.env.MINECRAFT_PORT) {
    const port = parseInt(process.env.MC_PORT || process.env.MINECRAFT_PORT, 10);
    if (!isNaN(port)) cfg.port = port;
  }
  if (process.env.MC_USERNAME || process.env.MINECRAFT_USERNAME) {
    cfg.username = process.env.MC_USERNAME || process.env.MINECRAFT_USERNAME;
  }
  if (process.env.MC_OWNER || process.env.MINECRAFT_OWNER) {
    cfg.owner = process.env.MC_OWNER || process.env.MINECRAFT_OWNER;
  }
  if (process.env.MC_VERSION || process.env.MINECRAFT_VERSION) {
    cfg.version = process.env.MC_VERSION || process.env.MINECRAFT_VERSION;
  }
  if (process.env.MC_ROAM_RADIUS) {
    const radius = parseInt(process.env.MC_ROAM_RADIUS, 10);
    if (!isNaN(radius)) cfg.roamRadius = radius;
  }
  if (process.env.MC_AUTO_SLEEP !== undefined) {
    cfg.autoSleep = process.env.MC_AUTO_SLEEP === 'true';
  }
  if (process.env.MC_AUTO_DEFEND !== undefined) {
    cfg.autoDefend = process.env.MC_AUTO_DEFEND === 'true';
  }
  if (process.env.MC_AUTO_FARM !== undefined) {
    cfg.autoFarm = process.env.MC_AUTO_FARM === 'true';
  }
  if (process.env.DASHBOARD_PORT || process.env.PORT) {
    const dPort = parseInt(process.env.DASHBOARD_PORT || process.env.PORT, 10);
    if (!isNaN(dPort)) cfg.dashboardPort = dPort;
  }
  if (process.env.DASHBOARD_ENABLED !== undefined) {
    cfg.dashboardEnabled = process.env.DASHBOARD_ENABLED === 'true';
  }
  if (cfg.dashboardPort === undefined) cfg.dashboardPort = 3000;
  if (cfg.dashboardEnabled === undefined) cfg.dashboardEnabled = true;
  return cfg;
}

const DEFAULT_CONFIG = {
  host: 'localhost',
  port: 25565,
  username: 'Zoltraak',
  owner: 'Owner',
  version: '1.21.2',
  roamRadius: 16,
  autoSleep: true,
  autoDefend: true,
  autoFarm: true,
  dashboardPort: 3000,
  dashboardEnabled: true,
  privacy: {
    audienceMode: 'dynamic', // 'dynamic' | 'whisper_only' | 'whitelist_whisper' | 'public_chat'
    whitelist: ['Owner'],
    silentMode: false,
    botPrefix: ''
  },
  combat: {
    targetPriority: 'hostiles_only', // 'hostiles_only' | 'all_mobs' | 'player_defense'
    shieldParry: true,
    shieldParryDistance: 10,
    archerKiteDistance: 8,
    totemThreshold: 12,
    creeperAvoidance: true
  },
  navigation: {
    followDistance: 3,
    allowSprinting: false,
    autoJumpAssist: true,
    antiStuckTimeout: 600
  },
  automation: {
    autoEatThreshold: 15,
    autoReplantSaplings: true,
    mineBranchLength: 16,
    mineTorchSpacing: 6,
    breedLimit: 12
  },
  chat: {
    naturalChat: true,
    requireExplicitMention: true,
    conversationThreadTimeout: 15000,
    strangerSafeMode: true,
    humanTypingDelay: true,
    lookAtSpeaker: true
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else if (target[key] === undefined) {
      // Clone arrays so mutations do not leak
      target[key] = Array.isArray(source[key]) ? [...source[key]] : source[key];
    }
  }
  return target;
}

function loadConfig() {
  if (!fs.existsSync(configPath) && fs.existsSync(exampleConfigPath)) {
    try {
      fs.copyFileSync(exampleConfigPath, configPath);
      console.log('[Zoltraak Config] Notice: config.json not found. Created config.json from config.example.json.');
    } catch (copyErr) {
      console.warn('[Zoltraak Config] Could not auto-copy config.example.json:', copyErr.message);
    }
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(raw);
  } catch (err) {
    console.error('[Zoltraak Config] Error loading config.json, falling back to defaults:', err.message);
    config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  // Deep-merge defaults into config so any missing nested objects/fields exist
  config = deepMerge(config, JSON.parse(JSON.stringify(DEFAULT_CONFIG)));

  // Ensure owner is present in whitelist and clean placeholder
  if (config.owner && config.privacy && Array.isArray(config.privacy.whitelist)) {
    if (config.owner !== 'Owner') {
      config.privacy.whitelist = config.privacy.whitelist.filter(u => u !== 'Owner');
    }
    if (!config.privacy.whitelist.includes(config.owner)) {
      config.privacy.whitelist.unshift(config.owner);
    }
  }

  // Allow environment variables to override config.json values
  applyEnvOverrides(config);

  return config;
}

function getConfig() {
  if (!config || Object.keys(config).length === 0) {
    return loadConfig();
  }
  return config;
}

function saveConfig(updatedConfig) {
  if (updatedConfig) {
    config = updatedConfig;
  }
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('[Zoltraak Config] Error saving config.json:', err.message);
  }
}

// Load on initialization
loadConfig();

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  getConfig,
  saveConfig,
  deepMerge,
  configPath
};
