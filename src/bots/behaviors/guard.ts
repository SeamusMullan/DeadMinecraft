import { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'
import { Behavior, GuardConfig } from '../../types'
import { goals, Movements } from 'mineflayer-pathfinder'

const { GoalNear, GoalBlock } = goals

export class GuardBehavior extends Behavior {
  protected config: GuardConfig
  private loopRunning: boolean = false
  private lastPosition: Vec3 | null = null
  private patrolPoints: Vec3[] = []
  private currentPatrolIndex: number = 0

  constructor(bot: Bot, config: Partial<GuardConfig> = {}) {
    super(bot, config)
    this.config = {
      guardPosition: config.guardPosition || bot.entity.position.clone(),
      guardRadius: config.guardRadius || 10,
      attackHostile: config.attackHostile !== false,
      defendPlayers: config.defendPlayers !== false,
    }

    // Create patrol points in a circle around guard position
    this.createPatrolPoints()
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.loopRunning = true

    console.log(`[${this.bot.username}] Starting guard behavior`)

    const defaultMove = new Movements(this.bot)
    this.bot.pathfinder.setMovements(defaultMove)

    this.guardLoop()
  }

  async stop(): Promise<void> {
    this.running = false
    this.loopRunning = false
    this.bot.pathfinder.setGoal(null)
    console.log(`[${this.bot.username}] Stopping guard behavior`)
  }

  getStatus(): string {
    if (!this.running) return 'stopped'
    return `guarding at (${this.config.guardPosition.x.toFixed(0)}, ${this.config.guardPosition.y.toFixed(0)}, ${this.config.guardPosition.z.toFixed(0)})`
  }

  private createPatrolPoints(): void {
    const center = this.config.guardPosition
    const radius = this.config.guardRadius / 2

    // Create 8 patrol points in a circle
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const x = center.x + Math.cos(angle) * radius
      const z = center.z + Math.sin(angle) * radius
      this.patrolPoints.push(new Vec3(x, center.y, z))
    }
  }

  private async guardLoop(): Promise<void> {
    while (this.loopRunning) {
      try {
        // Check for threats
        const threat = this.findNearestThreat()

        if (threat) {
          await this.engageThreat(threat)
        } else {
          // No threats, patrol the area
          await this.patrol()
        }

        await this.sleep(1000)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Error in guard loop:`, err.message)
        await this.sleep(3000)
      }
    }
  }

  private findNearestThreat(): any {
    if (!this.config.attackHostile) return null

    const hostileMobs = [
      'zombie',
      'skeleton',
      'creeper',
      'spider',
      'enderman',
      'witch',
      'slime',
      'phantom',
      'drowned',
      'husk',
      'stray',
    ]

    let nearestThreat: any = null
    let nearestDistance = this.config.guardRadius

    for (const entity of Object.values(this.bot.entities)) {
      if (!entity.position) continue

      const distance = entity.position.distanceTo(this.config.guardPosition)
      if (distance > this.config.guardRadius) continue

      const entityName = entity.name?.toLowerCase() || ''
      const isHostile = hostileMobs.some(mob => entityName.includes(mob))

      if (isHostile && distance < nearestDistance) {
        nearestThreat = entity
        nearestDistance = distance
      }
    }

    return nearestThreat
  }

  private async engageThreat(threat: any): Promise<void> {
    try {
      console.log(`[${this.bot.username}] Engaging threat: ${threat.name}`)

      // Move towards threat
      const goal = new GoalNear(threat.position.x, threat.position.y, threat.position.z, 3)
      this.bot.pathfinder.setGoal(goal)

      // Wait a bit for pathfinding
      await this.sleep(500)

      // Attack
      if (this.bot.entity.position.distanceTo(threat.position) < 4) {
        await this.bot.attack(threat)
      }
    } catch (err: any) {
      // Threat might have been killed or moved away
    }
  }

  private async patrol(): Promise<void> {
    if (this.patrolPoints.length === 0) return

    const targetPoint = this.patrolPoints[this.currentPatrolIndex]

    try {
      await this.bot.pathfinder.goto(new GoalNear(targetPoint.x, targetPoint.y, targetPoint.z, 2))

      // Move to next patrol point
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length

      await this.sleep(2000)
    } catch (err: any) {
      // Couldn't reach patrol point
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
