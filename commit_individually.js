const { execSync } = require('child_process');
const path = require('path');

/**
 * List of files to commit individually, with tailored, unique commit messages.
 * Sequence: Core & Config -> Navigation & Social -> Combat & Clutches -> Logistics ->
 * Commands & Loops -> Core & Web Server -> Web UI Styling -> Web UI JS Modules ->
 * Launcher & Docs -> Script.
 */
const commits = [
  // 1. Core Config & Chat
  {
    file: 'src/config.js',
    message: 'feat(config): add configuration schemas for MLG clutch, bridging, and multi-chest storage'
  },
  {
    file: 'src/utils/chat.js',
    message: 'feat(chat): implement humanized typing delays, physical arm gestures, and anti-doxxing coords privacy'
  },
  // 2. Navigation & Social Movement
  {
    file: 'src/modules/navigation.js',
    message: 'feat(nav): enhance jump physics, horizontal collision recovery, and obstacle step assist'
  },
  {
    file: 'src/modules/social.js',
    message: 'feat(social): add contextual interaction triggers, eye contact tracking, and natural idling'
  },
  // 3. Combat, Clutches, and Movement Mechanics
  {
    file: 'src/modules/combat.js',
    message: 'feat(combat): implement reactive neutral aggressor tracking, raycast visibility, and guard radius'
  },
  {
    file: 'src/modules/clutch.js',
    message: 'feat(clutch): implement autonomous water bucket MLG clutch to negate high-velocity fall damage'
  },
  {
    file: 'src/modules/scaffold.js',
    message: 'feat(scaffold): implement sneak-assisted auto-bridging and vertical scaffold towering'
  },
  {
    file: 'src/modules/dialogue.js',
    message: 'feat(dialogue): add conversational intelligence with anti-interruption filter and 15s threading'
  },
  // 4. Logistics, Storage & Maintenance
  {
    file: 'src/modules/chest.js',
    message: 'feat(chest): implement multi-chest category storage registration and automated base inventory sorting'
  },
  {
    file: 'src/modules/courier.js',
    message: 'feat(courier): support multi-category chest searching for base item retrieval and delivery'
  },
  {
    file: 'src/modules/death.js',
    message: 'feat(death): capture dimension metadata and expanded inventory snapshot upon player death'
  },
  {
    file: 'src/modules/farming.js',
    message: 'perf(farming): optimize block scanning tolerances and farmland preservation checks'
  },
  {
    file: 'src/modules/fishing.js',
    message: 'feat(fishing): tune bobber splash sensitivity and automated recast cooldowns'
  },
  // 5. Commands, Loops & Core Bot Factory
  {
    file: 'src/commands.js',
    message: 'feat(commands): register chat commands for bridge, tower, clutch, setchest, listchests, and sortbase'
  },
  {
    file: 'src/loops.js',
    message: 'feat(loops): schedule periodic background checks for MLG clutch readiness and active conversation decay'
  },
  {
    file: 'src/index.js',
    message: 'feat(core): initialize dialogue listeners, MLG clutch event hooks, and multi-category chest handlers'
  },
  {
    file: 'src/modules/web/server.js',
    message: 'feat(web): add REST endpoints and SSE telemetry streams for sensory events and multi-chest data'
  },
  // 6. Web Dashboard Assets & Styling
  {
    file: 'public/zoltraak-logo.svg',
    message: 'feat(dashboard): add custom SVG brand logo and visual emblem for Zoltraak companion'
  },
  {
    file: 'public/css/base.css',
    message: 'style(dashboard): define typography, CSS reset, and fundamental layout variables'
  },
  {
    file: 'public/css/themes.css',
    message: 'style(dashboard): create dark, cyberpunk, and enchanted theme palettes with CSS custom properties'
  },
  {
    file: 'public/css/main.css',
    message: 'style(dashboard): assemble modular stylesheets into master dashboard application stylesheet'
  },
  {
    file: 'public/css/components/hud.css',
    message: 'style(dashboard): style vitals HUD cards, heart/food status bars, and coordinates readout'
  },
  {
    file: 'public/css/components/radar.css',
    message: 'style(dashboard): style canvas radar minimap, compass rose, range sliders, and entity legend'
  },
  {
    file: 'public/css/components/actions.css',
    message: 'style(dashboard): style quick action buttons, command bar, and control grid layout'
  },
  {
    file: 'public/css/components/sensory.css',
    message: 'style(dashboard): style real-time sensory log feed and audit event cards'
  },
  {
    file: 'public/css/components/settings.css',
    message: 'style(dashboard): style configuration form controls, sliders, switches, and toggles'
  },
  {
    file: 'public/css/components/toast.css',
    message: 'style(dashboard): add animation keyframes and glassmorphic toast notification styling'
  },
  {
    file: 'public/dashboard.css',
    message: 'style(dashboard): update legacy dashboard stylesheet to support multi-chest and tactical widgets'
  },
  {
    file: 'public/index.html',
    message: 'feat(dashboard): update dashboard markup with multi-chest panels, clutch status, and modular links'
  },
  // 7. Web Dashboard JavaScript Modules
  {
    file: 'public/js/package.json',
    message: 'feat(dashboard): declare ES module package configuration for client-side JavaScript architecture'
  },
  {
    file: 'public/js/api.js',
    message: 'feat(dashboard): implement HTTP REST API client for commands, chest management, and config'
  },
  {
    file: 'public/js/theme.js',
    message: 'feat(dashboard): implement dynamic theme switching controller with localStorage persistence'
  },
  {
    file: 'public/js/ui/tabs.js',
    message: 'feat(dashboard): implement accessible tab navigation switcher for dashboard views'
  },
  {
    file: 'public/js/ui/toast.js',
    message: 'feat(dashboard): create toast notification utility for status alerts and error reporting'
  },
  {
    file: 'public/js/components/hud.js',
    message: 'feat(dashboard): create vitals HUD component rendering dynamic health, food, and XYZ telemetry'
  },
  {
    file: 'public/js/components/radar.js',
    message: 'feat(dashboard): create interactive 2D canvas radar minimap with entity blips and heading cone'
  },
  {
    file: 'public/js/components/actions.js',
    message: 'feat(dashboard): create action panel controller for quick bot commands and mode dispatch'
  },
  {
    file: 'public/js/components/sensory.js',
    message: 'feat(dashboard): create sensory telemetry event logger for combat and interaction feeds'
  },
  {
    file: 'public/js/components/settings.js',
    message: 'feat(dashboard): create settings editor component binding live config values to REST API'
  },
  {
    file: 'public/js/main.js',
    message: 'feat(dashboard): create client entrypoint orchestrating SSE subscriptions and UI components'
  },
  {
    file: 'public/dashboard.js',
    message: 'feat(dashboard): update single-bundle client with multi-chest views, clutch toggles, and radar tweaks'
  },
  // 8. Launcher & Documentation
  {
    file: 'start_zoltraak.bat',
    message: 'chore(scripts): update startup launcher banner to Zoltraak Autonomous Tactical Companion'
  },
  {
    file: 'FEATURES.md',
    message: 'docs(features): add master catalog documenting all Zoltraak companion bot capabilities'
  },
  {
    file: 'USER_GUIDE.md',
    message: 'docs(guide): add comprehensive user guide detailing command manual, setup, and troubleshooting'
  },
  {
    file: 'README.md',
    message: 'docs(readme): update documentation with badges, bridging, clutch, multi-chest sorting, and guides'
  },
  // 9. Self-commit
  {
    file: 'commit_individually.js',
    message: 'chore(scripts): update commit automation script with sequence for all 45 feature and module files'
  }
];

