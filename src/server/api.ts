import express, { Request, Response } from 'express'
import cors from 'cors'
import { BotManager } from '../bots/BotManager'
import { ViewerManager } from '../utils/ViewerManager'
import { BotConfig, BehaviorType } from '../types'

export class APIServer {
  private app: express.Application
  private botManager: BotManager
  private viewerManager: ViewerManager
  private server: any

  constructor(port: number, botManager: BotManager, viewerManager: ViewerManager) {
    this.app = express()
    this.botManager = botManager
    this.viewerManager = viewerManager

    this.app.use(cors())
    this.app.use(express.json())

    this.setupRoutes()

    this.server = this.app.listen(port, () => {
      console.log(`[API] Server listening on port ${port}`)
    })
  }

  private setupRoutes(): void {
    // Get all bots
    this.app.get('/api/bots', (req: Request, res: Response) => {
      const bots = this.botManager.getBotStates()
      res.json({ bots })
    })

    // Get stats
    this.app.get('/api/stats', (req: Request, res: Response) => {
      const stats = this.botManager.getStats()
      res.json(stats)
    })

    // Get specific bot
    this.app.get('/api/bots/:username', (req: Request, res: Response) => {
      const bot = this.botManager.getBot(req.params.username)
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' })
      }
      res.json(bot.getState())
    })

