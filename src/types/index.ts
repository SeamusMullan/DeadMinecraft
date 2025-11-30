import { Bot } from 'mineflayer'

export type BotStatus = 'idle' | 'running' | 'error' | 'disconnected' | 'connecting'

export type BehaviorType = 'farmer' | 'miner' | 'wanderer' | 'builder' | 'fighter' | 'idle'

export interface BotConfig {
  username: string
  host: string
  port: number
  version?: string
  behavior: BehaviorType
  autoReconnect?: boolean
  reconnectDelay?: number
}

export interface BotState {
  id: string
  username: string
  status: BotStatus
  behavior: BehaviorType
  position?: { x: number; y: number; z: number }
  health?: number
  food?: number
  inventory?: InventoryInfo
  errors: string[]
  uptime: number
  connectedAt?: number
}

export interface InventoryInfo {
  slots: number
  items: Array<{ name: string; count: number }>
}

export interface ServerConfig {
  host: string
  port: number
  maxBots: number
  apiPort: number
  wsPort: number
}

export interface BehaviorConfig {
  [key: string]: any
}

export interface FarmerConfig extends BehaviorConfig {
  farmCenter: { x: number; y: number; z: number }
  farmRadius: number
  replantDelay: number
  cycleDelay: number
}

export interface MinerConfig extends BehaviorConfig {
  targetBlocks: string[]
  miningArea?: { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number }
  autoSmelt?: boolean
}

export interface WandererConfig extends BehaviorConfig {
  wanderRadius: number
  wanderInterval: number
  avoidWater?: boolean
  avoidLava?: boolean
}

export abstract class Behavior {
  protected bot: Bot
  protected config: BehaviorConfig
  protected running: boolean = false

  constructor(bot: Bot, config: BehaviorConfig = {}) {
    this.bot = bot
    this.config = config
  }

  abstract start(): Promise<void>
  abstract stop(): Promise<void>
  abstract getStatus(): string
}
