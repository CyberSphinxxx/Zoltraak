const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');

const CHEST_CATEGORIES = {
  ores: [
    'raw_iron', 'raw_gold', 'raw_copper', 'iron_ingot', 'gold_ingot', 'copper_ingot',
    'diamond', 'emerald', 'coal', 'lapis_lazuli', 'redstone', 'quartz', 'netherite_scrap',
    'netherite_ingot', 'amethyst_shard', 'iron_block', 'gold_block', 'diamond_block'
  ],
  food: [
    'wheat', 'carrot', 'potato', 'beetroot', 'bread', 'apple', 'golden_apple',
    'cooked_beef', 'cooked_porkchop', 'cooked_mutton', 'cooked_chicken', 'cooked_salmon', 'cooked_cod',
    'raw_beef', 'raw_porkchop', 'raw_mutton', 'raw_chicken', 'raw_salmon', 'raw_cod', 'golden_carrot',
    'sweet_berries', 'melon_slice', 'baked_potato'
  ],
  wood: [
    '_log', '_wood', '_planks', '_sapling', 'stick', 'bamboo', 'mangrove_roots'
  ],
  mob: [
    'rotten_flesh', 'bone', 'arrow', 'string', 'spider_eye', 'gunpowder', 'ender_pearl',
    'slime_ball', 'blaze_rod', 'ghast_tear', 'magma_cream', 'phantom_membrane', 'feather',
    'leather', 'ink_sac', 'glow_ink_sac', 'shulker_shell'
  ],
  building: [
    'cobblestone', 'stone', 'dirt', 'deepslate', 'cobbled_deepslate', 'diorite', 'granite',
    'andesite', 'gravel', 'sand', 'sandstone', 'netherrack', 'tuff', 'basalt', 'blackstone',
    'terracotta', 'bricks', 'glass'
  ]
};

const ESSENTIAL_ITEMS = ['water_bucket', 'bucket', 'shield', 'totem_of_undying'];

function getItemCategory(itemName) {
  for (const [cat, patterns] of Object.entries(CHEST_CATEGORIES)) {
    for (const pattern of patterns) {
      if (pattern.startsWith('_')) {
        if (itemName.endsWith(pattern) || itemName.includes(pattern)) return cat;
      } else if (itemName === pattern || itemName.includes(pattern)) {
        return cat;
      }
    }
  }
  return 'default';
}

function isKeepItem(item) {
  if (ESSENTIAL_ITEMS.includes(item.name)) return true;
  if (item.name.endsWith('_sword') || item.name.endsWith('_pickaxe') || item.name.endsWith('_axe') || item.name.endsWith('_shovel')) return true;
  if (item.name.endsWith('_helmet') || item.name.endsWith('_chestplate') || item.name.endsWith('_leggings') || item.name.endsWith('_boots')) return true;
  if (item.name === 'bow' || item.name === 'crossbow') return true;
  return false;
}

function registerChest(ctx, category = 'default', isWhisper = true, targetPlayer = null) {
  const { bot, config, state } = ctx;
  const targetCategory = (category || 'default').toLowerCase();

  const chestBlock = bot.findBlock({
    matching: block => block.name.includes('chest') || block.name.includes('barrel') || block.name.includes('shulker'),
    maxDistance: 6
  });

  if (!chestBlock) {
    ctx.sendReply('Stand within 5 blocks of a chest, barrel, or shulker box first!', isWhisper, targetPlayer);
    return false;
  }

  if (!config.chests) config.chests = {};

  const cPos = { x: chestBlock.position.x, y: chestBlock.position.y, z: chestBlock.position.z };
  config.chests[targetCategory] = cPos;

  // If default category or no previous default, keep config.chest in sync
  if (targetCategory === 'default' || !config.chest) {
    config.chest = cPos;
    state.chestPos = chestBlock.position.clone();
  }

  ctx.saveConfig();
  ctx.sendReply(`Registered ${targetCategory.toUpperCase()} container at [${cPos.x}, ${cPos.y}, ${cPos.z}]!`, isWhisper, targetPlayer);
  return true;
}

function listChests(ctx, isWhisper = true, targetPlayer = null) {
  const { config } = ctx;
  if (!config.chests || Object.keys(config.chests).length === 0) {
    if (config.chest) {
      ctx.sendReply(`Chest: DEFAULT at [${config.chest.x}, ${config.chest.y}, ${config.chest.z}]`, isWhisper, targetPlayer);
    } else {
      ctx.sendReply('No chests registered yet. Use !setchest [category] near a container.', isWhisper, targetPlayer);
    }
    return;
  }

  const entries = Object.entries(config.chests)
    .map(([cat, pos]) => `${cat.toUpperCase()}: (${pos.x}, ${pos.y}, ${pos.z})`)
    .join(' | ');

  ctx.sendReply(`Registered containers: ${entries}`, isWhisper, targetPlayer);
}

