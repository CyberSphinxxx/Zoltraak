const { goals } = require('mineflayer-pathfinder');

function handleCommand(ctx, username, message, isWhisper = false) {
  const { bot, state, config } = ctx;

  const isAuthorized = username === config.owner || (config.privacy && Array.isArray(config.privacy.whitelist) && config.privacy.whitelist.includes(username));
  if (!isAuthorized) {
    if (message.startsWith('!') || isWhisper) {
      if (Math.random() < 0.25) ctx.sendReply('?', isWhisper);
    }
    return;
  }

  let clean = message.trim();
  if (clean.startsWith('!')) clean = clean.substring(1);
  const args = clean.split(' ');
  const command = args[0].toLowerCase();

  console.log('[Zoltraak] ' + (isWhisper ? '[WHISPER]' : '[CHAT]') + ' Command from ' + username + ': ' + clean);

  const followDist = config.navigation?.followDistance || 2;

  switch (command) {
    case 'come':
    case 'follow': {
      const player = bot.players[username]?.entity;
      if (!player) {
        ctx.sendReply('where are you?', isWhisper);
        return;
      }
      state.currentState = 'FOLLOW';
      state.followTarget = player;
      bot.pathfinder.setGoal(new goals.GoalFollow(player, followDist), true);
      const followReplies = ['k', 'coming', 'on my way', 'gotchu'];
      ctx.sendReply(followReplies[Math.floor(Math.random() * followReplies.length)], isWhisper);
      break;
    }

    case 'guard':
    case 'bodyguard': {
      const player = bot.players[username]?.entity;
      if (!player) {
        ctx.sendReply('where are you?', isWhisper);
        return;
      }
      state.currentState = 'GUARD';
      state.followTarget = player;
      bot.pathfinder.setGoal(new goals.GoalFollow(player, Math.max(2, followDist + 1)), true);
      ctx.sendReply('got your back', isWhisper);
      break;
    }

    case 'stay':
    case 'stop': {
      state.currentState = 'IDLE';
      state.followTarget = null;
      bot.pathfinder.setGoal(null);
      bot.pvp.stop();
      if (bot.clearControlStates) bot.clearControlStates();
      ctx.sendReply('k', isWhisper);
      break;
    }

    case 'roam': {
      state.currentState = 'ROAM';
      state.followTarget = null;
      ctx.sendReply('alright', isWhisper);
      ctx.performLifeLikeRoaming();
      break;
    }

    case 'sethome': {
      state.homePos = bot.entity.position.clone();
      config.home = { x: Math.round(state.homePos.x), y: Math.round(state.homePos.y), z: Math.round(state.homePos.z) };
      ctx.saveConfig();
      ctx.sendReply('home set here', isWhisper);
      break;
    }

    case 'setchest': {
      const chest = bot.findBlock({
        matching: block => block.name.includes('chest') || block.name.includes('barrel') || block.name.includes('shulker'),
        maxDistance: 6
      });
      if (chest) {
        state.chestPos = chest.position.clone();
        config.chest = { x: state.chestPos.x, y: state.chestPos.y, z: state.chestPos.z };
        ctx.saveConfig();
        ctx.sendReply('chest registered', isWhisper);
      } else {
        ctx.sendReply('stand near a chest first', isWhisper);
      }
      break;
    }

    case 'deposit': {
      ctx.sendReply('depositing...', isWhisper);
      ctx.depositIntoChest();
      break;
    }

    case 'farm': {
      state.currentState = 'FARM';
      ctx.sendReply('on it', isWhisper);
      ctx.checkAndFarmCrops();
      break;
    }

    case 'fish':
    case 'fishing': {
      state.currentState = 'FISHING';
      ctx.sendReply('heading to fish', isWhisper);
      ctx.startFishingLoop(isWhisper);
      break;
    }

    case 'lumber':
    case 'chop':
    case 'wood': {
      state.currentState = 'LUMBER';
      ctx.sendReply('chopping wood...', isWhisper);
      ctx.checkAndLumber();
      break;
    }

    case 'mine': {
      const oreTarget = args[1] || 'all';
      state.currentState = 'MINING';
      ctx.sendReply(`prospecting for ${oreTarget}...`, isWhisper);
      ctx.mineTargetOre(oreTarget).then(found => {
        if (!found) ctx.sendReply(`no ${oreTarget} found nearby`, isWhisper);
      });
      break;
    }

    case 'tunnel':
    case 'stripminer': {
      const steps = parseInt(args[1], 10) || 8;
      state.currentState = 'MINING';
      ctx.sendReply(`excavating 1x2 tunnel (${steps} blocks)...`, isWhisper);
      ctx.digTunnel(steps);
      break;
    }

    case 'smelt':
    case 'cook': {
      ctx.sendReply('loading furnace...', isWhisper);
      ctx.operateSmelter().then(worked => {
        if (!worked) ctx.sendReply('no furnace found or nothing to smelt', isWhisper);
      });
      break;
    }

    case 'breed':
    case 'ranch': {
      const species = args[1] || 'all';
      ctx.sendReply(`breeding ${species}...`, isWhisper);
      ctx.breedAnimals(species).then(worked => {
        if (!worked) ctx.sendReply('no eligible animal pairs or breeding food available', isWhisper);
      });
      break;
    }

    case 'archer':
    case 'snipe': {
      state.currentState = 'ARCHER';
      ctx.sendReply('archer stance active', isWhisper);
      ctx.performArcherCombat();
      break;
    }

    case 'patrol':
    case 'sentry': {
      state.currentState = 'PATROL';
      ctx.sendReply('starting sentry perimeter patrol', isWhisper);
      ctx.performPatrolStep();
      break;
    }

    case 'addpatrol':
    case 'addpoint': {
      const player = bot.players[username]?.entity;
      const targetPos = player ? player.position : bot.entity.position;
      const total = ctx.addPatrolWaypoint(targetPos);
      ctx.sendReply(`waypoint #${total} recorded at ${Math.round(targetPos.x)}, ${Math.round(targetPos.z)}`, isWhisper);
      break;
    }

    case 'clearpatrol': {
      ctx.clearPatrolWaypoints();
      ctx.sendReply('patrol route cleared', isWhisper);
      break;
    }

    case 'craft': {
      const itemToCraft = args[1];
      const count = parseInt(args[2], 10) || 1;
      if (!itemToCraft) {
        ctx.sendReply('usage: !craft <item_name> [count]', isWhisper);
        return;
      }
      ctx.sendReply(`attempting to craft ${count}x ${itemToCraft}...`, isWhisper);
      ctx.craftItem(itemToCraft, count).then(success => {
        if (success) {
          ctx.sendReply(`crafted ${count}x ${itemToCraft}!`, isWhisper);
        } else {
          ctx.sendReply(`unable to craft ${itemToCraft} (missing ingredients or table)`, isWhisper);
        }
      });
      break;
    }

    case 'bring':
    case 'deliver': {
      const itemToDeliver = args[1];
      const count = parseInt(args[2], 10) || 1;
      if (!itemToDeliver) {
        ctx.sendReply('usage: !bring <item_name> [count]', isWhisper);
        return;
      }
      ctx.deliverItemToOwner(itemToDeliver, count, isWhisper);
      break;
    }

    case 'recover':
    case 'corpse':
    case 'tomb': {
      ctx.recoverCorpse(isWhisper);
      break;
    }

    case 'eat': {
      ctx.eatIfHungry(true);
      ctx.sendReply('eating', isWhisper);
      break;
    }

    case 'sleep': {
      ctx.sendReply('sec finding bed', isWhisper);
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
        ctx.sendReply('k', isWhisper);
      }
      break;
    }

    case 'status': {
      const hp = Math.round(bot.health);
      const food = Math.round(bot.food);
      const waypoints = state.patrolWaypoints ? state.patrolWaypoints.length : 0;
      ctx.sendReply(`hp: ${hp}/20 | food: ${food}/20 | mode: ${state.currentState.toLowerCase()} | patrol pts: ${waypoints}`, isWhisper);
      break;
    }

    case 'help': {
      ctx.sendReply(
        'commands: follow, guard, stop, roam, lumber, mine, tunnel, smelt, breed, archer, patrol, addpatrol, clearpatrol, craft, bring, recover, farm, fish, eat, sleep, setchest, deposit, drop, status',
        isWhisper
      );
      break;
    }
  }
}

module.exports = {
  handleCommand
};
