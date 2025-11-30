import mineflayer, { Bot } from 'mineflayer'
import { pathfinder } from 'mineflayer-pathfinder'
import { BotConfig, BotState, BotStatus, Behavior, BotStats, EquipmentInfo } from '../types'
import { createBehavior } from './behaviors'
import { EventEmitter } from 'events'
import { TaskQueue } from '../utils/TaskQueue'
import { HealthManager } from '../utils/HealthManager'
import { InventoryManager } from '../utils/InventoryManager'
import { CommunicationManager } from '../utils/CommunicationManager'

export class BotInstance extends EventEmitter {
  private bot: Bot | null = null
  private config: BotConfig
  private behavior: Behavior | null = null
  private status: BotStatus = 'idle'
  private errors: string[] = []
  private connectedAt: number = 0
  private reconnectTimeout: NodeJS.Timeout | null = null

  // New systems
  private taskQueue: TaskQueue
  private healthManager: HealthManager | null = null
  private inventoryManager: InventoryManager | null = null
  private communicationManager: CommunicationManager | null = null

  // Stats tracking
  private stats: BotStats = {
    blocksPlaced: 0,
    blocksBroken: 0,
    itemsCollected: 0,
    itemsCrafted: 0,
    deaths: 0,
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
    distanceTraveled: 0,
    messagesReceived: 0,
    messagesSent: 0,
  }

  private lastPosition: { x: number; y: number; z: number } | null = null

  constructor(config: BotConfig) {
    super()
    this.config = config
    this.taskQueue = new TaskQueue()

    // Setup task queue listeners
    this.taskQueue.on('taskStarted', (task) => {
      this.emit('taskStarted', { username: this.config.username, task })
    })

    this.taskQueue.on('taskCompleted', (task) => {
      this.emit('taskCompleted', { username: this.config.username, task })
    })
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

      // Load additional plugins
      try {
        const collectBlock = require('mineflayer-collectblock').plugin
        this.bot.loadPlugin(collectBlock)
      } catch (err) {
        console.log(`[${this.config.username}] collectblock plugin not available`)
      }

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

      // Initialize management systems
      this.initializeSystems()

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

  private initializeSystems(): void {
    if (!this.bot) return

    // Initialize health manager
    if (this.config.autoEat || this.config.autoHeal) {
      this.healthManager = new HealthManager(this.bot, {
        autoEat: this.config.autoEat,
        autoHeal: this.config.autoHeal,
      })
      this.healthManager.start()

      this.healthManager.on('died', () => {
        this.stats.deaths++
        this.emit('botDied', { username: this.config.username })
      })
    }

    // Initialize inventory manager
    this.inventoryManager = new InventoryManager(this.bot)
    this.inventoryManager.start()

    this.inventoryManager.on('itemCollected', () => {
      this.stats.itemsCollected++
    })

    // Initialize communication manager
    if (this.config.enableChatCommands) {
      this.communicationManager = new CommunicationManager(this.bot, 'admin')
      this.communicationManager.start()

      this.communicationManager.on('messageReceived', () => {
        this.stats.messagesReceived++
      })

      this.communicationManager.on('messageSent', () => {
        this.stats.messagesSent++
      })
    }

    // Start position tracking for distance
    this.lastPosition = {
      x: this.bot.entity.position.x,
      y: this.bot.entity.position.y,
      z: this.bot.entity.position.z,
    }

    // Track distance every second
    setInterval(() => {
      if (this.bot && this.lastPosition) {
        const currentPos = this.bot.entity.position
        const distance = Math.sqrt(
          Math.pow(currentPos.x - this.lastPosition.x, 2) +
          Math.pow(currentPos.y - this.lastPosition.y, 2) +
          Math.pow(currentPos.z - this.lastPosition.z, 2)
        )
        this.stats.distanceTraveled += distance
        this.lastPosition = { x: currentPos.x, y: currentPos.y, z: currentPos.z }
      }
    }, 1000)
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.behavior) {
      await this.stopBehavior()
    }

    // Stop all systems
    if (this.healthManager) {
      this.healthManager.stop()
      this.healthManager = null
    }

    if (this.inventoryManager) {
      this.inventoryManager.stop()
      this.inventoryManager = null
    }

    if (this.communicationManager) {
      this.communicationManager.stop()
      this.communicationManager = null
    }

    this.taskQueue.clear()

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
    const oxygen = this.bot?.oxygenLevel
    const experience = this.bot?.experience

    let inventory = undefined
    if (this.bot) {
      const items = this.bot.inventory.items().map(item => ({
        name: item.name,
        count: item.count,
        slot: item.slot,
      }))

      inventory = {
        slots: this.bot.inventory.slots.length,
        items,
        usedSlots: items.length,
        freeSlots: this.bot.inventory.emptySlotCount(),
      }
    }

    let equipment: EquipmentInfo | undefined
    if (this.bot) {
      equipment = {
        hand: this.bot.heldItem?.name,
        head: this.bot.inventory.slots[5]?.name,
        torso: this.bot.inventory.slots[6]?.name,
        legs: this.bot.inventory.slots[7]?.name,
        feet: this.bot.inventory.slots[8]?.name,
        offHand: this.bot.inventory.slots[45]?.name,
      }
    }

    const currentTask = this.taskQueue.getCurrentTask()
    let taskInfo = undefined
    if (currentTask) {
      taskInfo = {
        id: currentTask.id,
        type: currentTask.type,
        priority: currentTask.priority,
        status: currentTask.status,
        startedAt: currentTask.startedAt,
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
      oxygen,
      experience: experience?.points,
      level: experience?.level,
      inventory,
      equipment,
      errors: this.errors,
      uptime: this.connectedAt > 0 ? Date.now() - this.connectedAt : 0,
      connectedAt: this.connectedAt || undefined,
      groupId: this.config.groupId,
      currentTask: taskInfo,
      stats: { ...this.stats },
    }
  }

  // New accessor methods for systems
  getTaskQueue(): TaskQueue {
    return this.taskQueue
  }

  getHealthManager(): HealthManager | null {
    return this.healthManager
  }

  getInventoryManager(): InventoryManager | null {
    return this.inventoryManager
  }

  getCommunicationManager(): CommunicationManager | null {
    return this.communicationManager
  }

  getStats(): BotStats {
    return { ...this.stats }
  }

  updateStat(stat: keyof BotStats, value: number): void {
    this.stats[stat] += value
    this.emit('statUpdate', { username: this.config.username, stat, value })
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

    // Track entity deaths
    this.bot.on('entityDead', (entity) => {
      if (entity === this.bot?.entity) {
        this.stats.deaths++
        this.emit('botDied', { username: this.config.username })
      }
    })

    // Track physical stats
    this.bot.on('physicsTick', () => {
      // Periodically update state for very active bots
      if (Math.random() < 0.01) { // 1% chance each tick
        this.emit('stateUpdate', this.getState())
      }
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
