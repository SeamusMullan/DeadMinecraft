import { EventEmitter } from 'events'
import { BotInstance } from './BotInstance'
import { BotConfig, BotState, BehaviorType, AnalyticsData } from '../types'
import { GroupManager } from '../utils/GroupManager'
import { AnalyticsManager } from '../utils/AnalyticsManager'

export class BotManager extends EventEmitter {
  private bots: Map<string, BotInstance> = new Map()
  private maxBots: number
  private groupManager: GroupManager
  private analyticsManager: AnalyticsManager

  constructor(maxBots: number = 500) {
    super()
    this.maxBots = maxBots
    this.groupManager = new GroupManager()
    this.analyticsManager = new AnalyticsManager()

    // Forward group events
    this.groupManager.on('groupCreated', (group) => this.emit('groupCreated', group))
    this.groupManager.on('groupRemoved', (data) => this.emit('groupRemoved', data))
    this.groupManager.on('botAddedToGroup', (data) => this.emit('botAddedToGroup', data))

    // Start analytics collection
    this.analyticsManager.start(60000) // Collect every minute

    // Handle analytics snapshot requests
    this.analyticsManager.on('snapshotRequested', () => {
      this.collectAnalyticsSnapshot()
    })
  }

  async createBot(config: BotConfig): Promise<BotInstance> {
    if (this.bots.size >= this.maxBots) {
      throw new Error(`Maximum number of bots reached (${this.maxBots})`)
    }

    if (this.bots.has(config.username)) {
      throw new Error(`Bot with username ${config.username} already exists`)
    }

    const bot = new BotInstance(config)

    // Initialize bot stats in analytics
    this.analyticsManager.initializeBotStats(config.username)

    // Forward bot events to manager
    bot.on('connected', (state) => this.emit('botConnected', state))
    bot.on('disconnected', (state) => this.emit('botDisconnected', state))
    bot.on('error', (err) => this.emit('botError', { username: config.username, error: err }))
    bot.on('statusChange', (state) => this.emit('botStateUpdate', state))
    bot.on('stateUpdate', (state) => this.emit('botStateUpdate', state))
    bot.on('chat', (data) => this.emit('botChat', { username: config.username, ...data }))
    bot.on('botDied', (data) => {
      this.analyticsManager.recordDeath(config.username)
      this.emit('botDied', data)
    })

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

  // Group Management Methods
  createGroup(name: string, botUsernames: string[], leader?: string, objective?: string): string {
    return this.groupManager.createGroup(name, botUsernames, leader, objective)
  }

  getGroup(groupId: string) {
    return this.groupManager.getGroup(groupId)
  }

  getAllGroups() {
    return this.groupManager.getAllGroups()
  }

  addBotToGroup(groupId: string, botUsername: string): boolean {
    const bot = this.bots.get(botUsername)
    if (!bot) return false

    const success = this.groupManager.addBotToGroup(groupId, botUsername)
    if (success) {
      // Update bot config with group ID
      const config = (bot as any).config
      config.groupId = groupId
    }
    return success
  }

  removeBotFromGroup(groupId: string, botUsername: string): boolean {
    const bot = this.bots.get(botUsername)
    if (!bot) return false

    const success = this.groupManager.removeBotFromGroup(groupId, botUsername)
    if (success) {
      // Remove group ID from bot config
      const config = (bot as any).config
      config.groupId = undefined
    }
    return success
  }

  removeGroup(groupId: string): boolean {
    const group = this.groupManager.getGroup(groupId)
    if (!group) return false

    // Remove group ID from all bots in the group
    for (const botUsername of group.bots) {
      const bot = this.bots.get(botUsername)
      if (bot) {
        const config = (bot as any).config
        config.groupId = undefined
      }
    }

    return this.groupManager.removeGroup(groupId)
  }

  setGroupFormation(groupId: string, formation: any): boolean {
    return this.groupManager.setGroupFormation(groupId, formation)
  }

  setGroupObjective(groupId: string, objective: string): boolean {
    return this.groupManager.setGroupObjective(groupId, objective)
  }

  getGroupManager(): GroupManager {
    return this.groupManager
  }

  // Analytics Methods
  getAnalytics(count: number = 100): AnalyticsData[] {
    return this.analyticsManager.getSnapshots(count)
  }

  getLatestAnalytics(): AnalyticsData | undefined {
    return this.analyticsManager.getLatestSnapshot()
  }

  getAggregatedStats() {
    return this.analyticsManager.getAggregatedStats()
  }

  getLeaderboard(stat: any, limit: number = 10) {
    return this.analyticsManager.getLeaderboard(stat, limit)
  }

  getAnalyticsManager(): AnalyticsManager {
    return this.analyticsManager
  }

  private collectAnalyticsSnapshot(): void {
    const states = this.getBotStates()
    const stats = this.getStats()
    const aggregated = this.analyticsManager.getAggregatedStats()

    const totalHealth = states.reduce((sum, s) => sum + (s.health || 0), 0)
    const totalFood = states.reduce((sum, s) => sum + (s.food || 0), 0)
    const connectedCount = stats.connected

    const snapshot: AnalyticsData = {
      timestamp: Date.now(),
      totalBots: stats.total,
      connectedBots: connectedCount,
      runningBots: stats.running,
      totalBlocksMined: aggregated.totalBlocksMined,
      totalItemsCollected: aggregated.totalItemsCollected,
      totalDeaths: aggregated.totalDeaths,
      totalKills: aggregated.totalKills,
      averageHealth: connectedCount > 0 ? totalHealth / connectedCount : 0,
      averageFood: connectedCount > 0 ? totalFood / connectedCount : 0,
      groupCount: this.groupManager.getAllGroups().length,
      errorRate: stats.total > 0 ? stats.error / stats.total : 0,
    }

    this.analyticsManager.addSnapshot(snapshot)
  }
}
