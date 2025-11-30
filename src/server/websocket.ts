import { WebSocketServer, WebSocket } from 'ws'
import { BotManager } from '../bots/BotManager'
import { BotState } from '../types'

export class WSServer {
  private wss: WebSocketServer
  private botManager: BotManager
  private clients: Set<WebSocket> = new Set()

  constructor(port: number, botManager: BotManager) {
    this.botManager = botManager
    this.wss = new WebSocketServer({ port })

    this.wss.on('connection', (ws) => {
      console.log('[WebSocket] Client connected')
      this.clients.add(ws)

      // Send initial state
      this.sendToClient(ws, {
        type: 'init',
        data: {
          bots: this.botManager.getBotStates(),
          stats: this.botManager.getStats(),
        },
      })

      ws.on('close', () => {
        console.log('[WebSocket] Client disconnected')
        this.clients.delete(ws)
      })

      ws.on('error', (err) => {
        console.error('[WebSocket] Client error:', err)
        this.clients.delete(ws)
      })
    })

    this.setupBotManagerListeners()

    console.log(`[WebSocket] Server listening on port ${port}`)
  }

  private setupBotManagerListeners(): void {
    this.botManager.on('botCreated', (state: BotState) => {
      this.broadcast({ type: 'botCreated', data: state })
    })

    this.botManager.on('botConnected', (state: BotState) => {
      this.broadcast({ type: 'botConnected', data: state })
    })

    this.botManager.on('botDisconnected', (state: BotState) => {
      this.broadcast({ type: 'botDisconnected', data: state })
    })

    this.botManager.on('botStateUpdate', (state: BotState) => {
      this.broadcast({ type: 'botStateUpdate', data: state })
    })

    this.botManager.on('botError', (data: any) => {
      this.broadcast({ type: 'botError', data })
    })

    this.botManager.on('botRemoved', (data: any) => {
      this.broadcast({ type: 'botRemoved', data })
    })

    this.botManager.on('botChat', (data: any) => {
      this.broadcast({ type: 'botChat', data })
    })
  }

  private broadcast(message: any): void {
    const data = JSON.stringify(message)
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  }

  private sendToClient(client: WebSocket, message: any): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message))
    }
  }

  close(): void {
    this.clients.forEach(client => client.close())
    this.wss.close()
    console.log('[WebSocket] Server closed')
  }
}
