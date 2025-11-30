import { Bot } from 'mineflayer'
import { Behavior, TraderConfig } from '../../types'
import { goals, Movements } from 'mineflayer-pathfinder'

const { GoalNear } = goals

export class TraderBehavior extends Behavior {
  protected config: TraderConfig
  private loopRunning: boolean = false

  constructor(bot: Bot, config: Partial<TraderConfig> = {}) {
    super(bot, config)
    this.config = {
      tradingArea: config.tradingArea || bot.entity.position.clone(),
      searchRadius: config.searchRadius || 32,
      targetVillagers: config.targetVillagers !== false,
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.loopRunning = true

    console.log(`[${this.bot.username}] Starting trader behavior`)

    const defaultMove = new Movements(this.bot)
    this.bot.pathfinder.setMovements(defaultMove)

    this.tradingLoop()
  }

  async stop(): Promise<void> {
    this.running = false
    this.loopRunning = false
    this.bot.pathfinder.setGoal(null)
    console.log(`[${this.bot.username}] Stopping trader behavior`)
  }

  getStatus(): string {
    if (!this.running) return 'stopped'
    return 'trading'
  }

  private async tradingLoop(): Promise<void> {
    while (this.loopRunning) {
      try {
        const villager = this.findNearestVillager()

        if (villager) {
          await this.tradeWithVillager(villager)
        } else {
          console.log(`[${this.bot.username}] No villagers found, waiting...`)
        }

        await this.sleep(5000)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Error in trading loop:`, err.message)
        await this.sleep(3000)
      }
    }
  }

  private findNearestVillager(): any {
    let nearestVillager: any = null
    let nearestDistance = this.config.searchRadius || 32

    for (const entity of Object.values(this.bot.entities)) {
      if (!entity.position) continue

      const entityName = entity.name?.toLowerCase() || ''
      if (!entityName.includes('villager')) continue

      const distance = this.bot.entity.position.distanceTo(entity.position)
      if (distance < nearestDistance) {
        nearestVillager = entity
        nearestDistance = distance
      }
    }

    return nearestVillager
  }

  private async tradeWithVillager(villager: any): Promise<void> {
    try {
      console.log(`[${this.bot.username}] Found villager at distance ${this.bot.entity.position.distanceTo(villager.position).toFixed(1)}`)

      // Move close to villager
      await this.bot.pathfinder.goto(new GoalNear(villager.position.x, villager.position.y, villager.position.z, 2))

      // Open trade window
      const villagerEntity = this.bot.nearestEntity(e => e.id === villager.id)
      if (!villagerEntity) return

      const trader = await this.bot.openVillager(villagerEntity)

      console.log(`[${this.bot.username}] Opened trade with villager, ${trader.trades.length} trades available`)

      // Try to make a trade (simplistic - just try first available trade)
      if (trader.trades.length > 0) {
        const trade = trader.trades[0]

        // Check if we have the required items
        const hasItems = trade.inputItem1 && this.bot.inventory.items().some(item => item.type === trade.inputItem1.type && item.count >= trade.inputItem1.count)

        if (hasItems) {
          try {
            await (trader as any).trade(trade, 1)
            console.log(`[${this.bot.username}] Completed trade`)
          } catch (err: any) {
            console.log(`[${this.bot.username}] Trade failed:`, err.message)
          }
        }
      }

      trader.close()
    } catch (err: any) {
      console.log(`[${this.bot.username}] Failed to trade:`, err.message)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
