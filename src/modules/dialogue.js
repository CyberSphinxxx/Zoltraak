/**
 * Zoltraak Human-Like Dialogue & Anti-Interruption Conversation Engine
 *
 * Implements realistic gamer conversation with strict anti-interruption filters:
 * - Public chat requires direct vocative mention (\bZoltraak\b)
 * - 15-second active conversation threading per player
 * - Face-to-face proximity detection (<4m + eye contact) for casual greetings
 * - Stranger protection (never leaks base coordinates to non-whitelisted players)
 * - Humanized typing delays and physical head tracking
 * - Anti-spam rate limiting
 */

// Track active conversation threads: username -> timestamp
const activeThreads = new Map();

// Rate limiting: username -> lastMessageTimestamp
const userCooldowns = new Map();
let lastGlobalReplyTime = 0;

const THREAD_EXPIRY_MS = 15000; // 15 seconds
const USER_COOLDOWN_MS = 3000;  // 3 seconds per player
const GLOBAL_COOLDOWN_MS = 1500; // 1.5 seconds global throttle

/**
 * Checks if a public chat message is genuinely addressed to Zoltraak
 */
function isAddressedToBot(ctx, username, message, isWhisper) {
  const { bot, config } = ctx;
  if (!bot || !bot.entity) return false;

  // Private whispers are always addressed to the bot
  if (isWhisper) return true;

  const text = message.trim();

  // 1. Ignore command prefixes and system broadcasts
  if (text.startsWith('!') || text.startsWith('/') || text.startsWith('.')) return false;
  if (text.startsWith('[') || text.startsWith('***') || text.includes('-> me]')) return false;

  const botName = (bot.username || 'Zoltraak').toLowerCase();
  const lower = text.toLowerCase();

  // 2. Direct Name Mention Check (word boundary)
  const nameRegex = new RegExp(`\\b(${botName}|zoltraak)\\b`, 'i');
  if (nameRegex.test(lower)) {
    // Record / refresh active conversation thread
    activeThreads.set(username.toLowerCase(), Date.now());
    return true;
  }

  // 3. Active Conversation Thread Check (within 15s of last exchange)
  const lastTime = activeThreads.get(username.toLowerCase());
  if (lastTime && (Date.now() - lastTime) < THREAD_EXPIRY_MS) {
    activeThreads.set(username.toLowerCase(), Date.now());
    return true;
  }

  // 4. Face-to-Face Proximity Check
  // If player says a greeting (hi, hey, yo, sup) while standing right in front of the bot
  const GREETING_WORDS = ['hi', 'hey', 'yo', 'sup', 'hello', 'o/', 'morning', 'heyy'];
  const isGreeting = GREETING_WORDS.includes(lower.replace(/[!.,?]/g, '').trim());

  const playerEnt = bot.players[username]?.entity;
  if (isGreeting && playerEnt && playerEnt.position && bot.entity?.position) {
    const dist = bot.entity.position.distanceTo(playerEnt.position);

    if (dist <= 4.0) {
      // Check if player is facing roughly toward Zoltraak
      const dx = bot.entity.position.x - playerEnt.position.x;
      const dz = bot.entity.position.z - playerEnt.position.z;
      const playerAngle = Math.atan2(-dx, dz);
      const angleDiff = Math.abs((playerEnt.yaw - playerAngle) % (Math.PI * 2));

      // Facing within ~50 degrees
      if (angleDiff < 0.9 || angleDiff > (Math.PI * 2 - 0.9)) {
        activeThreads.set(username.toLowerCase(), Date.now());
        return true;
      }
    }
  }

  // Otherwise, it's conversation between other players—silently ignore
  return false;
}

/**
 * Generates an authentic, context-aware human response
 */
