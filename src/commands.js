const { goals } = require('mineflayer-pathfinder');

function handleCommand(ctx, username, message, isWhisper = false) {
  const { bot, state, config } = ctx;

  if (username !== config.owner) {
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
      bot.pathfinder.setGoal(new goals.GoalFollow(player, 2), true);
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
      bot.pathfinder.setGoal(new goals.GoalFollow(player, 3), true);
      ctx.sendReply('got your back', isWhisper);
      break;
    }

    case 'stay':
    case 'stop': {
      state.currentState = 'IDLE';
      state.followTarget = null;
      bot.pathfinder.setGoal(null);
      bot.pvp.stop();
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
      ctx.sendReply('hp: ' + hp + '/20 | food: ' + food + '/20 | ' + state.currentState.toLowerCase(), isWhisper);
      break;
    }

    case 'help': {
      ctx.sendReply('follow, guard, stop, roam, farm, fish, eat, sleep, setchest, deposit, drop, status', isWhisper);
      break;
    }
  }
}

module.exports = {
  handleCommand
};
