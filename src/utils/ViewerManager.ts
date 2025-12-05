import { EventEmitter } from 'events'
import { BotInstance } from '../bots/BotInstance'
import { Bot } from 'mineflayer'

const mineflayerViewer = require('prismarine-viewer').mineflayer

export interface ViewerConfig {
  port?: number
  firstPerson?: boolean
  viewDistance?: number
}

export interface ActiveViewer {
  botUsername: string
  port: number
  firstPerson: boolean
  viewDistance: number
}

export class ViewerManager extends EventEmitter {
  private viewers: Map<string, any> = new Map()
  private portRange: { min: number; max: number }
  private usedPorts: Set<number> = new Set()

  constructor(portRangeStart: number = 3000, portRangeEnd: number = 3100) {
    super()
    this.portRange = { min: portRangeStart, max: portRangeEnd }
  }

  /**
   * Start a viewer for a specific bot
   */
  async startViewer(
    botInstance: BotInstance,
    config: ViewerConfig = {}
  ): Promise<ActiveViewer> {
    const bot = botInstance.getBot()
    if (!bot) {
      throw new Error(`Bot ${botInstance.getState().username} is not connected`)
    }

    const username = botInstance.getState().username

    // Check if viewer already exists
    if (this.viewers.has(username)) {
      throw new Error(`Viewer for bot ${username} already exists`)
    }

    // Allocate port
    const port = config.port || this.allocatePort()
    const firstPerson = config.firstPerson ?? false
    const viewDistance = config.viewDistance ?? 6

    try {
      // Start the viewer
      const viewer = mineflayerViewer(bot, {
        port,
        firstPerson,
        viewDistance,
      })

      // Store viewer reference
      this.viewers.set(username, {
        viewer,
        port,
        firstPerson,
        viewDistance,
        bot,
      })

      this.usedPorts.add(port)

      console.log(`[ViewerManager] Started viewer for ${username} on port ${port}`)

      this.emit('viewerStarted', {
        botUsername: username,
        port,
        firstPerson,
        viewDistance,
      })

      return {
        botUsername: username,
        port,
        firstPerson,
        viewDistance,
      }
    } catch (err: any) {
      this.usedPorts.delete(port)
      throw new Error(`Failed to start viewer for ${username}: ${err.message}`)
    }
  }

  /**
   * Stop a viewer for a specific bot
   */
  async stopViewer(username: string): Promise<void> {
    const viewerData = this.viewers.get(username)
    if (!viewerData) {
      throw new Error(`No viewer found for bot ${username}`)
    }

    try {
      // Close the viewer
      if (viewerData.viewer && viewerData.viewer.close) {
        await viewerData.viewer.close()
      }

      // Free the port
      this.usedPorts.delete(viewerData.port)

      // Remove from map
      this.viewers.delete(username)

      console.log(`[ViewerManager] Stopped viewer for ${username}`)

      this.emit('viewerStopped', {
        botUsername: username,
        port: viewerData.port,
      })
    } catch (err: any) {
      console.error(`[ViewerManager] Error stopping viewer for ${username}:`, err.message)
      throw err
    }
  }

  /**
   * Stop all active viewers
   */
  async stopAllViewers(): Promise<void> {
    const usernames = Array.from(this.viewers.keys())

    for (const username of usernames) {
      try {
        await this.stopViewer(username)
      } catch (err: any) {
        console.error(`[ViewerManager] Error stopping viewer for ${username}:`, err.message)
      }
    }
  }

  /**
   * Get viewer info for a specific bot
   */
  getViewer(username: string): ActiveViewer | undefined {
    const viewerData = this.viewers.get(username)
    if (!viewerData) {
      return undefined
    }

    return {
      botUsername: username,
      port: viewerData.port,
      firstPerson: viewerData.firstPerson,
      viewDistance: viewerData.viewDistance,
    }
  }

  /**
   * Get all active viewers
   */
  getAllViewers(): ActiveViewer[] {
    return Array.from(this.viewers.entries()).map(([username, data]) => ({
      botUsername: username,
      port: data.port,
      firstPerson: data.firstPerson,
      viewDistance: data.viewDistance,
    }))
  }

  /**
   * Check if a viewer exists for a bot
   */
  hasViewer(username: string): boolean {
    return this.viewers.has(username)
  }

  /**
   * Get count of active viewers
   */
  getViewerCount(): number {
    return this.viewers.size
  }

  /**
   * Allocate an available port from the port range
   */
  private allocatePort(): number {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (!this.usedPorts.has(port)) {
        return port
      }
    }

    throw new Error('No available ports in the configured range')
  }

  /**
   * Get stats about the viewer manager
   */
  getStats() {
    return {
      activeViewers: this.viewers.size,
      usedPorts: Array.from(this.usedPorts),
      availablePorts: this.portRange.max - this.portRange.min + 1 - this.usedPorts.size,
    }
  }
}
