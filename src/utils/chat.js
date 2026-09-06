/**
 * Sends a chat or whisper reply with humanized randomized delay.
 *
 * @param {object} bot - Mineflayer bot instance
 * @param {string} owner - Minecraft username of the owner
 * @param {string} text - Message content
 * @param {boolean} isWhisper - Whether to send via private whisper
 * @param {number} minDelay - Minimum delay in ms (default: 400)
 * @param {number} maxDelay - Maximum delay in ms (default: 800)
 */
function sendReply(bot, owner, text, isWhisper = false, minDelay = 400, maxDelay = 800) {
  const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
  setTimeout(() => {
    if (!bot || !bot.entity) return;
    if (isWhisper) {
      bot.whisper(owner, text);
    } else {
      bot.chat(text);
    }
  }, delay);
}

module.exports = {
  sendReply
};
