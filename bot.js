/**
 * Zoltraak - Autonomous Minecraft Companion Bot
 *
 * Entrypoint file for starting the bot.
 * Subsystems and modules are segmented under src/.
 */

// Safety: prevent unhandled exceptions or promise rejections from crashing the bot
process.on('uncaughtException', (err) => {
  console.log('[Zoltraak Safety] Caught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.log('[Zoltraak Safety] Caught Rejection:', reason);
});

const { createBot } = require('./src/index');

createBot();
