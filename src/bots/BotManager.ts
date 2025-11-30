import { EventEmitter } from 'events'
import { BotInstance } from './BotInstance'
import { BotConfig, BotState, BehaviorType } from '../types'

export class BotManager extends EventEmitter {
  private bots: Map<string, BotInstance> = new Map()
  private maxBots: number

  constructor(maxBots: number = 500) {
    super()
    this.maxBots = maxBots
  }

  async createBot(config: BotConfig): Promise<BotInstance> {
    if (this.bots.size >= this.maxBots) {
      throw new Error(`Maximum number of bots reached (${this.maxBots})`)
    }

    if (this.bots.has(config.username)) {
      throw new Error(`Bot with username ${config.username} already exists`)
    }

    const bot = new BotInstance(config)

    // Forward bot events to manager
    bot.on('connected', (state) => this.emit('botConnected', state))
    bot.on('disconnected', (state) => this.emit('botDisconnected', state))
    bot.on('error', (err) => this.emit('botError', { username: config.username, error: err }))
    bot.on('statusChange', (state) => this.emit('botStateUpdate', state))
    bot.on('stateUpdate', (state) => this.emit('botStateUpdate', state))
    bot.on('chat', (data) => this.emit('botChat', { username: config.username, ...data }))

    this.bots.set(config.username, bot)
    this.emit('botCreated', bot.getState())

    console.log(`[BotManager] Created bot: ${config.username}`)
    return bot
  }

  async createMultipleBots(baseConfig: Omit<BotConfig, 'username'>, count: number, prefix: string = 'Bot'): Promise<BotInstance[]> {
    const bots: BotInstance[] = []

    for (let i = 0; i < count; i++) {
      const username = `${prefix}${i + 1}`
      const config: BotConfig = {
        ...baseConfig,
        username,
      }

      try {
        const bot = await this.createBot(config)
        bots.push(bot)
      } catch (err: any) {
        console.error(`[BotManager] Failed to create bot ${username}:`, err.message)
      }
    }

    return bots
  }

  async connectBot(username: string): Promise<void> {
    const bot = this.bots.get(username)
    if (!bot) {
      throw new Error(`Bot ${username} not found`)
    }

    await bot.connect()
  }

  async connectAllBots(): Promise<void> {
    const promises = Array.from(this.bots.values()).map(bot =>
      bot.connect().catch(err => {
        console.error(`[BotManager] Failed to connect bot:`, err.message)
      })
    )

    await Promise.all(promises)
  }

  async disconnectBot(username: string): Promise<void> {
    const bot = this.bots.get(username)
    if (!bot) {
      throw new Error(`Bot ${username} not found`)
    }

    await bot.disconnect()
  }

  async disconnectAllBots(): Promise<void> {
    const promises = Array.from(this.bots.values()).map(bot => bot.disconnect())
    await Promise.all(promises)
  }

  async startBotBehavior(username: string): Promise<void> {
    const bot = this.bots.get(username)
    if (!bot) {
      throw new Error(`Bot ${username} not found`)
    }

    await bot.startBehavior()
  }

  async stopBotBehavior(username: string): Promise<void> {
    const bot = this.bots.get(username)
    if (!bot) {
      throw new Error(`Bot ${username} not found`)
    }

    await bot.stopBehavior()
  }

  async changeBotBehavior(username: string, behavior: BehaviorType): Promise<void> {
    const bot = this.bots.get(username)
    if (!bot) {
      throw new Error(`Bot ${username} not found`)
    }

    await bot.changeBehavior(behavior)
  }

  async removeBot(username: string): Promise<void> {
    const bot = this.bots.get(username)
    if (!bot) {
      throw new Error(`Bot ${username} not found`)
    }

    await bot.disconnect()
    this.bots.delete(username)
    this.emit('botRemoved', { username })
    console.log(`[BotManager] Removed bot: ${username}`)
  }

  async removeAllBots(): Promise<void> {
    await this.disconnectAllBots()
    this.bots.clear()
    console.log(`[BotManager] Removed all bots`)
  }

  getBot(username: string): BotInstance | undefined {
    return this.bots.get(username)
  }

  getAllBots(): BotInstance[] {
    return Array.from(this.bots.values())
  }

  getBotStates(): BotState[] {
    return Array.from(this.bots.values()).map(bot => bot.getState())
  }

  getBotCount(): number {
    return this.bots.size
  }

  getStats(): {
    total: number
    connected: number
    running: number
    idle: number
    error: number
    disconnected: number
  } {
    const states = this.getBotStates()

    return {
      total: states.length,
      connected: states.filter(s => s.status === 'idle' || s.status === 'running').length,
      running: states.filter(s => s.status === 'running').length,
      idle: states.filter(s => s.status === 'idle').length,
      error: states.filter(s => s.status === 'error').length,
      disconnected: states.filter(s => s.status === 'disconnected').length,
    }
  }
}
