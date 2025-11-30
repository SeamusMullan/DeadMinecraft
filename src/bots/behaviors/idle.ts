import { Bot } from 'mineflayer'
import { Behavior } from '../../types'

export class IdleBehavior extends Behavior {
  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    console.log(`[${this.bot.username}] Starting idle behavior (doing nothing)`)
  }

  async stop(): Promise<void> {
    this.running = false
    console.log(`[${this.bot.username}] Stopping idle behavior`)
  }

  getStatus(): string {
    return 'idle'
  }
}
