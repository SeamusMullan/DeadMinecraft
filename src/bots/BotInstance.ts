import mineflayer, { Bot } from 'mineflayer'
import { pathfinder } from 'mineflayer-pathfinder'
import { BotConfig, BotState, BotStatus, Behavior } from '../types'
import { createBehavior } from './behaviors'
import { EventEmitter } from 'events'

export class BotInstance extends EventEmitter {
  private bot: Bot | null = null
  private config: BotConfig
  private behavior: Behavior | null = null
  private status: BotStatus = 'idle'
  private errors: string[] = []
  private connectedAt: number = 0
  private reconnectTimeout: NodeJS.Timeout | null = null

  constructor(config: BotConfig) {
    super()
    this.config = config
  }

  async connect(): Promise<void> {
    if (this.bot) {
      console.log(`[${this.config.username}] Already connected`)
      return
    }

    this.status = 'connecting'
    this.emit('statusChange', this.getState())

    try {
      console.log(`[${this.config.username}] Connecting to ${this.config.host}:${this.config.port}`)

      this.bot = mineflayer.createBot({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        version: this.config.version,
      })

      this.bot.loadPlugin(pathfinder)
      this.setupEventHandlers()

      // Wait for spawn
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 30000)

        this.bot!.once('spawn', () => {
          clearTimeout(timeout)
          resolve()
        })

        this.bot!.once('error', (err) => {
          clearTimeout(timeout)
          reject(err)
        })
      })

      this.connectedAt = Date.now()
      this.status = 'idle'
      this.errors = []

      console.log(`[${this.config.username}] Connected successfully`)
      this.emit('connected', this.getState())

    } catch (err: any) {
      this.status = 'error'
      this.addError(`Connection failed: ${err.message}`)
      this.emit('error', err)

      if (this.config.autoReconnect) {
        this.scheduleReconnect()
      }

      throw err
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.behavior) {
      await this.stopBehavior()
    }

    if (this.bot) {
      this.bot.quit()
      this.bot = null
    }

    this.status = 'disconnected'
    this.emit('disconnected', this.getState())
    console.log(`[${this.config.username}] Disconnected`)
  }

  async startBehavior(): Promise<void> {
    if (!this.bot) {
      throw new Error('Bot not connected')
    }

    if (this.behavior) {
      await this.behavior.stop()
    }

    this.behavior = createBehavior(this.bot, this.config.behavior, {})
    await this.behavior.start()

    this.status = 'running'
    this.emit('statusChange', this.getState())
    console.log(`[${this.config.username}] Started ${this.config.behavior} behavior`)
  }

  async stopBehavior(): Promise<void> {
    if (this.behavior) {
      await this.behavior.stop()
      this.behavior = null
      this.status = 'idle'
      this.emit('statusChange', this.getState())
      console.log(`[${this.config.username}] Stopped behavior`)
    }
  }

  async changeBehavior(behaviorType: string): Promise<void> {
    if (this.behavior) {
      await this.stopBehavior()
    }

    this.config.behavior = behaviorType as any
    await this.startBehavior()
  }

  getState(): BotState {
    const position = this.bot?.entity?.position
    const health = this.bot?.health
    const food = this.bot?.food

    let inventory = undefined
    if (this.bot) {
      const items = this.bot.inventory.items().map(item => ({
        name: item.name,
        count: item.count,
      }))

      inventory = {
        slots: this.bot.inventory.slots.length,
        items,
      }
    }

    return {
      id: this.config.username,
      username: this.config.username,
      status: this.status,
      behavior: this.config.behavior,
      position: position ? { x: position.x, y: position.y, z: position.z } : undefined,
      health,
      food,
      inventory,
      errors: this.errors,
      uptime: this.connectedAt > 0 ? Date.now() - this.connectedAt : 0,
      connectedAt: this.connectedAt || undefined,
    }
  }

  getBot(): Bot | null {
    return this.bot
  }

  private setupEventHandlers(): void {
    if (!this.bot) return

    this.bot.on('spawn', () => {
      console.log(`[${this.config.username}] Spawned in game`)
    })

    this.bot.on('error', (err) => {
      console.error(`[${this.config.username}] Error:`, err.message)
      this.addError(err.message)
      this.status = 'error'
      this.emit('error', err)
    })

    this.bot.on('kicked', (reason) => {
      console.log(`[${this.config.username}] Kicked:`, reason)
      this.addError(`Kicked: ${reason}`)
      this.status = 'disconnected'
      this.emit('kicked', reason)

      if (this.config.autoReconnect) {
        this.scheduleReconnect()
      }
    })

    this.bot.on('end', () => {
      console.log(`[${this.config.username}] Connection ended`)
      this.bot = null
      this.behavior = null

      if (this.status !== 'disconnected') {
        this.status = 'disconnected'
        this.emit('disconnected', this.getState())

        if (this.config.autoReconnect) {
          this.scheduleReconnect()
        }
      }
    })

    this.bot.on('health', () => {
      this.emit('stateUpdate', this.getState())
    })

    this.bot.on('chat', (username, message) => {
      if (username === this.bot?.username) return
      this.emit('chat', { username, message })
    })
  }

  private scheduleReconnect(): void {
    const delay = this.config.reconnectDelay || 5000

    console.log(`[${this.config.username}] Reconnecting in ${delay}ms...`)

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(err => {
        console.error(`[${this.config.username}] Reconnect failed:`, err.message)
      })
    }, delay)
  }

  private addError(error: string): void {
    this.errors.push(error)
    // Keep only last 10 errors
    if (this.errors.length > 10) {
      this.errors = this.errors.slice(-10)
    }
    this.emit('statusChange', this.getState())
  }
}
