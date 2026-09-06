/**
 * Wraps bot.dig with a timeout to prevent infinite freezes in claims or laggy states.
 *
 * @param {object} bot - Mineflayer bot instance
 * @param {object} block - Block entity to dig
 * @param {number} timeoutMs - Timeout limit in ms (default: 2500)
 * @returns {Promise<void>}
 */
function digWithTimeout(bot, block, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try {
        bot.stopDigging();
      } catch (e) {}
      reject(new Error('Digging timed out'));
    }, timeoutMs);

    bot.dig(block).then(() => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve();
    }).catch((err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(err);
    });
  });
}

module.exports = {
  digWithTimeout
};
