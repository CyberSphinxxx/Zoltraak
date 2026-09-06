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
  return cfg;
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
    config = {
      host: 'localhost',
      port: 25565,
      username: 'Zoltraak',
      owner: 'Owner',
      version: '1.21.2',
      roamRadius: 16,
      autoSleep: true,
      autoDefend: true,
      autoFarm: true
    };
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
  loadConfig,
  getConfig,
  saveConfig,
  configPath
};
