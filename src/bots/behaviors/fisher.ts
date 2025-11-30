import { Bot } from 'mineflayer'
import { Behavior, FisherConfig } from '../../types'
import { goals, Movements } from 'mineflayer-pathfinder'

const { GoalNear } = goals

export class FisherBehavior extends Behavior {
  protected config: FisherConfig
  private loopRunning: boolean = false
  private fishing: boolean = false

  constructor(bot: Bot, config: Partial<FisherConfig> = {}) {
    super(bot, config)
    this.config = {
      fishingSpot: config.fishingSpot || bot.entity.position.clone(),
      autoCatchFish: config.autoCatchFish !== false,
      keepFishing: config.keepFishing !== false,
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.loopRunning = true

    console.log(`[${this.bot.username}] Starting fisher behavior`)

    const defaultMove = new Movements(this.bot)
    this.bot.pathfinder.setMovements(defaultMove)

    // Move to fishing spot
    if (this.config.fishingSpot) {
      await this.bot.pathfinder.goto(
        new GoalNear(this.config.fishingSpot.x, this.config.fishingSpot.y, this.config.fishingSpot.z, 1)
      )
    }

    this.fishingLoop()
  }

  async stop(): Promise<void> {
    this.running = false
    this.loopRunning = false
    this.bot.pathfinder.setGoal(null)
    console.log(`[${this.bot.username}] Stopping fisher behavior`)
  }

  getStatus(): string {
    if (!this.running) return 'stopped'
    return this.fishing ? 'fishing' : 'waiting'
  }

  private async fishingLoop(): Promise<void> {
    while (this.loopRunning) {
      try {
        await this.castAndWait()
        await this.sleep(1000)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Error in fishing loop:`, err.message)
        await this.sleep(3000)
      }
    }
  }

  private async castAndWait(): Promise<void> {
    // Find fishing rod
    const fishingRod = this.bot.inventory.items().find(item => item.name === 'fishing_rod')

    if (!fishingRod) {
      console.log(`[${this.bot.username}] No fishing rod found`)
      await this.sleep(5000)
      return
    }

    try {
      // Equip fishing rod
      await this.bot.equip(fishingRod, 'hand')

      // Cast
      await this.bot.fish()
      this.fishing = true

      console.log(`[${this.bot.username}] Cast fishing rod`)
    } catch (err: any) {
      console.log(`[${this.bot.username}] Fishing error:`, err.message)
      this.fishing = false
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
