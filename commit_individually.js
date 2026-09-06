const { execSync } = require('child_process');
const path = require('path');

/**
 * List of files to commit individually, with tailored, unique commit messages.
 * Ordered logically from security/config -> core modules -> web dashboard -> integrations -> documentation -> script.
 */
const commits = [
  {
    file: 'config.json',
    action: 'untrack',
    message: 'chore(security): untrack local config.json to safeguard private host and owner credentials'
  },
  {
    file: '.gitignore',
    action: 'add',
    message: 'chore(git): ignore local config.json to prevent committing sensitive server credentials'
  },
  {
    file: 'push_to_github.bat',
    action: 'remove',
    message: 'chore(scripts): remove push_to_github batch script in favor of manual push workflow'
  },
  {
    file: 'requirements.txt',
    action: 'add',
    message: 'docs(env): update requirements.txt with runtime dependencies and ecosystem notes'
  },
  {
    file: 'config.example.json',
    action: 'add',
    message: 'feat(config): expand config template with privacy, combat, navigation, and automation schemas'
  },
  {
    file: 'src/config.js',
    action: 'add',
    message: 'feat(config): implement deep merging, default fallbacks, and dashboard environment settings'
  },
  {
    file: 'src/state.js',
    action: 'add',
    message: 'feat(state): extend bot state machine to support autonomous modules, patrol, and death tracking'
  },
  {
    file: 'src/utils/chat.js',
    action: 'add',
    message: 'feat(chat): implement multi-audience privacy routing, whitelist filter, and silent mode'
  },
  {
    file: 'src/modules/navigation.js',
    action: 'add',
    message: 'feat(nav): implement active anti-stuck watchdog, auto-jump assist, and goal tolerances'
  },
  {
    file: 'src/modules/combat.js',
    action: 'add',
    message: 'feat(combat): implement active shield projectile parrying and archer ranged kiting stance'
  },
  {
    file: 'src/modules/survival.js',
    action: 'add',
    message: 'feat(survival): make auto-eat hunger threshold and totem emergency trigger configurable'
  },
  {
    file: 'src/modules/lumber.js',
    action: 'add',
    message: 'feat(lumber): add autonomous tree felling, vertical log harvesting, and sapling replanting'
  },
  {
    file: 'src/modules/mining.js',
    action: 'add',
    message: 'feat(mining): add intelligent ore vein prospecting and 1x2 tunnel stripmining engine'
  },
  {
    file: 'src/modules/smelter.js',
    action: 'add',
    message: 'feat(smelter): implement automated furnace detection, ore cooking, and fuel loading'
  },
  {
    file: 'src/modules/rancher.js',
    action: 'add',
    message: 'feat(rancher): implement livestock detection, selective animal breeding, and population caps'
  },
  {
    file: 'src/modules/patrol.js',
    action: 'add',
    message: 'feat(patrol): add multi-waypoint sentry perimeter patrol navigation and route recording'
  },
  {
    file: 'src/modules/crafting.js',
    action: 'add',
    message: 'feat(crafting): add autonomous workbench crafting engine and tool replenishment logic'
  },
  {
    file: 'src/modules/courier.js',
    action: 'add',
    message: 'feat(courier): implement base chest inventory retrieval and direct item delivery to owner'
  },
  {
    file: 'src/modules/death.js',
    action: 'add',
    message: 'feat(death): add death coordinate logging, tombstone telemetry, and corpse retrieval routing'
  },
  {
    file: 'src/modules/web/server.js',
    action: 'add',
    message: 'feat(web): build native HTTP server with Server-Sent Events telemetry and REST control API'
  },
  {
    file: 'public/index.html',
    action: 'add',
    message: 'feat(dashboard): create glassmorphic real-time web dashboard interface with command console'
  },
  {
    file: 'public/dashboard.css',
    action: 'add',
    message: 'style(dashboard): design modern dark glassmorphism styling, responsive grid, and radar UI'
  },
  {
    file: 'public/dashboard.js',
    action: 'add',
    message: 'feat(dashboard): implement real-time SSE client, canvas radar minimap, and control actions'
  },
  {
    file: 'src/loops.js',
    action: 'add',
    message: 'feat(loops): schedule periodic sentry patrol, shield intercept, lumber, and tool restock cycles'
  },
  {
    file: 'src/commands.js',
    action: 'add',
    message: 'feat(commands): register chat commands for lumber, mining, smelting, ranching, crafting, and patrol'
  },
  {
    file: 'src/index.js',
    action: 'add',
    message: 'feat(core): bind web dashboard, death event handlers, context methods, and chat audit logging'
  },
  {
    file: 'start_zoltraak.bat',
    action: 'add',
    message: 'chore(scripts): update startup launcher with npm fallback and automatic web dashboard launch'
  },
  {
    file: 'CONTRIBUTING.md',
    action: 'add',
    message: 'docs(contributing): document autonomous modules, web dashboard architecture, and workflows'
  },
  {
    file: 'README.md',
    action: 'add',
    message: 'docs(readme): update documentation with new autonomous modules, web dashboard, and commands'
  },
  {
    file: 'commit_individually.js',
    action: 'add',
    message: 'chore(scripts): add automated script to commit files individually with unique messages'
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
console.log('🚀 Starting individual file commits...');
console.log('====================================================\n');

let count = 0;

for (const entry of commits) {
  const normFile = entry.file.split('/').join(path.sep);

  if (entry.action === 'untrack') {
    // If tracked in index, untrack it
    run(`git rm --cached "${normFile}"`);
  } else if (entry.action === 'remove') {
    run(`git rm "${normFile}"`);
  } else {
    run(`git add "${normFile}"`);
  }

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
  console.log(`[${count}] Committed: ${entry.file}`);
  console.log(`    └─ ${lastCommit}\n`);
}

// Final status check
const remaining = run('git status --porcelain');
if (remaining) {
  console.warn('⚠️ Remaining uncommitted changes:\n' + remaining);
} else {
  console.log('====================================================');
  console.log('🎉 All files successfully committed one by one!');
  console.log('====================================================');
  console.log('Working tree is clean. Ready for manual git push.');
}