function run(command) {
  try {
    return execSync(command, { stdio: 'pipe', encoding: 'utf-8' }).trim();
  } catch (err) {
    return null;
  }
}

function runStrict(command) {
  try {
    return execSync(command, { stdio: 'pipe', encoding: 'utf-8' }).trim();
  } catch (err) {
    console.error(`Failed to execute: ${command}`);
    if (err.stderr) console.error(err.stderr.toString());
    throw err;
  }
}

console.log('====================================================');
console.log('🚀 Starting individual file commits (45 files)...');
console.log('====================================================\n');

let count = 0;

for (const entry of commits) {
  const normFile = entry.file.split('/').join(path.sep);

  run(`git add "${normFile}"`);

  // Check if anything was actually staged for this file
  const staged = run('git diff --cached --name-only');
  if (!staged) {
    console.log(`⏩ [Skipped] No changes staged for: ${entry.file}`);
    continue;
  }

  // Commit with the custom unique message
  runStrict(`git commit -m "${entry.message}"`);

  const lastCommit = runStrict('git log -1 --oneline');
  count++;
  console.log(`[${count}/${commits.length}] Committed: ${entry.file}`);
  console.log(`    └─ ${lastCommit}\n`);
}

// Final status check
const remaining = run('git status --porcelain');
if (remaining) {
  console.warn('⚠️ Remaining uncommitted changes:\n' + remaining);
} else {
  console.log('====================================================');
  console.log(`🎉 All ${count} files successfully committed one by one!`);
  console.log('====================================================');
  console.log('Working tree is clean. Ready for manual git push.');
}
