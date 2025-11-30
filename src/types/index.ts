import { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'

export type BotStatus = 'idle' | 'running' | 'error' | 'disconnected' | 'connecting'

export type BehaviorType =
  | 'farmer'
  | 'miner'
  | 'wanderer'
  | 'builder'
  | 'fighter'
  | 'idle'
  | 'guard'
  | 'pvp'
  | 'trader'
  | 'crafter'
  | 'fisher'
  | 'xpfarmer'

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface BotConfig {
  username: string
  host: string
  port: number
  version?: string
  behavior: BehaviorType
  autoReconnect?: boolean
  reconnectDelay?: number
  autoEat?: boolean
  autoHeal?: boolean
  groupId?: string
  enableChatCommands?: boolean
}

export interface BotState {
  id: string
  username: string
  status: BotStatus
  behavior: BehaviorType
  position?: { x: number; y: number; z: number }
  health?: number
  food?: number
  oxygen?: number
  experience?: number
  level?: number
  inventory?: InventoryInfo
  equipment?: EquipmentInfo
  errors: string[]
  uptime: number
  connectedAt?: number
  groupId?: string
  currentTask?: TaskInfo
  stats?: BotStats
}

export interface InventoryInfo {
  slots: number
  items: Array<{ name: string; count: number; slot?: number }>
  usedSlots: number
  freeSlots: number
}

export interface EquipmentInfo {
  hand?: string
  head?: string
  torso?: string
  legs?: string
  feet?: string
  offHand?: string
}

export interface BotStats {
  blocksPlaced: number
  blocksBroken: number
  itemsCollected: number
  itemsCrafted: number
  deaths: number
  kills: number
  damageDealt: number
  damageTaken: number
  distanceTraveled: number
  messagesReceived: number
  messagesSent: number
}

export interface TaskInfo {
  id: string
  type: string
  priority: TaskPriority
  status: TaskStatus
  progress?: number
  startedAt?: number
}

export interface BotTask {
  id: string
  type: string
  priority: TaskPriority
  status: TaskStatus
  data: any
  createdAt: number
  startedAt?: number
  completedAt?: number
  failedReason?: string
  retries: number
  maxRetries: number
}

export interface BotGroup {
  id: string
  name: string
  bots: string[]
  leader?: string
  objective?: string
  formation?: FormationType
  shareInventory?: boolean
  shareResources?: boolean
}

export type FormationType = 'spread' | 'line' | 'circle' | 'grid' | 'follow'

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

export interface GuardConfig extends BehaviorConfig {
  guardPosition: Vec3
  guardRadius: number
  attackHostile?: boolean
  defendPlayers?: boolean
}

export interface PvPConfig extends BehaviorConfig {
  attackRange: number
  targets?: string[]
  autoEquipWeapon?: boolean
  useShield?: boolean
}

export interface TraderConfig extends BehaviorConfig {
  tradingArea?: Vec3
  searchRadius?: number
  targetVillagers?: boolean
}

export interface CrafterConfig extends BehaviorConfig {
  recipes: Array<{ item: string; count: number }>
  craftingTable?: Vec3
  autoGatherMaterials?: boolean
}

export interface FisherConfig extends BehaviorConfig {
  fishingSpot?: Vec3
  autoCatchFish?: boolean
  keepFishing?: boolean
}

export interface XPFarmerConfig extends BehaviorConfig {
  mobTypes?: string[]
  farmArea?: { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number }
  autoPickupXP?: boolean
}

export interface ChatCommand {
  command: string
  aliases?: string[]
  permission?: 'all' | 'admin' | 'owner'
  handler: (bot: Bot, username: string, args: string[]) => void | Promise<void>
}

export interface BotMessage {
  from: string
  to: string
  type: 'chat' | 'whisper' | 'command' | 'data'
  content: any
  timestamp: number
}

export interface AnalyticsData {
  timestamp: number
  totalBots: number
  connectedBots: number
  runningBots: number
  totalBlocksMined: number
  totalItemsCollected: number
  totalDeaths: number
  totalKills: number
  averageHealth: number
  averageFood: number
  groupCount: number
  errorRate: number
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
