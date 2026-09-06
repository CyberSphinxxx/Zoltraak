/**
 * Zoltraak Adaptive Chat Reply & Channel Router
 *
 * Channel Detection:
 * - If isWhisper is false: The message originated from normal public chat.
 *   Zoltraak replies in normal public chat (bot.chat).
 * - If isWhisper is true: The message originated from a private whisper or web console.
 *   Zoltraak replies in private whisper (bot.whisper) directly to the sender.
 *
 * Audience Modes:
 * - 'dynamic' (default): Automatically matches incoming channel (public chat -> public reply, whisper -> whisper).
 * - 'whisper_only': Strict stealth mode (always whispers to owner/sender, never talks in public).
 * - 'public_chat': Always speaks in public chat.
 * - 'whitelist_whisper': Whispers to all whitelisted players.
 */
function sendReply(bot, targetOrConfig, text, isWhisper = false, arg4, arg5, arg6) {
  let config = null;
  let owner = 'Owner';

  if (typeof targetOrConfig === 'string') {
    owner = targetOrConfig;
  } else if (targetOrConfig && typeof targetOrConfig === 'object') {
    config = targetOrConfig;
    owner = config.owner || 'Owner';
  }

  let targetPlayer = null;
  let minDelay = 300;
  let maxDelay = 600;

  // Flexible argument resolution:
  if (typeof arg4 === 'string') {
    targetPlayer = arg4;
    if (typeof arg5 === 'number') minDelay = arg5;
    if (typeof arg6 === 'number') maxDelay = arg6;
  } else if (typeof arg4 === 'number') {
    minDelay = arg4;
    if (typeof arg5 === 'number') maxDelay = arg5;
    if (typeof arg6 === 'string') targetPlayer = arg6;
  }

  const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
  setTimeout(() => {
    if (!bot || !bot.entity) return;

    // If silent mode is active, suppress routine status chatter
    if (config?.privacy?.silentMode) {
      const lower = text.toLowerCase();
      const isCritical = lower.includes('death') || lower.includes('warning') || lower.includes('threat') || lower.includes('alert') || lower.includes('error');
      if (!isCritical) return;
    }

    const mode = config?.privacy?.audienceMode || 'dynamic';

    // Format text: omit robotic prefix in casual dialogue or dynamic mode
    const prefix = (config?.privacy?.botPrefix && mode !== 'dynamic') ? `${config.privacy.botPrefix.trim()} ` : '';
    const formattedText = prefix ? `${prefix}${text}` : text;

    // Helper to send a single packet either as whisper or public chat
    const sendPacket = (msg) => {
      // 1. Explicit public_chat mode: always public chat
      if (mode === 'public_chat') {
        try {
          bot.chat(msg);
        } catch (e) {}
        return;
      }

      // 2. Explicit whitelist_whisper mode: whisper to all whitelisted players
      if (mode === 'whitelist_whisper') {
        const recipients = new Set();
        if (targetPlayer) recipients.add(targetPlayer);
        if (owner) recipients.add(owner);
        if (Array.isArray(config?.privacy?.whitelist)) {
          config.privacy.whitelist.forEach(u => {
            if (u && typeof u === 'string') recipients.add(u.trim());
          });
        }

        recipients.forEach(player => {
          try {
            if (typeof bot.whisper === 'function') {
              bot.whisper(player, msg);
            } else {
              bot.chat(`/tell ${player} ${msg}`);
            }
          } catch (e) {
            try {
              bot.chat(`/tell ${player} ${msg}`);
            } catch (err) {}
          }
        });
        return;
      }

      // 3. Dynamic Mode (Default) vs Whisper Only (Stealth)
      // In dynamic mode, match incoming channel:
      // - If isWhisper is false -> reply via bot.chat
      // - If isWhisper is true -> reply via bot.whisper
      const shouldWhisper = mode === 'whisper_only' || isWhisper;

      if (!shouldWhisper) {
        // Normal public chat reply!
        try {
          bot.chat(msg);
        } catch (e) {
          console.error('[Zoltraak Chat]', e.message);
        }
        return;
      }

      // Private whisper reply directly to the commanding/whispering player (falling back to owner)
      const recipient = targetPlayer || owner;
      if (recipient) {
        try {
          if (typeof bot.whisper === 'function') {
            bot.whisper(recipient, msg);
          } else {
            bot.chat(`/tell ${recipient} ${msg}`);
          }
        } catch (e) {
          try {
            bot.chat(`/tell ${recipient} ${msg}`);
          } catch (err) {}
        }
      }
    };

    // Minecraft chat packet length safe limit is 220 chars to avoid server disconnects
    const MAX_PACKET_LEN = 220;
    if (formattedText.length <= MAX_PACKET_LEN) {
      sendPacket(formattedText);
    } else {
      // Split into clean sentence or pipe chunks
      const chunks = [];
      let remaining = formattedText;
      while (remaining.length > 0) {
        if (remaining.length <= MAX_PACKET_LEN) {
          chunks.push(remaining);
          break;
        }
        let splitIdx = remaining.lastIndexOf(' | ', MAX_PACKET_LEN);
        if (splitIdx === -1) splitIdx = remaining.lastIndexOf('. ', MAX_PACKET_LEN);
        if (splitIdx === -1) splitIdx = remaining.lastIndexOf(' ', MAX_PACKET_LEN);
        if (splitIdx === -1) splitIdx = MAX_PACKET_LEN;
        chunks.push(remaining.substring(0, splitIdx).trim());
        remaining = remaining.substring(splitIdx).trim();
      }
      chunks.forEach((chunk, idx) => {
        setTimeout(() => sendPacket(chunk), idx * 350);
      });
    }
  }, delay);
}

module.exports = {
  sendReply
};
