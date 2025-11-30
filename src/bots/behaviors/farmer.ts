import { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'
import { Behavior, FarmerConfig } from '../../types'
import { goals, Movements } from 'mineflayer-pathfinder'

const { GoalBlock, GoalNear } = goals

export class FarmerBehavior extends Behavior {
  protected config: FarmerConfig
  private loopRunning: boolean = false

  constructor(bot: Bot, config: Partial<FarmerConfig> = {}) {
    super(bot, config)
    this.config = {
      farmCenter: config.farmCenter || { x: 0, y: 64, z: 0 },
      farmRadius: config.farmRadius || 10,
      replantDelay: config.replantDelay || 1000,
      cycleDelay: config.cycleDelay || 5000,
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.loopRunning = true

    console.log(`[${this.bot.username}] Starting farmer behavior`)

    // Set up movement settings
    const defaultMove = new Movements(this.bot)
    this.bot.pathfinder.setMovements(defaultMove)

    this.farmingLoop()
  }

  async stop(): Promise<void> {
    this.running = false
    this.loopRunning = false
    this.bot.pathfinder.setGoal(null)
    console.log(`[${this.bot.username}] Stopping farmer behavior`)
  }

  getStatus(): string {
    if (!this.running) return 'stopped'
    return 'farming'
  }

  private async farmingLoop(): Promise<void> {
    while (this.loopRunning) {
      try {
        await this.harvestMatureWheat()
        await this.replantWheat()
        await this.collectDroppedItems()
        await this.sleep(this.config.cycleDelay)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Error in farming loop:`, err.message)
        await this.sleep(3000)
      }
    }
  }

  private async harvestMatureWheat(): Promise<void> {
    const wheatBlocks = this.bot.findBlocks({
      matching: (block) => {
        return block.name === 'wheat' && block.metadata === 7
      },
      maxDistance: this.config.farmRadius * 2,
      count: 100,
    })

    if (wheatBlocks.length === 0) return

    for (const pos of wheatBlocks) {
      if (!this.loopRunning) break

      try {
        const block = this.bot.blockAt(pos)
        if (block && block.name === 'wheat' && block.metadata === 7) {
          await this.bot.pathfinder.goto(new GoalNear(pos.x, pos.y, pos.z, 3))
          await this.bot.dig(block)
          await this.sleep(200)
        }
      } catch (err: any) {
        // Ignore individual harvest errors
      }
    }
  }

  private async replantWheat(): Promise<void> {
    const seeds = this.bot.inventory.items().find(item => item.name === 'wheat_seeds')
    if (!seeds) return

    const farmland = this.bot.findBlocks({
      matching: (block) => {
        const blockAbove = this.bot.blockAt(block.position.offset(0, 1, 0))
        return block.name === 'farmland' && blockAbove !== null && blockAbove.name === 'air'
      },
      maxDistance: this.config.farmRadius * 2,
      count: 100,
    })

    if (farmland.length === 0) return

    await this.bot.equip(seeds, 'hand')

    for (const pos of farmland) {
      if (!this.loopRunning) break
      if (!this.bot.inventory.items().find(item => item.name === 'wheat_seeds')) break

      try {
        const farmlandBlock = this.bot.blockAt(pos)
        if (!farmlandBlock) continue

        await this.bot.pathfinder.goto(new GoalNear(pos.x, pos.y, pos.z, 3))
        await this.bot.placeBlock(farmlandBlock, new Vec3(0, 1, 0))
        await this.sleep(this.config.replantDelay)
      } catch (err: any) {
        // Ignore individual plant errors
      }
    }
  }

  private async collectDroppedItems(): Promise<void> {
    const droppedItems = Object.values(this.bot.entities).filter(entity => {
      return entity.name === 'item' &&
             entity.position.distanceTo(this.bot.entity.position) < this.config.farmRadius * 2
    })

    for (const item of droppedItems) {
      if (!this.loopRunning) break

      try {
        const goal = new GoalBlock(item.position.x, item.position.y, item.position.z)
        await this.bot.pathfinder.goto(goal)
        await this.sleep(500)
      } catch (err: any) {
        // Ignore collection errors
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
