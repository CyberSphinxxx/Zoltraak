/**
 * Sends messages based on configured audience privacy mode:
 * - whisper_only: Sends private whispers exclusively to the owner.
 * - whitelist_whisper: Sends private whispers to owner + all whitelisted players.
 * - public_chat: Broadcasts into public server chat.
 *
 * Also honors silentMode (suppressing non-critical chatter) and custom botPrefix.
 *
 * @param {object} bot - Mineflayer bot instance
 * @param {object|string} targetOrConfig - Bot config object or owner username string
 * @param {string} text - Message content
 * @param {boolean} [isWhisper=true] - Whisper intent flag
 * @param {number} minDelay - Minimum delay in ms (default: 300)
 * @param {number} maxDelay - Maximum delay in ms (default: 600)
 */
function sendReply(bot, targetOrConfig, text, isWhisper = true, minDelay = 300, maxDelay = 600) {
  let config = null;
  let owner = 'Owner';

  if (typeof targetOrConfig === 'string') {
    owner = targetOrConfig;
  } else if (targetOrConfig && typeof targetOrConfig === 'object') {
    config = targetOrConfig;
    owner = config.owner || 'Owner';
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

    const prefix = config?.privacy?.botPrefix ? `${config.privacy.botPrefix.trim()} ` : '';
    const formattedText = prefix ? `${prefix}${text}` : text;

    const mode = config?.privacy?.audienceMode || 'whisper_only';

    if (mode === 'public_chat') {
      try {
        bot.chat(formattedText);
      } catch (e) {}
      return;
    }

    if (mode === 'whitelist_whisper') {
      const recipients = new Set();
      if (owner) recipients.add(owner);
      if (Array.isArray(config?.privacy?.whitelist)) {
        config.privacy.whitelist.forEach(u => {
          if (u && typeof u === 'string') recipients.add(u.trim());
        });
      }

      recipients.forEach(player => {
        try {
          bot.whisper(player, formattedText);
        } catch (e) {
          try {
            bot.chat(`/tell ${player} ${formattedText}`);
          } catch (err) {}
        }
      });
      return;
    }

    // Default mode: 'whisper_only' to owner exclusively
    if (owner) {
      try {
        bot.whisper(owner, formattedText);
      } catch (e) {
        try {
          bot.chat(`/tell ${owner} ${formattedText}`);
        } catch (err) {}
      }
    }
  }, delay);
}

module.exports = {
  sendReply
};
