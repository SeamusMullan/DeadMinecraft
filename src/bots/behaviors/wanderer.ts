import { Bot } from 'mineflayer'
import { Behavior, WandererConfig } from '../../types'
import { goals, Movements } from 'mineflayer-pathfinder'

const { GoalNear, GoalBlock } = goals

export class WandererBehavior extends Behavior {
  protected config: WandererConfig
  private loopRunning: boolean = false
  private startPosition: { x: number; y: number; z: number } | null = null

  constructor(bot: Bot, config: Partial<WandererConfig> = {}) {
    super(bot, config)
    this.config = {
      wanderRadius: config.wanderRadius || 50,
      wanderInterval: config.wanderInterval || 10000,
      avoidWater: config.avoidWater !== false,
      avoidLava: config.avoidLava !== false,
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.loopRunning = true

    console.log(`[${this.bot.username}] Starting wanderer behavior`)

    // Save starting position
    this.startPosition = {
      x: this.bot.entity.position.x,
      y: this.bot.entity.position.y,
      z: this.bot.entity.position.z,
    }

    const defaultMove = new Movements(this.bot)
    if (this.config.avoidWater) {
      // Avoid water blocks by treating them as liquids
      defaultMove.liquids = new Set([9, 8]) // 9: water, 8: flowing water (adjust as needed)
    }
    this.bot.pathfinder.setMovements(defaultMove)

    this.wanderLoop()
  }

  async stop(): Promise<void> {
    this.running = false
    this.loopRunning = false
    this.bot.pathfinder.setGoal(null)
    console.log(`[${this.bot.username}] Stopping wanderer behavior`)
  }

  getStatus(): string {
    if (!this.running) return 'stopped'
    const pos = this.bot.entity.position
    return `wandering at (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`
  }

  private async wanderLoop(): Promise<void> {
    while (this.loopRunning) {
      try {
        await this.wanderToRandomLocation()
        await this.sleep(this.config.wanderInterval)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Error in wander loop:`, err.message)
        await this.sleep(3000)
      }
    }
  }

  private async wanderToRandomLocation(): Promise<void> {
    if (!this.startPosition) return

    // Generate a random point within the wander radius
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * this.config.wanderRadius

    const targetX = this.startPosition.x + Math.cos(angle) * distance
    const targetZ = this.startPosition.z + Math.sin(angle) * distance
    const targetY = this.startPosition.y

    console.log(`[${this.bot.username}] Wandering to (${targetX.toFixed(0)}, ${targetY.toFixed(0)}, ${targetZ.toFixed(0)})`)

    try {
      await this.bot.pathfinder.goto(new GoalNear(targetX, targetY, targetZ, 2))

      // Sometimes jump for fun
      if (Math.random() < 0.3) {
        this.bot.setControlState('jump', true)
        await this.sleep(100)
        this.bot.setControlState('jump', false)
      }

      // Look around randomly
      const yaw = Math.random() * Math.PI * 2
      const pitch = (Math.random() - 0.5) * Math.PI / 2
      await this.bot.look(yaw, pitch)
    } catch (err: any) {
      // Couldn't reach the position, that's ok, will try again
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
