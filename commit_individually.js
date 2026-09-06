const { execSync } = require('child_process');
const path = require('path');

const commits = [
  {
    file: '.gitignore',
    message: 'chore(git): ignore local environment configs and secret override files'
  },
  {
    file: 'package.json',
    message: 'chore(pkg): add dev watch script, repository links, and minecraft-data dependency'
  },
  {
    file: 'package-lock.json',
    message: 'chore(pkg): update package-lock with minecraft-data and subdependencies'
  },
  {
    file: 'requirements.txt',
    message: 'docs: add requirements and environment dependency specification'
  },
  {
    file: '.env.example',
    message: 'chore(config): add environment variable template for bot settings'
  },
  {
    file: '.vscode/launch.json',
    message: 'chore(vscode): configure debug launch targets for development'
  },
  {
    file: 'Dockerfile',
    message: 'ci(docker): create multi-stage container image for isolated deployment'
  },
  {
    file: 'docker-compose.yml',
    message: 'ci(docker): add compose service configuration with environment binding'
  },
  {
    file: 'src/config.js',
    message: 'feat(config): implement centralized configuration loader with env overrides'
  },
  {
    file: 'src/state.js',
    message: 'feat(state): create state management class to track bot mode and targets'
  },
  {
    file: 'src/utils/chat.js',
    message: 'feat(utils): add humanized chat reply helper with randomized delay'
  },
  {
    file: 'src/utils/block.js',
    message: 'feat(utils): implement safe digging utility with timeout safeguard'
  },
  {
    file: 'src/modules/navigation.js',
    message: 'feat(nav): add pathfinding navigation, movement, and following module'
  },
  {
    file: 'src/modules/survival.js',
    message: 'feat(survival): add health monitoring, hunger auto-eat, and night sleep module'
  },
  {
    file: 'src/modules/combat.js',
    message: 'feat(combat): implement bodyguard threat detection and PvP defense module'
  },
  {
    file: 'src/modules/chest.js',
    message: 'feat(chest): implement chest finding, deposit, and loot sorting module'
  },
  {
    file: 'src/modules/farming.js',
    message: 'feat(farming): implement automated crop harvesting and replanting module'
  },
  {
    file: 'src/modules/fishing.js',
    message: 'feat(fishing): implement autonomous fishing rod and catch cycle module'
  },
  {
    file: 'src/modules/social.js',
    message: 'feat(social): add player greeting and shift-dance interaction module'
  },
  {
    file: 'src/loops.js',
    message: 'feat(loops): implement autonomous behavior schedulers and background intervals'
  },
  {
    file: 'src/commands.js',
    message: 'feat(commands): implement chat command registry and owner dispatch system'
  },
  {
    file: 'src/index.js',
    message: 'feat(core): implement bot initialization factory and event listener wiring'
  },
  {
    file: 'bot.js',
    message: 'refactor(entry): simplify root entrypoint to bootstrap modular architecture'
  },
  {
    file: 'CONTRIBUTING.md',
    message: 'docs: add comprehensive contributor guide, code standards, and workflows'
  },
  {
    file: 'README.md',
    message: 'docs: update readme with modular architecture, features, and setup instructions'
  },
  {
    file: 'commit_individually.js',
    message: 'chore(scripts): add automated script to commit files individually with unique messages'
  }
];

function run(command) {
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
  
  // Check if file has changes (either tracked modified or untracked)
  const status = run(`git status --porcelain "${normFile}"`);
  if (!status) {
    console.log(`⏩ [Skipped] No changes detected in: ${entry.file}`);
    continue;
  }

  // Stage and commit file
  run(`git add "${normFile}"`);
  run(`git commit -m "${entry.message}"`);
  
  const lastCommit = run('git log -1 --oneline');
  count++;
  console.log(`[${count}/${commits.length}] Committed ${entry.file}`);
  console.log(`   └─ ${lastCommit}\n`);
}

// Final status check
const remaining = run('git status --porcelain');
if (remaining) {
  console.warn('⚠️ Remaining uncommitted changes:\n' + remaining);
} else {
  console.log('🎉 All files successfully committed one by one!');
  console.log('Working tree is clean. Ready for manual git push.');
}
