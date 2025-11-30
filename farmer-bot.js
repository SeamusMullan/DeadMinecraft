const mineflayer = require('mineflayer')
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const { GoalBlock, GoalNear } = require('mineflayer-pathfinder').goals

// Bot configuration
const bot = mineflayer.createBot({
  host: 'localhost',     // Change to your server IP
  port: 25565,           // Change to your server port
  username: 'FarmerBot', // Bot's username
  // auth: 'microsoft'   // Uncomment for premium accounts
})

// Farm configuration
const FARM_CENTER = { x: 0, y: 64, z: 0 } // Change to your farm coordinates
const FARM_RADIUS = 5
const REPLANT_DELAY = 1000 // ms between replanting

// Load pathfinding plugin
bot.loadPlugin(pathfinder)

bot.on('spawn', () => {
  console.log('Bot spawned! Starting farming routine...')
  
  // Set up movement settings
  const defaultMove = new Movements(bot)
  bot.pathfinder.setMovements(defaultMove)
  
  // Start farming after a short delay
  setTimeout(farmingLoop, 3000)
})

bot.on('chat', (username, message) => {
  if (username === bot.username) return
  
  console.log(`<${username}> ${message}`)
  
  // Simple commands
  if (message === 'stop') {
    bot.chat('Stopping farm...')
    bot.pathfinder.setGoal(null)
  }
  
  if (message === 'start') {
    bot.chat('Starting farm!')
    farmingLoop()
  }
  
  if (message === 'come') {
    const player = bot.players[username]
    if (player && player.entity) {
      bot.chat('Coming!')
      const goal = new GoalNear(player.entity.position.x, 
                                player.entity.position.y, 
                                player.entity.position.z, 2)
      bot.pathfinder.setGoal(goal)
    }
  }
})

bot.on('error', (err) => {
  console.error('Bot error:', err)
})

bot.on('kicked', (reason) => {
  console.log('Bot was kicked:', reason)
})

async function farmingLoop() {
  while (true) {
    try {
      console.log('=== Starting farm cycle ===')
      
      // Step 1: Find and harvest mature wheat
      await harvestMatureWheat()
      
      // Step 2: Replant any empty farmland
      await replantWheat()
      
      // Step 3: Pick up any dropped items
      await collectDroppedItems()
      
      console.log('Cycle complete. Waiting before next cycle...')
      await sleep(5000) // Wait 5 seconds before next cycle
      
    } catch (err) {
      console.error('Error in farming loop:', err.message)
      await sleep(3000)
    }
  }
}

async function harvestMatureWheat() {
  console.log('Looking for mature wheat...')
  
  // Find all wheat blocks in farm area
  const wheatBlocks = bot.findBlocks({
    matching: (block) => {
      return block.name === 'wheat' && block.metadata === 7 // metadata 7 = fully grown
    },
    maxDistance: FARM_RADIUS * 2,
    count: 100
  })
  
  if (wheatBlocks.length === 0) {
    console.log('No mature wheat found')
    return
  }
  
  console.log(`Found ${wheatBlocks.length} mature wheat plants`)
  
  // Harvest each wheat block
  for (const pos of wheatBlocks) {
    try {
      const block = bot.blockAt(pos)
      if (block && block.name === 'wheat' && block.metadata === 7) {
        // Move near the block
        await bot.pathfinder.goto(new GoalNear(pos.x, pos.y, pos.z, 3))
        
        // Dig (harvest) the wheat
        await bot.dig(block)
        console.log(`Harvested wheat at ${pos}`)
        
        await sleep(200) // Small delay
      }
    } catch (err) {
      console.error(`Failed to harvest at ${pos}:`, err.message)
    }
  }
}

async function replantWheat() {
  console.log('Replanting wheat...')
  
  // Check if we have seeds
  const seeds = bot.inventory.items().find(item => item.name === 'wheat_seeds')
  
  if (!seeds) {
    console.log('No seeds in inventory!')
    return
  }
  
  console.log(`Have ${seeds.count} seeds`)
  
  // Find empty farmland
  const farmland = bot.findBlocks({
    matching: (block) => {
      const blockAbove = bot.blockAt(block.position.offset(0, 1, 0))
      return block.name === 'farmland' && blockAbove && blockAbove.name === 'air'
    },
    maxDistance: FARM_RADIUS * 2,
    count: 100
  })
  
  if (farmland.length === 0) {
    console.log('No empty farmland found')
    return
  }
  
  console.log(`Found ${farmland.length} empty farmland blocks`)
  
  // Equip seeds
  await bot.equip(seeds, 'hand')
  
  // Plant on each empty farmland
  for (const pos of farmland) {
    if (!bot.inventory.items().find(item => item.name === 'wheat_seeds')) {
      console.log('Ran out of seeds!')
      break
    }
    
    try {
      const farmlandBlock = bot.blockAt(pos)
      
      // Move near the farmland
      await bot.pathfinder.goto(new GoalNear(pos.x, pos.y, pos.z, 3))
      
      // Place seeds on the farmland
      await bot.placeBlock(farmlandBlock, new bot.Vec3(0, 1, 0))
      console.log(`Planted seeds at ${pos}`)
      
      await sleep(REPLANT_DELAY)
    } catch (err) {
      console.error(`Failed to plant at ${pos}:`, err.message)
    }
  }
}

async function collectDroppedItems() {
  console.log('Collecting dropped items...')
  
  const droppedItems = Object.values(bot.entities).filter(entity => {
    return entity.name === 'item' && 
           entity.position.distanceTo(bot.entity.position) < FARM_RADIUS * 2
  })
  
  if (droppedItems.length === 0) {
    console.log('No items to collect')
    return
  }
  
  console.log(`Found ${droppedItems.length} dropped items`)
  
  for (const item of droppedItems) {
    try {
      const goal = new GoalBlock(item.position.x, item.position.y, item.position.z)
      await bot.pathfinder.goto(goal)
      await sleep(500) // Wait for pickup
    } catch (err) {
      console.error('Failed to collect item:', err.message)
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down bot...')
  bot.quit()
  process.exit(0)
})
