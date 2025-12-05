import { BotManager } from '../bots/BotManager'
import { APIServer } from './api'
import { WSServer } from './websocket'
import { ViewerManager } from '../utils/ViewerManager'
import { config } from '../config/default'

export class Server {
  private botManager: BotManager
  private apiServer: APIServer
  private wsServer: WSServer
  private viewerManager: ViewerManager

  constructor() {
    console.log('=== DeadMinecraft Bot Server ===')
    console.log(`Max Bots: ${config.server.maxBots}`)
    console.log(`API Port: ${config.server.apiPort}`)
    console.log(`WebSocket Port: ${config.server.wsPort}`)
    console.log(`Minecraft Server: ${config.server.host}:${config.server.port}`)
    console.log(`Viewer Port Range: 3000-3100`)
    console.log()

    this.botManager = new BotManager(config.server.maxBots)
    this.viewerManager = new ViewerManager(3100, 3200) // Viewer ports from 3100-3200
    this.apiServer = new APIServer(config.server.apiPort, this.botManager, this.viewerManager)
    this.wsServer = new WSServer(config.server.wsPort, this.botManager)

    this.setupShutdownHandlers()
  }

  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      console.log('\n[Server] Shutting down...')

      await this.viewerManager.stopAllViewers()
      await this.botManager.disconnectAllBots()
      this.apiServer.close()
      this.wsServer.close()

      console.log('[Server] Shutdown complete')
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }

  getBotManager(): BotManager {
    return this.botManager
  }

  getViewerManager(): ViewerManager {
    return this.viewerManager
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new Server()
  console.log('[Server] Ready! Open the dashboard to control your bots.')
  console.log(`[Server] API: http://localhost:${config.server.apiPort}`)
  console.log(`[Server] WebSocket: ws://localhost:${config.server.wsPort}`)
}