function generateResponse(ctx, username, message, isWhisper) {
  const { bot, state, config } = ctx;
  const lower = message.toLowerCase();
  const isOwner = username === config.owner;
  const isWhitelisted = isOwner || (config.privacy?.whitelist && config.privacy.whitelist.includes(username));

  // 1. Activity / Status ("wyd", "what are you doing", "status", "busy?")
  if (lower.includes('wyd') || lower.includes('what are you doing') || lower.includes('what r u doing') || lower.includes('busy') || lower.includes('what you doing')) {
    const act = (state?.currentState || 'ROAM').toUpperCase();
    const responses = {
      FARM: ['just harvesting some crops rn', 'replanting the farm patch', 'farming wheat & carrots atm'],
      LUMBER: ['chopping down some trees for wood', 'lumbering rn, collecting logs', 'getting wood for the base'],
      MINING: ['down in the mines at y=' + Math.round(bot.entity.position.y), 'mining some ores underground', 'digging out a tunnel rn'],
      ARCHER: ['holding down archer stance', 'sniping mobs with my bow', 'keeping range and watching out'],
      PATROL: ['patrolling the base perimeter', 'doing a sentry sweep around home', 'on watch duty rn'],
      GUARD: ['watching ' + (config.owner || 'the boss') + "'s back", 'guarding rn, all clear', 'bodyguarding, ready for mobs'],
      FISHING: ['catching some fish by the water', 'fishing rn, hope for a mending book', 'just chilling and fishing'],
      SMELTING: ['managing the furnaces rn', 'smelting some ores at base', 'cooking food in the smelter'],
      DEPOSITING: ['heading to dump my inventory in chests', 'sorting base chests rn', 'unloading loot'],
      SLEEPING: ['sleeping, night skip :)', 'in bed rn zzz', 'taking a nap to skip the storm'],
      ROAM: ['just chilling around the base', 'wandering around home', 'keeping an eye on things', 'not much, just vibing around base']
    };
    const list = responses[act] || responses.ROAM;
    return list[Math.floor(Math.random() * list.length)];
  }

  // 2. Location / Coordinates ("where are you", "where r u", "coords", "location")
  if (lower.includes('where are you') || lower.includes('where r u') || lower.includes('coords') || lower.includes('where u at') || lower.includes('location')) {
    const pos = bot.entity.position;
    const playerEnt = bot.players[username]?.entity;

    if (playerEnt) {
      const dist = Math.round(pos.distanceTo(playerEnt.position));
      if (dist <= 4) return 'right next to you lol';
      if (dist <= 12) return `right behind you, like ${dist} blocks away`;
      if (dist <= 30) return `about ${dist} blocks away from you`;
    }

    // Anti-doxxing: only reveal exact coordinates to authorized players
    if (isWhitelisted) {
      return `at ${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)}`;
    } else {
      return 'just around the base area';
    }
  }

  // 3. Compliments & Thanks ("good job", "gj", "nice", "ty", "thanks", "good bot", "pog")
  if (lower.includes('gj') || lower.includes('good job') || lower.includes('nice') || lower.includes('ty') || lower.includes('thanks') || lower.includes('good bot') || lower.includes('pog') || lower.includes('wp')) {
    const replies = ['np :)', 'ez', 'gotchu', 'all in a day\'s work', 'anytime!', 'doing my best haha', 'o/'];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // 4. Greetings ("hi", "yo", "sup", "hello", "morning", "wb", "hey")
  if (lower.includes('hi') || lower.includes('yo') || lower.includes('sup') || lower.includes('hello') || lower.includes('morning') || lower.includes('wb') || lower.includes('hey')) {
    const greetings = ['yo o/', 'heyy', 'sup', 'wb!', 'hey, what\'s up?', 'morning', 'yo'];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // 5. Identity & Lore ("who are you", "what is zoltraak", "frieren", "are you real", "bot?")
  if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('what is zoltraak') || lower.includes('frieren') || lower.includes('are you real') || lower.includes('are you a bot')) {
    const lore = [
      'i\'m a mage companion',
      'just the base companion taking care of things',
      'ordinary offensive magic specialist ;)',
      'nah i\'m real trust me',
      'base bodyguard & farm manager'
    ];
    return lore[Math.floor(Math.random() * lore.length)];
  }

  // 6. Vitals & Health ("need food", "you good", "hp", "how are you", "how r u")
  if (lower.includes('how are you') || lower.includes('how r u') || lower.includes('you good') || lower.includes('hp') || lower.includes('need food') || lower.includes('health')) {
    const hp = Math.round(bot.health || 20);
    const food = Math.round(bot.food || 20);

    if (hp >= 18 && food >= 18) return 'all good! full hp and fed';
    if (hp < 12) return `a bit hurt (${hp}/20 hp), but i\'m fine`;
    if (food < 15) return 'could use a snack soon, but all good';
    return `doing fine, hp is ${hp}/20`;
  }

  // 7. Combat / Danger warnings ("watch out", "creeper", "behind you", "danger", "run")
  if (lower.includes('watch out') || lower.includes('creeper') || lower.includes('behind you') || lower.includes('danger') || lower.includes('careful')) {
    const warnings = ['oh shoot thanks', 'saw it, got my shield up', 'on it!', 'backing up', 'handled'];
    return warnings[Math.floor(Math.random() * warnings.length)];
  }

  // 8. General Open-Ended Banter
  const generalBanter = [
    'yeah', 'true', 'for real', 'fair enough', 'haha yeah', 'got it', 'alright'
  ];
  return generalBanter[Math.floor(Math.random() * generalBanter.length)];
}

/**
 * Main dialogue entry point called from chat and whisper events
 */
function handleDialogue(ctx, username, message, isWhisper = false) {
  const { bot, config } = ctx;
  if (!bot || !bot.entity) return;

  // Ignore own messages
  if (username === bot.username) return;

  // 1. Anti-Interruption Check: Is this genuinely addressed to Zoltraak?
  if (!isAddressedToBot(ctx, username, message, isWhisper)) {
    return;
  }

  // 2. Anti-Spam Check: Rate limiting per user and globally
  const now = Date.now();
  const lastUserTime = userCooldowns.get(username.toLowerCase()) || 0;
  if (now - lastUserTime < USER_COOLDOWN_MS) return;
  if (now - lastGlobalReplyTime < GLOBAL_COOLDOWN_MS) return;

  userCooldowns.set(username.toLowerCase(), now);
  lastGlobalReplyTime = now;

  // 3. Physical Head Tracking: Look at the speaker if nearby
  const playerEnt = bot.players[username]?.entity;
  if (playerEnt) {
    const dist = bot.entity.position.distanceTo(playerEnt.position);
    if (dist <= 16) {
      if (typeof bot.lookAt === 'function') {
        bot.lookAt(playerEnt.position.offset(0, 1.6, 0), true).catch(() => {});
      }
      // If close by, give a friendly arm swing
      if (dist <= 5 && Math.random() < 0.4) {
        setTimeout(() => {
          if (bot && bot.swingArm) bot.swingArm('right');
        }, 200);
      }
    }
  }

  // 4. Generate context-aware reply
  const reply = generateResponse(ctx, username, message, isWhisper);
  if (!reply) return;

  // 5. Realistic Human Typing Delay
  // Humans take ~250ms to react + ~25ms per character typed
  const typingDelay = 250 + (reply.length * 25) + Math.floor(Math.random() * 200);

  // 6. Send reply respecting channel and privacy settings
  ctx.sendReply(reply, isWhisper, username, typingDelay, typingDelay + 300);
}

module.exports = {
  isAddressedToBot,
  generateResponse,
  handleDialogue
};
