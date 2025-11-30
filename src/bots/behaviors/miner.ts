import { Bot } from 'mineflayer'
import { Behavior, MinerConfig } from '../../types'
import { goals, Movements } from 'mineflayer-pathfinder'

const { GoalNear } = goals

export class MinerBehavior extends Behavior {
  protected config: MinerConfig
  private loopRunning: boolean = false

  constructor(bot: Bot, config: Partial<MinerConfig> = {}) {
    super(bot, config)
    this.config = {
      targetBlocks: config.targetBlocks || ['coal_ore', 'iron_ore', 'diamond_ore', 'gold_ore', 'emerald_ore'],
      miningArea: config.miningArea,
      autoSmelt: config.autoSmelt || false,
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.loopRunning = true

    console.log(`[${this.bot.username}] Starting miner behavior`)

    const defaultMove = new Movements(this.bot)
    this.bot.pathfinder.setMovements(defaultMove)

    this.miningLoop()
  }

  async stop(): Promise<void> {
    this.running = false
    this.loopRunning = false
    this.bot.pathfinder.setGoal(null)
    console.log(`[${this.bot.username}] Stopping miner behavior`)
  }

  getStatus(): string {
    if (!this.running) return 'stopped'
    const tool = this.bot.heldItem?.name || 'none'
    return `mining with ${tool}`
  }

  private async miningLoop(): Promise<void> {
    while (this.loopRunning) {
      try {
        await this.findAndMineOres()
        await this.sleep(2000)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Error in mining loop:`, err.message)
        await this.sleep(3000)
      }
    }
  }

  private async findAndMineOres(): Promise<void> {
    // Find any ore blocks
    const oreBlocks = this.bot.findBlocks({
      matching: (block) => {
        return this.config.targetBlocks.includes(block.name)
      },
      maxDistance: 32,
      count: 10,
    })

    if (oreBlocks.length === 0) {
      // No ores found, wander a bit
      await this.wanderToFindOres()
      return
    }

    // Mine the closest ore
    for (const pos of oreBlocks) {
      if (!this.loopRunning) break

      try {
        const block = this.bot.blockAt(pos)
        if (!block || !this.config.targetBlocks.includes(block.name)) continue

        // Equip best tool for the job
        await this.equipBestTool(block.name)

        // Move near the ore
        await this.bot.pathfinder.goto(new GoalNear(pos.x, pos.y, pos.z, 3))

        // Mine it
        await this.bot.dig(block)
        console.log(`[${this.bot.username}] Mined ${block.name}`)
        await this.sleep(500)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Failed to mine at ${pos}:`, err.message)
      }
    }
  }

  private async equipBestTool(blockName: string): Promise<void> {
    // Try to equip a pickaxe
    const pickaxes = this.bot.inventory.items().filter(item =>
      item.name.includes('pickaxe')
    )

    if (pickaxes.length > 0) {
      // Prefer diamond > iron > stone > wooden
      const bestPickaxe = pickaxes.sort((a, b) => {
        const order = ['diamond', 'iron', 'stone', 'wooden', 'golden']
        const aIndex = order.findIndex(type => a.name.includes(type))
        const bIndex = order.findIndex(type => b.name.includes(type))
        return aIndex - bIndex
      })[0]

      await this.bot.equip(bestPickaxe, 'hand')
    }
  }

  private async wanderToFindOres(): Promise<void> {
    // Wander randomly to explore for ores
    const x = this.bot.entity.position.x + (Math.random() - 0.5) * 20
    const y = this.bot.entity.position.y
    const z = this.bot.entity.position.z + (Math.random() - 0.5) * 20

    try {
      await this.bot.pathfinder.goto(new GoalNear(x, y, z, 1))
    } catch (err: any) {
      // Couldn't reach the position, that's ok
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
