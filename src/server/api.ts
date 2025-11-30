import express, { Request, Response } from 'express'
import cors from 'cors'
import { BotManager } from '../bots/BotManager'
import { BotConfig, BehaviorType } from '../types'

export class APIServer {
  private app: express.Application
  private botManager: BotManager
  private server: any

  constructor(port: number, botManager: BotManager) {
    this.app = express()
    this.botManager = botManager

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
  }

  close(): void {
    if (this.server) {
      this.server.close()
      console.log('[API] Server closed')
    }
  }
}
