const { goals } = require('mineflayer-pathfinder');
const { startGuardFollow, stopGuardFollow } = require('./modules/navigation');

const COMMAND_NAMES = [
  'come', 'follow', 'guard', 'bodyguard', 'stay', 'stop', 'roam',
  'sethome', 'setchest', 'listchests', 'chests', 'sort', 'sortbase', 'deposit',
  'farm', 'fish', 'fishing', 'lumber', 'chop', 'wood', 'mine', 'tunnel', 'stripminer',
  'smelt', 'cook', 'breed', 'ranch', 'archer', 'snipe', 'patrol', 'sentry', 'addpatrol',
  'addpoint', 'clearpatrol', 'craft', 'bring', 'deliver', 'recover', 'corpse', 'tomb',
  'eat', 'sleep', 'drop', 'skin', 'status', 'bridge', 'tower', 'scaffold', 'clutch', 'help'
];

function handleCommand(ctx, username, message, isWhisper = false) {
  const { bot, state, config } = ctx;

  const raw = (message || '').trim();
  const startsWithBang = raw.startsWith('!');
  const botName = (bot?.username || config?.username || 'zoltraak').toLowerCase();
  const prefixRegex = new RegExp(`^@?(${botName}|zoltraak)[:,]?\\s+`, 'i');
  const startsWithName = prefixRegex.test(raw);

  // In public chat (isWhisper === false), commands MUST start with '!' or mention the bot's name
  if (!isWhisper && !startsWithBang && !startsWithName) {
    return false;
  }

  let clean = raw;
  if (startsWithBang) {
    clean = clean.substring(1).trim();
  } else if (startsWithName) {
    clean = clean.replace(prefixRegex, '').trim();
  }

  const args = clean.split(/\s+/);
  const command = args[0]?.toLowerCase();

  // If this is not a registered command name, let dialogue engine handle it
  if (!command || !COMMAND_NAMES.includes(command)) {
    return false;
  }

  // Dedicated reply helper: Command responses ALWAYS whisper directly to the commanding player
  const reply = (text, minDelay = 200, maxDelay = 450) => {
    ctx.sendReply(text, true, username, minDelay, maxDelay);
  };

  const isAuthorized = username === config.owner || (config.privacy && Array.isArray(config.privacy.whitelist) && config.privacy.whitelist.includes(username));
  if (!isAuthorized) {
    if (startsWithBang || isWhisper) {
      if (Math.random() < 0.25) reply('?');
    }
    return true; // Consumed unauthorized command attempt
  }

  console.log('[Zoltraak] ' + (isWhisper ? '[WHISPER-CMD]' : '[CHAT-CMD]') + ' from ' + username + ': ' + clean);

  const followDist = config.navigation?.followDistance || 2;

  switch (command) {
    case 'come':
    case 'follow': {
      const player = bot.players[username]?.entity;
      if (!player) {
        reply('where are you?');
        return true;
      }
      state.currentState = 'FOLLOW';
      state.followTarget = player;
      bot.pathfinder.setGoal(new goals.GoalFollow(player, followDist), true);
      const followReplies = ['k', 'coming', 'on my way', 'gotchu'];
      reply(followReplies[Math.floor(Math.random() * followReplies.length)]);
      break;
    }

    case 'guard':
    case 'bodyguard': {
      const player = bot.players[username]?.entity;
      if (!player) {
        reply('where are you?');
        return true;
      }
      state.currentState = 'GUARD';
      state.followTarget = player;
      startGuardFollow(ctx, player);
      reply('got your back');
      break;
    }

    case 'stay':
    case 'stop': {
      state.currentState = 'IDLE';
      state.followTarget = null;
      stopGuardFollow();
      bot.pathfinder.setGoal(null);
      bot.pvp.stop();
      if (bot.clearControlStates) bot.clearControlStates();
      reply('k');
      break;
    }

    case 'roam': {
      state.currentState = 'ROAM';
      state.followTarget = null;
      reply('alright');
      ctx.performLifeLikeRoaming();
      break;
    }

    case 'sethome': {
      state.homePos = bot.entity.position.clone();
      config.home = { x: Math.round(state.homePos.x), y: Math.round(state.homePos.y), z: Math.round(state.homePos.z) };
      ctx.saveConfig();
      reply('home set here');
      break;
    }

    case 'setchest': {
      const category = args[1] || 'default';
      ctx.registerChest(category, true, username);
      break;
    }

    case 'listchests':
    case 'chests': {
      ctx.listChests(true, username);
      break;
    }

    case 'sort':
    case 'sortbase':
    case 'deposit': {
      ctx.sortBase(true, username);
      break;
    }

    case 'farm': {
      state.currentState = 'FARM';
      reply('on it');
      ctx.checkAndFarmCrops();
      break;
    }

    case 'fish':
    case 'fishing': {
      state.currentState = 'FISHING';
      reply('heading to fish');
      ctx.startFishingLoop(true, username);
      break;
    }

    case 'lumber':
    case 'chop':
    case 'wood': {
      state.currentState = 'LUMBER';
      reply('chopping wood...');
      ctx.checkAndLumber();
      break;
    }

    case 'mine': {
      const oreTarget = args[1] || 'all';
      state.currentState = 'MINING';
      reply(`prospecting for ${oreTarget}...`);
      ctx.mineTargetOre(oreTarget).then(found => {
        if (!found) reply(`no ${oreTarget} found nearby`);
      });
      break;
    }

    case 'tunnel':
    case 'stripminer': {
      const steps = parseInt(args[1], 10) || 8;
      state.currentState = 'MINING';
      reply(`excavating 1x2 tunnel (${steps} blocks)...`);
      ctx.digTunnel(steps);
      break;
    }

    case 'smelt':
    case 'cook': {
      reply('loading furnace...');
      ctx.operateSmelter().then(worked => {
        if (!worked) reply('no furnace found or nothing to smelt');
      });
      break;
    }

    case 'breed':
    case 'ranch': {
      const species = args[1] || 'all';
      reply(`breeding ${species}...`);
      ctx.breedAnimals(species).then(worked => {
        if (!worked) reply('no eligible animal pairs or breeding food available');
      });
      break;
    }

    case 'archer':
    case 'snipe': {
      state.currentState = 'ARCHER';
      reply('archer stance active');
      ctx.performArcherCombat();
      break;
    }

    case 'patrol':
    case 'sentry': {
      state.currentState = 'PATROL';
      reply('starting sentry perimeter patrol');
      ctx.performPatrolStep();
      break;
    }

    case 'addpatrol':
    case 'addpoint': {
      const player = bot.players[username]?.entity;
      const targetPos = player ? player.position : bot.entity.position;
      const total = ctx.addPatrolWaypoint(targetPos);
      reply(`waypoint #${total} recorded at ${Math.round(targetPos.x)}, ${Math.round(targetPos.z)}`);
      break;
    }

    case 'clearpatrol': {
      ctx.clearPatrolWaypoints();
      reply('patrol route cleared');
      break;
    }

    case 'craft': {
      const itemToCraft = args[1];
      const count = parseInt(args[2], 10) || 1;
      if (!itemToCraft) {
        reply('usage: !craft <item_name> [count]');
        return true;
      }
      reply(`attempting to craft ${count}x ${itemToCraft}...`);
      ctx.craftItem(itemToCraft, count).then(success => {
        if (success) {
          reply(`crafted ${count}x ${itemToCraft}!`);
        } else {
          reply(`unable to craft ${itemToCraft} (missing ingredients or table)`);
        }
      });
      break;
    }

    case 'bring':
    case 'deliver': {
      const itemToDeliver = args[1];
      const count = parseInt(args[2], 10) || 1;
      if (!itemToDeliver) {
        reply('usage: !bring <item_name> [count]');
        return true;
      }
      ctx.deliverItemToOwner(itemToDeliver, count, true, username);
      break;
    }

    case 'recover':
    case 'corpse':
    case 'tomb': {
      ctx.recoverCorpse(true, username);
      break;
    }

    case 'eat': {
      ctx.eatIfHungry(true);
      reply('eating');
      break;
    }

    case 'sleep': {
      reply('sec finding bed');
      ctx.trySleepInBed();
      break;
    }

    case 'drop': {
      ctx.dropInventory();
      break;
    }

    case 'skin': {
      if (args[1]) {
        bot.chat('/skin set ' + args[1]);
        reply('k');
      }
      break;
    }

    case 'status': {
      const hp = Math.round(bot.health);
      const food = Math.round(bot.food);
      const waypoints = state.patrolWaypoints ? state.patrolWaypoints.length : 0;
      reply(`hp: ${hp}/20 | food: ${food}/20 | mode: ${state.currentState.toLowerCase()} | patrol pts: ${waypoints}`);
      break;
    }

    case 'bridge': {
      const length = parseInt(args[1], 10) || 8;
      const dir = args[2] || 'forward';
      ctx.bridge(length, dir, true, username);
      break;
    }

    case 'tower':
    case 'scaffold': {
      const height = parseInt(args[1], 10) || 5;
      ctx.tower(height, true, username);
      break;
    }

    case 'clutch': {
      let mode;
      if (args[1]) {
        mode = args[1].toLowerCase() === 'on' || args[1].toLowerCase() === 'true';
      }
      const enabled = ctx.toggleClutch(mode);
      reply(`Water MLG clutch is now: ${enabled ? 'ENABLED' : 'DISABLED'}`);
      break;
    }

    case 'help': {
      reply('Combat: guard, archer, patrol, addpatrol, clearpatrol | Move: bridge, tower, follow, roam, stop, sethome');
      reply('Auto: lumber, mine, tunnel, smelt, breed, craft, bring, farm, fish | Base: setchest, listchests, sortbase, recover, eat, sleep, drop, clutch, status');
      break;
    }
  }
  return true;
}

module.exports = {
  COMMAND_NAMES,
  handleCommand
};
