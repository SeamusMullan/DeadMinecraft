import { Bot } from 'mineflayer'
import { EventEmitter } from 'events'

export interface HealthManagerConfig {
  autoEat: boolean
  autoHeal: boolean
  healthThreshold: number
  foodThreshold: number
  priorityFood: string[]
}

export class HealthManager extends EventEmitter {
  private bot: Bot
  private config: HealthManagerConfig
  private autoEatPlugin: any
  private running: boolean = false
  private healCheckInterval: NodeJS.Timeout | null = null

  constructor(bot: Bot, config: Partial<HealthManagerConfig> = {}) {
    super()
    this.bot = bot
    this.config = {
      autoEat: config.autoEat !== false,
      autoHeal: config.autoHeal !== false,
      healthThreshold: config.healthThreshold || 15,
      foodThreshold: config.foodThreshold || 15,
      priorityFood: config.priorityFood || [
        'golden_apple',
        'cooked_beef',
        'cooked_porkchop',
        'cooked_mutton',
        'cooked_chicken',
        'bread',
        'apple',
      ],
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    // Load auto-eat plugin
    if (this.config.autoEat) {
      try {
        const autoeat = require('mineflayer-auto-eat')
        this.bot.loadPlugin(autoeat.plugin)
        this.autoEatPlugin = (this.bot as any).autoEat

        // Configure auto-eat
        if (this.autoEatPlugin && this.autoEatPlugin.options) {
          this.autoEatPlugin.options.priority = 'foodPoints'
          this.autoEatPlugin.options.startAt = this.config.foodThreshold
          this.autoEatPlugin.options.bannedFood = []
        }

        (this.bot as any).on('autoeat_started', () => {
          this.emit('eating', this.bot.username)
        })

        (this.bot as any).on('autoeat_stopped', () => {
          this.emit('ate', this.bot.username)
        })
      } catch (err) {
        console.error(`[${this.bot.username}] Failed to load auto-eat plugin:`, err)
      }
    }

    // Set up health monitoring
    if (this.config.autoHeal) {
      this.setupHealthMonitoring()
    }

    this.setupEventHandlers()
  }

  stop(): void {
    if (!this.running) return
    this.running = false

    if (this.healCheckInterval) {
      clearInterval(this.healCheckInterval)
      this.healCheckInterval = null
    }
  }

  private setupHealthMonitoring(): void {
    this.healCheckInterval = setInterval(async () => {
      if (!this.bot || !this.running) return

      const health = this.bot.health
      if (health !== undefined && health < this.config.healthThreshold) {
        await this.attemptHeal()
      }
    }, 2000)
  }

  private async attemptHeal(): Promise<void> {
    try {
      // Try to use golden apple first
      const goldenApple = this.bot.inventory.items().find(item =>
        item.name === 'golden_apple' || item.name === 'enchanted_golden_apple'
      )

      if (goldenApple) {
        await this.bot.equip(goldenApple, 'hand')
        await this.bot.consume()
        this.emit('healed', { type: 'golden_apple', health: this.bot.health })
        return
      }

      // Try to use potion of healing
      const healingPotion = this.bot.inventory.items().find(item =>
        item.name.includes('potion') && item.name.includes('healing')
      )

      if (healingPotion) {
        await this.bot.equip(healingPotion, 'hand')
        await this.bot.consume()
        this.emit('healed', { type: 'potion', health: this.bot.health })
        return
      }

      // Otherwise, try to eat food
      if (this.autoEatPlugin) {
        await this.autoEatPlugin.eat()
      }
    } catch (err: any) {
      this.emit('healFailed', err.message)
    }
  }

  private setupEventHandlers(): void {
    this.bot.on('health', () => {
      const health = this.bot.health
      if (health !== undefined && health <= 0) {
        this.emit('died', this.bot.username)
      } else if (health !== undefined && health < this.config.healthThreshold) {
        this.emit('lowHealth', { username: this.bot.username, health })
      }
    })

    this.bot.on('breath', () => {
      const oxygen = this.bot.oxygenLevel
      if (oxygen !== undefined && oxygen < 5) {
        this.emit('lowOxygen', { username: this.bot.username, oxygen })
      }
    })
  }

  async eatFood(foodName?: string): Promise<boolean> {
    try {
      if (foodName) {
        const food = this.bot.inventory.items().find(item => item.name === foodName)
        if (food) {
          await this.bot.equip(food, 'hand')
          await this.bot.consume()
          return true
        }
      } else if (this.autoEatPlugin) {
        await this.autoEatPlugin.eat()
        return true
      }
      return false
    } catch (err) {
      return false
    }
  }

  getHealthStatus(): { health: number; food: number; oxygen: number } {
    return {
      health: this.bot.health || 0,
      food: this.bot.food || 0,
      oxygen: this.bot.oxygenLevel || 20,
    }
  }
}