    // Create a bot
    this.app.post('/api/bots', async (req: Request, res: Response) => {
      try {
        const config: BotConfig = req.body
        const bot = await this.botManager.createBot(config)
        res.status(201).json(bot.getState())
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Create multiple bots
    this.app.post('/api/bots/bulk', async (req: Request, res: Response) => {
      try {
        const { baseConfig, count, prefix } = req.body
        const bots = await this.botManager.createMultipleBots(baseConfig, count, prefix)
        res.status(201).json({
          created: bots.length,
          bots: bots.map(b => b.getState())
        })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Connect all bots (must be before /:username/connect to avoid route conflict)
    this.app.post('/api/bots/all/connect', async (req: Request, res: Response) => {
      try {
        await this.botManager.connectAllBots()
        res.json({ success: true, stats: this.botManager.getStats() })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Disconnect all bots (must be before /:username/disconnect to avoid route conflict)
    this.app.post('/api/bots/all/disconnect', async (req: Request, res: Response) => {
      try {
        await this.botManager.disconnectAllBots()
        res.json({ success: true, stats: this.botManager.getStats() })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Start all bots (must be before /:username/start to avoid route conflict)
    this.app.post('/api/bots/all/start', async (_req: Request, res: Response) => {
      try {
        const bots = this.botManager.getAllBots()
        let started = 0
        for (const bot of bots) {
          if (bot.getState().status === 'idle') {
            await bot.startBehavior()
            started++
          }
        }
        res.json({ success: true, started, stats: this.botManager.getStats() })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Stop all bots (must be before /:username/stop to avoid route conflict)
    this.app.post('/api/bots/all/stop', async (_req: Request, res: Response) => {
      try {
        const bots = this.botManager.getAllBots()
        let stopped = 0
        for (const bot of bots) {
          if (bot.getState().status === 'running') {
            await bot.stopBehavior()
            stopped++
          }
        }
        res.json({ success: true, stopped, stats: this.botManager.getStats() })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Connect a bot
    this.app.post('/api/bots/:username/connect', async (req: Request, res: Response) => {
      try {
        await this.botManager.connectBot(req.params.username)
        const bot = this.botManager.getBot(req.params.username)
        res.json(bot?.getState())
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Disconnect a bot
    this.app.post('/api/bots/:username/disconnect', async (req: Request, res: Response) => {
      try {
        await this.botManager.disconnectBot(req.params.username)
        const bot = this.botManager.getBot(req.params.username)
        res.json(bot?.getState())
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Start bot behavior
    this.app.post('/api/bots/:username/start', async (req: Request, res: Response) => {
      try {
        await this.botManager.startBotBehavior(req.params.username)
        const bot = this.botManager.getBot(req.params.username)
        res.json(bot?.getState())
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Stop bot behavior
    this.app.post('/api/bots/:username/stop', async (req: Request, res: Response) => {
      try {
        await this.botManager.stopBotBehavior(req.params.username)
        const bot = this.botManager.getBot(req.params.username)
        res.json(bot?.getState())
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Change bot behavior
    this.app.post('/api/bots/:username/behavior', async (req: Request, res: Response) => {
      try {
        const { behavior } = req.body
        await this.botManager.changeBotBehavior(req.params.username, behavior as BehaviorType)
        const bot = this.botManager.getBot(req.params.username)
        res.json(bot?.getState())
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Delete a bot
    this.app.delete('/api/bots/:username', async (req: Request, res: Response) => {
      try {
        await this.botManager.removeBot(req.params.username)
        res.json({ success: true })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() })
    })

    // ==================== GROUP MANAGEMENT ====================

    // Get all groups
    this.app.get('/api/groups', (req: Request, res: Response) => {
      const groups = this.botManager.getAllGroups()
      res.json({ groups })
    })

    // Get specific group
    this.app.get('/api/groups/:groupId', (req: Request, res: Response) => {
      const group = this.botManager.getGroup(req.params.groupId)
      if (!group) {
        return res.status(404).json({ error: 'Group not found' })
      }
      res.json(group)
    })

    // Create a group
    this.app.post('/api/groups', (req: Request, res: Response) => {
      try {
        const { name, bots, leader, objective } = req.body
        const groupId = this.botManager.createGroup(name, bots, leader, objective)
        const group = this.botManager.getGroup(groupId)
        res.status(201).json(group)
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Add bot to group
    this.app.post('/api/groups/:groupId/add/:username', (req: Request, res: Response) => {
      try {
        const success = this.botManager.addBotToGroup(req.params.groupId, req.params.username)
        if (!success) {
          return res.status(400).json({ error: 'Failed to add bot to group' })
        }
        res.json({ success: true, group: this.botManager.getGroup(req.params.groupId) })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Remove bot from group
    this.app.post('/api/groups/:groupId/remove/:username', (req: Request, res: Response) => {
      try {
        const success = this.botManager.removeBotFromGroup(req.params.groupId, req.params.username)
        if (!success) {
          return res.status(400).json({ error: 'Failed to remove bot from group' })
        }
        res.json({ success: true, group: this.botManager.getGroup(req.params.groupId) })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Delete a group
    this.app.delete('/api/groups/:groupId', (req: Request, res: Response) => {
      try {
        const success = this.botManager.removeGroup(req.params.groupId)
        if (!success) {
          return res.status(404).json({ error: 'Group not found' })
        }
        res.json({ success: true })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Set group formation
    this.app.post('/api/groups/:groupId/formation', (req: Request, res: Response) => {
      try {
        const { formation } = req.body
        const success = this.botManager.setGroupFormation(req.params.groupId, formation)
        if (!success) {
          return res.status(404).json({ error: 'Group not found' })
        }
        res.json({ success: true, group: this.botManager.getGroup(req.params.groupId) })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Set group objective
    this.app.post('/api/groups/:groupId/objective', (req: Request, res: Response) => {
      try {
        const { objective } = req.body
        const success = this.botManager.setGroupObjective(req.params.groupId, objective)
        if (!success) {
          return res.status(404).json({ error: 'Group not found' })
        }
        res.json({ success: true, group: this.botManager.getGroup(req.params.groupId) })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // ==================== ANALYTICS ====================

    // Get analytics data
    this.app.get('/api/analytics', (req: Request, res: Response) => {
      const count = req.query.count ? parseInt(req.query.count as string) : 100
      const analytics = this.botManager.getAnalytics(count)
      res.json({ analytics })
    })

    // Get latest analytics
    this.app.get('/api/analytics/latest', (req: Request, res: Response) => {
      const latest = this.botManager.getLatestAnalytics()
      res.json(latest || { error: 'No analytics data available' })
    })

    // Get aggregated stats
    this.app.get('/api/analytics/aggregated', (req: Request, res: Response) => {
      const stats = this.botManager.getAggregatedStats()
      res.json(stats)
    })

    // Get leaderboard
    this.app.get('/api/analytics/leaderboard/:stat', (req: Request, res: Response) => {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
      const leaderboard = this.botManager.getLeaderboard(req.params.stat, limit)
      res.json({ leaderboard })
    })

    // ==================== BOT TASKS ====================

    // Get bot tasks
    this.app.get('/api/bots/:username/tasks', (req: Request, res: Response) => {
      const bot = this.botManager.getBot(req.params.username)
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' })
      }
      const tasks = bot.getTaskQueue().getAllTasks()
      res.json({ tasks })
    })

    // Add task to bot
    this.app.post('/api/bots/:username/tasks', (req: Request, res: Response) => {
      try {
        const bot = this.botManager.getBot(req.params.username)
        if (!bot) {
          return res.status(404).json({ error: 'Bot not found' })
        }

        const { type, data, priority, maxRetries } = req.body
        const taskId = bot.getTaskQueue().addTask(type, data, priority, maxRetries)
        res.status(201).json({ taskId, task: bot.getTaskQueue().getTask(taskId) })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Remove task from bot
    this.app.delete('/api/bots/:username/tasks/:taskId', (req: Request, res: Response) => {
      try {
        const bot = this.botManager.getBot(req.params.username)
        if (!bot) {
          return res.status(404).json({ error: 'Bot not found' })
        }

        const success = bot.getTaskQueue().removeTask(req.params.taskId)
        res.json({ success })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // ==================== BOT INVENTORY ====================

    // Get bot inventory details
    this.app.get('/api/bots/:username/inventory', (req: Request, res: Response) => {
      const bot = this.botManager.getBot(req.params.username)
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' })
      }

      const inventoryManager = bot.getInventoryManager()
      if (!inventoryManager) {
        return res.status(400).json({ error: 'Inventory manager not available' })
      }

      res.json(inventoryManager.getInventoryInfo())
    })

    // Throw away item
    this.app.post('/api/bots/:username/inventory/throw', async (req: Request, res: Response) => {
      try {
        const bot = this.botManager.getBot(req.params.username)
        if (!bot) {
          return res.status(404).json({ error: 'Bot not found' })
        }

        const inventoryManager = bot.getInventoryManager()
        if (!inventoryManager) {
          return res.status(400).json({ error: 'Inventory manager not available' })
        }

        const { itemName, count } = req.body
        const success = await inventoryManager.throwAwayItem(itemName, count)
        res.json({ success })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Sort inventory
    this.app.post('/api/bots/:username/inventory/sort', async (req: Request, res: Response) => {
      try {
        const bot = this.botManager.getBot(req.params.username)
        if (!bot) {
          return res.status(404).json({ error: 'Bot not found' })
        }

        const inventoryManager = bot.getInventoryManager()
        if (!inventoryManager) {
          return res.status(400).json({ error: 'Inventory manager not available' })
        }

        await inventoryManager.sortInventory()
        res.json({ success: true })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // ==================== BOT COMMUNICATION ====================

    // Send message from bot
    this.app.post('/api/bots/:username/chat', (req: Request, res: Response) => {
      try {
        const bot = this.botManager.getBot(req.params.username)
        if (!bot) {
          return res.status(404).json({ error: 'Bot not found' })
        }

        const commManager = bot.getCommunicationManager()
        if (!commManager) {
          return res.status(400).json({ error: 'Communication manager not available' })
        }

        const { message, target, whisper } = req.body
        commManager.sendMessage(target, message, whisper)
        res.json({ success: true })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // ==================== BOT ACTIONS ====================

    // Eat food
    this.app.post('/api/bots/:username/eat', async (req: Request, res: Response) => {
      try {
        const bot = this.botManager.getBot(req.params.username)
        if (!bot) {
          return res.status(404).json({ error: 'Bot not found' })
        }

        const healthManager = bot.getHealthManager()
        if (!healthManager) {
          return res.status(400).json({ error: 'Health manager not available' })
        }

        const { foodName } = req.body
        const success = await healthManager.eatFood(foodName)
        res.json({ success })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Get bot statistics
    this.app.get('/api/bots/:username/stats', (req: Request, res: Response) => {
      const bot = this.botManager.getBot(req.params.username)
      if (!bot) {
        return res.status(404).json({ error: 'Bot not found' })
      }

      res.json(bot.getStats())
    })

    // ==================== VIEWER MANAGEMENT ====================

    // Get all active viewers
    this.app.get('/api/viewers', (req: Request, res: Response) => {
      const viewers = this.viewerManager.getAllViewers()
      const stats = this.viewerManager.getStats()
      res.json({ viewers, stats })
    })

    // Get viewer stats
    this.app.get('/api/viewers/stats', (req: Request, res: Response) => {
      const stats = this.viewerManager.getStats()
      res.json(stats)
    })

    // Get viewer for a specific bot
    this.app.get('/api/viewers/:username', (req: Request, res: Response) => {
      const viewer = this.viewerManager.getViewer(req.params.username)
      if (!viewer) {
        return res.status(404).json({ error: 'No viewer found for this bot' })
      }
      res.json(viewer)
    })

    // Start viewer for a bot
    this.app.post('/api/viewers/:username/start', async (req: Request, res: Response) => {
      try {
        const bot = this.botManager.getBot(req.params.username)
        if (!bot) {
          return res.status(404).json({ error: 'Bot not found' })
        }

        const { port, firstPerson, viewDistance } = req.body
        const viewer = await this.viewerManager.startViewer(bot, {
          port,
          firstPerson: firstPerson ?? false,
          viewDistance: viewDistance ?? 6,
        })

        res.status(201).json({
          success: true,
          viewer,
          url: `http://localhost:${viewer.port}`,
        })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Stop viewer for a bot
    this.app.post('/api/viewers/:username/stop', async (req: Request, res: Response) => {
      try {
        await this.viewerManager.stopViewer(req.params.username)
        res.json({ success: true })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })

    // Stop all viewers
    this.app.post('/api/viewers/all/stop', async (req: Request, res: Response) => {
      try {
        await this.viewerManager.stopAllViewers()
        res.json({ success: true })
      } catch (err: any) {
        res.status(400).json({ error: err.message })
      }
    })
  }

  close(): void {
    if (this.server) {
      this.server.close()
      console.log('[API] Server closed')
    }
  }
}
