import { EventEmitter } from 'events'
import { AnalyticsData, BotStats } from '../types'

export class AnalyticsManager extends EventEmitter {
  private botStats: Map<string, BotStats> = new Map()
  private globalStats: AnalyticsData[] = []
  private maxHistorySize: number = 1000
  private collectInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
  }

  start(intervalMs: number = 60000): void {
    this.collectInterval = setInterval(() => {
      this.collectSnapshot()
    }, intervalMs)
  }

  stop(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval)
      this.collectInterval = null
    }
  }

  initializeBotStats(username: string): void {
    if (!this.botStats.has(username)) {
      this.botStats.set(username, {
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
      })
    }
  }

  getBotStats(username: string): BotStats | undefined {
    return this.botStats.get(username)
  }

  updateBotStat(username: string, stat: keyof BotStats, value: number): void {
    const stats = this.botStats.get(username)
    if (stats) {
      stats[stat] += value
      this.emit('statUpdated', { username, stat, value })
    }
  }

  setBotStat(username: string, stat: keyof BotStats, value: number): void {
    const stats = this.botStats.get(username)
    if (stats) {
      stats[stat] = value
      this.emit('statUpdated', { username, stat, value })
    }
  }

  recordBlockPlaced(username: string): void {
    this.updateBotStat(username, 'blocksPlaced', 1)
  }

  recordBlockBroken(username: string): void {
    this.updateBotStat(username, 'blocksBroken', 1)
  }

  recordItemCollected(username: string): void {
    this.updateBotStat(username, 'itemsCollected', 1)
  }

  recordItemCrafted(username: string): void {
    this.updateBotStat(username, 'itemsCrafted', 1)
  }

  recordDeath(username: string): void {
    this.updateBotStat(username, 'deaths', 1)
  }

  recordKill(username: string): void {
    this.updateBotStat(username, 'kills', 1)
  }

  recordDamageDealt(username: string, damage: number): void {
    this.updateBotStat(username, 'damageDealt', damage)
  }

  recordDamageTaken(username: string, damage: number): void {
    this.updateBotStat(username, 'damageTaken', damage)
  }

  recordDistanceTraveled(username: string, distance: number): void {
    this.updateBotStat(username, 'distanceTraveled', distance)
  }

  recordMessageReceived(username: string): void {
    this.updateBotStat(username, 'messagesReceived', 1)
  }

  recordMessageSent(username: string): void {
    this.updateBotStat(username, 'messagesSent', 1)
  }

  private collectSnapshot(): void {
    // This will be called by BotManager with actual data
    this.emit('snapshotRequested')
  }

  addSnapshot(data: AnalyticsData): void {
    this.globalStats.push(data)

    // Limit history size
    if (this.globalStats.length > this.maxHistorySize) {
      this.globalStats = this.globalStats.slice(-this.maxHistorySize)
    }

    this.emit('snapshotAdded', data)
  }

  getSnapshots(count: number = 100): AnalyticsData[] {
    return this.globalStats.slice(-count)
  }

  getLatestSnapshot(): AnalyticsData | undefined {
    return this.globalStats[this.globalStats.length - 1]
  }

  getAggregatedStats(): {
    totalBlocksMined: number
    totalItemsCollected: number
    totalDeaths: number
    totalKills: number
    totalDamageDealt: number
    totalDamageTaken: number
    totalDistanceTraveled: number
  } {
    let totalBlocksMined = 0
    let totalItemsCollected = 0
    let totalDeaths = 0
    let totalKills = 0
    let totalDamageDealt = 0
    let totalDamageTaken = 0
    let totalDistanceTraveled = 0

    for (const stats of this.botStats.values()) {
      totalBlocksMined += stats.blocksBroken
      totalItemsCollected += stats.itemsCollected
      totalDeaths += stats.deaths
      totalKills += stats.kills
      totalDamageDealt += stats.damageDealt
      totalDamageTaken += stats.damageTaken
      totalDistanceTraveled += stats.distanceTraveled
    }

    return {
      totalBlocksMined,
      totalItemsCollected,
      totalDeaths,
      totalKills,
      totalDamageDealt,
      totalDamageTaken,
      totalDistanceTraveled,
    }
  }

  getLeaderboard(stat: keyof BotStats, limit: number = 10): Array<{ username: string; value: number }> {
    const entries = Array.from(this.botStats.entries())
      .map(([username, stats]) => ({
        username,
        value: stats[stat],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)

    return entries
  }

  clear(): void {
    this.botStats.clear()
    this.globalStats = []
  }

  removeBotStats(username: string): void {
    this.botStats.delete(username)
  }
}
