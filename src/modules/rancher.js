const { goals } = require('mineflayer-pathfinder');

const BREEDING_FOODS = {
  cow: ['wheat'],
  sheep: ['wheat'],
  pig: ['carrot', 'potato', 'beetroot'],
  chicken: ['wheat_seeds', 'beetroot_seeds', 'melon_seeds', 'pumpkin_seeds'],
  rabbit: ['dandelion', 'carrot', 'golden_carrot']
};

async function breedAnimals(ctx, speciesFilter = 'all') {
  const { bot, state } = ctx;
  if (!bot || !bot.entity || state.isBreeding) return false;

  const targetSpecies = speciesFilter.toLowerCase();
  const validSpecies = Object.keys(BREEDING_FOODS);

  const eligibleSpecies = validSpecies.filter(species => {
    if (targetSpecies === 'all' || targetSpecies === 'animal' || targetSpecies === 'animals') return true;
    return species.includes(targetSpecies);
  });

  if (eligibleSpecies.length === 0) {
    console.log(`[Zoltraak Rancher] Unknown animal species: ${speciesFilter}`);
    return false;
  }

  state.isBreeding = true;
  const prev = state.currentState;
  state.currentState = 'RANCHING';

  try {
    for (const species of eligibleSpecies) {
      const allowedFoods = BREEDING_FOODS[species];
      const foodItem = bot.inventory.items().find(i => allowedFoods.includes(i.name));
      if (!foodItem || foodItem.count < 2) continue; // Need at least 2 food items to breed a pair

      // Find nearby adult entities of this species
      const animals = [];
      for (const id in bot.entities) {
        const ent = bot.entities[id];
        if (ent && ent.name === species && ent.position) {
          const dist = bot.entity.position.distanceTo(ent.position);
          if (dist <= 20) {
            // Check if entity is adult (Mineflayer metadata check if available)
            const isBaby = ent.metadata && ent.metadata[16] === true;
            if (!isBaby) {
              animals.push(ent);
            }
          }
        }
      }

      if (animals.length >= 2) {
        console.log(`[Zoltraak Rancher] Found ${animals.length}x ${species}, breeding pair with ${foodItem.name}...`);
        await bot.equip(foodItem, 'hand');

        // Breed first animal
        const first = animals[0];
        await bot.pathfinder.goto(new goals.GoalNear(first.position.x, first.position.y, first.position.z, 2));
        await bot.lookAt(first.position.offset(0, 0.6, 0));
        await bot.activateEntity(first);
        await bot.waitForTicks(8);

        // Breed second animal
        const second = animals[1];
        await bot.pathfinder.goto(new goals.GoalNear(second.position.x, second.position.y, second.position.z, 2));
        await bot.lookAt(second.position.offset(0, 0.6, 0));
        await bot.activateEntity(second);
        await bot.waitForTicks(8);

        console.log(`[Zoltraak Rancher] Successfully bred pair of ${species}!`);
        break; // Bred one pair
      }
    }
  } catch (err) {
    console.log('[Zoltraak Rancher] Error: ' + err.message);
  }

  state.isBreeding = false;
  state.currentState = prev === 'RANCHING' ? 'ROAM' : prev;
  return true;
}

module.exports = {
  BREEDING_FOODS,
  breedAnimals
};