async function sortBase(ctx, isWhisper = true, targetPlayer = null) {
  const { bot, state, config } = ctx;
  if (!bot || state.isDepositing) return;

  const chests = config.chests || (config.chest ? { default: config.chest } : null);
  if (!chests || Object.keys(chests).length === 0) {
    ctx.sendReply('No base chests registered! Stand near a chest and run !setchest', isWhisper, targetPlayer);
    return;
  }

  // 1. Categorize inventory items
  const itemsToDeposit = {};

  for (const item of bot.inventory.items()) {
    if (isKeepItem(item)) continue;

    let countToDeposit = item.count;

    // Preserve 16 carrots and 16 potatoes for emergency food & replanting
    if (item.name === 'carrot' || item.name === 'potato') {
      if (item.count <= 16) continue;
      countToDeposit = item.count - 16;
    }

    // Preserve 32 seeds for replanting
    if (item.name.includes('seed')) {
      if (item.count <= 32) continue;
      countToDeposit = item.count - 32;
    }

    let category = getItemCategory(item.name);
    // If no dedicated chest exists for this category, fall back to default
    if (!chests[category]) {
      category = chests['default'] ? 'default' : Object.keys(chests)[0];
    }

    if (!itemsToDeposit[category]) itemsToDeposit[category] = [];
    itemsToDeposit[category].push({ item, count: countToDeposit });
  }

  const categoriesToVisit = Object.keys(itemsToDeposit).filter(cat => itemsToDeposit[cat].length > 0);

  if (categoriesToVisit.length === 0) {
    ctx.sendReply('Inventory already clean, nothing to deposit!', isWhisper, targetPlayer);
    return;
  }

  state.isDepositing = true;
  const prev = state.currentState;
  state.currentState = 'DEPOSITING';

  ctx.sendReply(`Sorting inventory into ${categoriesToVisit.length} category container(s)...`, isWhisper, targetPlayer);

  let sortedCategories = 0;

  try {
    for (const cat of categoriesToVisit) {
      const posData = chests[cat];
      if (!posData) continue;

      const cPos = new Vec3(posData.x, posData.y, posData.z);
      await bot.pathfinder.goto(new goals.GoalNear(cPos.x, cPos.y, cPos.z, 2));

      const chestBlock = bot.blockAt(cPos);
      if (!chestBlock) continue;

      const chestWindow = await bot.openContainer(chestBlock);
      await bot.waitForTicks(6);

      for (const { item, count } of itemsToDeposit[cat]) {
        try {
          await chestWindow.deposit(item.type, null, count);
          await bot.waitForTicks(3);
        } catch (depositErr) {}
      }

      await bot.waitForTicks(4);
      chestWindow.close();
      sortedCategories++;
      console.log(`[Zoltraak Smart Sorter] Deposited items into ${cat.toUpperCase()} chest.`);
    }

    ctx.sendReply(`Base sorting complete! Deposited into ${sortedCategories} container(s).`, isWhisper, targetPlayer);

  } catch (err) {
    console.log('[Zoltraak Smart Sorter] Error:', err.message);
    ctx.sendReply(`Deposit interrupted: ${err.message}`, isWhisper, targetPlayer);
  } finally {
    state.isDepositing = false;
    state.currentState = prev === 'DEPOSITING' ? 'ROAM' : prev;
  }
}

async function depositIntoChest(ctx) {
  // Seamless upgrade: delegate to sortBase
  return sortBase(ctx);
}

async function fetchToolFromChest(ctx, toolName) {
  const { bot, state, config } = ctx;
  const chests = config.chests || (config.chest ? { default: config.chest } : null);
  if (!chests) return null;

  // Search default chest or any registered chest
  for (const posData of Object.values(chests)) {
    const cPos = new Vec3(posData.x, posData.y, posData.z);
    try {
      await bot.pathfinder.goto(new goals.GoalNear(cPos.x, cPos.y, cPos.z, 2));
      const chestBlock = bot.blockAt(cPos);
      if (!chestBlock) continue;

      const chestWindow = await bot.openContainer(chestBlock);
      await bot.waitForTicks(6);

      const replacement = chestWindow.containerItems().find(i => i.name.includes(toolName));
      if (replacement) {
        await chestWindow.withdraw(replacement.type, null, 1);
        await bot.waitForTicks(4);
        chestWindow.close();
        console.log(`[Zoltraak] Restocked ${toolName} from chest.`);
        return bot.inventory.items().find(i => i.name.includes(toolName));
      }
      chestWindow.close();
    } catch (e) {}
  }
  return null;
}

async function dropInventory(ctx) {
  const { bot, config } = ctx;
  if (!bot || !bot.inventory) return;
  if (bot.whisper) bot.whisper(config.owner, 'here');
  const items = bot.inventory.items();
  for (const item of items) {
    try {
      await bot.tossStack(item);
    } catch (e) {}
  }
}

module.exports = {
  CHEST_CATEGORIES,
  registerChest,
  listChests,
  sortBase,
  depositIntoChest,
  fetchToolFromChest,
  dropInventory
};
