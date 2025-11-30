import { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'
import { Behavior, BehaviorConfig } from '../../types'
import { goals, Movements } from 'mineflayer-pathfinder'

const { GoalNear } = goals

export interface BuilderConfig extends BehaviorConfig {
  buildPattern?: 'pillar' | 'wall' | 'platform' | 'random'
  buildHeight?: number
  buildMaterial?: string
}

export class BuilderBehavior extends Behavior {
  protected config: BuilderConfig
  private loopRunning: boolean = false

  constructor(bot: Bot, config: Partial<BuilderConfig> = {}) {
    super(bot, config)
    this.config = {
      buildPattern: config.buildPattern || 'pillar',
      buildHeight: config.buildHeight || 10,
      buildMaterial: config.buildMaterial || 'dirt',
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.loopRunning = true

    console.log(`[${this.bot.username}] Starting builder behavior`)

    const defaultMove = new Movements(this.bot)
    this.bot.pathfinder.setMovements(defaultMove)

    this.buildLoop()
  }

  async stop(): Promise<void> {
    this.running = false
    this.loopRunning = false
    this.bot.pathfinder.setGoal(null)
    console.log(`[${this.bot.username}] Stopping builder behavior`)
  }

  getStatus(): string {
    if (!this.running) return 'stopped'
    return `building ${this.config.buildPattern}`
  }

  private async buildLoop(): Promise<void> {
    while (this.loopRunning) {
      try {
        await this.buildStructure()
        await this.sleep(5000)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Error in build loop:`, err.message)
        await this.sleep(3000)
      }
    }
  }

  private async buildStructure(): Promise<void> {
    // Find building material in inventory
    const material = this.bot.inventory.items().find(item =>
      item.name === this.config.buildMaterial ||
      item.name.includes('dirt') ||
      item.name.includes('stone') ||
      item.name.includes('cobblestone')
    )

    if (!material) {
      console.log(`[${this.bot.username}] No building materials found`)
      return
    }

    await this.bot.equip(material, 'hand')

    switch (this.config.buildPattern) {
      case 'pillar':
        await this.buildPillar()
        break
      case 'wall':
        await this.buildWall()
        break
      case 'platform':
        await this.buildPlatform()
        break
      case 'random':
        await this.buildRandom()
        break
    }
  }

  private async buildPillar(): Promise<void> {
    const startPos = this.bot.entity.position.floored()

    for (let y = 0; y < this.config.buildHeight!; y++) {
      if (!this.loopRunning) break

      const targetPos = startPos.offset(0, y, 0)
      const block = this.bot.blockAt(targetPos)

      if (block && block.name === 'air') {
        try {
          const blockBelow = this.bot.blockAt(targetPos.offset(0, -1, 0))
          if (blockBelow && blockBelow.name !== 'air') {
            await this.bot.placeBlock(blockBelow, new Vec3(0, 1, 0))
            console.log(`[${this.bot.username}] Placed block at height ${y}`)
            await this.sleep(500)
          }
        } catch (err: any) {
          // Failed to place block
        }
      }
    }
  }

  private async buildWall(): Promise<void> {
    const startPos = this.bot.entity.position.floored()

    for (let x = -5; x <= 5; x++) {
      if (!this.loopRunning) break

      for (let y = 0; y < 3; y++) {
        const targetPos = startPos.offset(x, y, 0)
        const block = this.bot.blockAt(targetPos)

        if (block && block.name === 'air') {
          try {
            const blockBelow = this.bot.blockAt(targetPos.offset(0, -1, 0))
            if (blockBelow && blockBelow.name !== 'air') {
              await this.bot.placeBlock(blockBelow, new Vec3(0, 1, 0))
              await this.sleep(300)
            }
          } catch (err: any) {
            // Failed to place block
          }
        }
      }
    }
  }

  private async buildPlatform(): Promise<void> {
    const startPos = this.bot.entity.position.floored()

    for (let x = -2; x <= 2; x++) {
      if (!this.loopRunning) break

      for (let z = -2; z <= 2; z++) {
        const targetPos = startPos.offset(x, 0, z)
        const block = this.bot.blockAt(targetPos)

        if (block && block.name === 'air') {
          try {
            const blockBelow = this.bot.blockAt(targetPos.offset(0, -1, 0))
            if (blockBelow && blockBelow.name !== 'air') {
              await this.bot.placeBlock(blockBelow, new Vec3(0, 1, 0))
              await this.sleep(200)
            }
          } catch (err: any) {
            // Failed to place block
          }
        }
      }
    }
  }

  private async buildRandom(): Promise<void> {
    const startPos = this.bot.entity.position.floored()
    const x = Math.floor((Math.random() - 0.5) * 10)
    const y = Math.floor(Math.random() * 5)
    const z = Math.floor((Math.random() - 0.5) * 10)

    const targetPos = startPos.offset(x, y, z)
    const block = this.bot.blockAt(targetPos)

    if (block && block.name === 'air') {
      try {
        const blockBelow = this.bot.blockAt(targetPos.offset(0, -1, 0))
        if (blockBelow && blockBelow.name !== 'air') {
          await this.bot.placeBlock(blockBelow, new Vec3(0, 1, 0))
          console.log(`[${this.bot.username}] Placed random block at (${x}, ${y}, ${z})`)
        }
      } catch (err: any) {
        // Failed to place block
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
