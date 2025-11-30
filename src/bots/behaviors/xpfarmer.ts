import { Bot } from 'mineflayer'
import { Behavior, XPFarmerConfig } from '../../types'
import { goals, Movements } from 'mineflayer-pathfinder'

const { GoalNear } = goals

export class XPFarmerBehavior extends Behavior {
  protected config: XPFarmerConfig
  private loopRunning: boolean = false

  constructor(bot: Bot, config: Partial<XPFarmerConfig> = {}) {
    super(bot, config)
    this.config = {
      mobTypes: config.mobTypes || ['zombie', 'skeleton', 'spider', 'creeper'],
      farmArea: config.farmArea,
      autoPickupXP: config.autoPickupXP !== false,
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.loopRunning = true

    console.log(`[${this.bot.username}] Starting XP farmer behavior`)

    const defaultMove = new Movements(this.bot)
    this.bot.pathfinder.setMovements(defaultMove)

    this.farmingLoop()
  }

  async stop(): Promise<void> {
    this.running = false
    this.loopRunning = false
    this.bot.pathfinder.setGoal(null)
    console.log(`[${this.bot.username}] Stopping XP farmer behavior`)
  }

  getStatus(): string {
    if (!this.running) return 'stopped'
    const xp = this.bot.experience
    return `farming XP (level ${xp.level}, ${xp.points} points)`
  }

  private async farmingLoop(): Promise<void> {
    while (this.loopRunning) {
      try {
        const mob = this.findNearestMob()

        if (mob) {
          await this.killMob(mob)
        } else {
          await this.searchForMobs()
        }

        // Collect XP orbs
        if (this.config.autoPickupXP) {
          await this.collectXPOrbs()
        }

        await this.sleep(1000)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Error in XP farming loop:`, err.message)
        await this.sleep(3000)
      }
    }
  }

  private findNearestMob(): any {
    let nearestMob: any = null
    let nearestDistance = 32

    for (const entity of Object.values(this.bot.entities)) {
      if (!entity.position) continue

      const entityName = entity.name?.toLowerCase() || ''
      const isTargetMob = this.config.mobTypes?.some(mob => entityName.includes(mob))

      if (!isTargetMob) continue

      // Check if in farm area
      if (this.config.farmArea) {
        const { x1, y1, z1, x2, y2, z2 } = this.config.farmArea
        const pos = entity.position

        if (pos.x < x1 || pos.x > x2 || pos.y < y1 || pos.y > y2 || pos.z < z1 || pos.z > z2) {
          continue
        }
      }

      const distance = this.bot.entity.position.distanceTo(entity.position)
      if (distance < nearestDistance) {
        nearestMob = entity
        nearestDistance = distance
      }
    }

    return nearestMob
  }

  private async killMob(mob: any): Promise<void> {
    try {
      console.log(`[${this.bot.username}] Attacking ${mob.name}`)

      // Move towards mob
      const distance = this.bot.entity.position.distanceTo(mob.position)

      if (distance > 3) {
        await this.bot.pathfinder.goto(new GoalNear(mob.position.x, mob.position.y, mob.position.z, 2))
      }

      // Attack
      await this.bot.attack(mob)
      await this.sleep(500)
    } catch (err: any) {
      // Mob might be dead or out of range
    }
  }

  private async searchForMobs(): Promise<void> {
    // Wander around farm area to find mobs
    let targetX, targetY, targetZ

    if (this.config.farmArea) {
      const { x1, y1, z1, x2, y2, z2 } = this.config.farmArea
      targetX = x1 + Math.random() * (x2 - x1)
      targetY = y1 + Math.random() * (y2 - y1)
      targetZ = z1 + Math.random() * (z2 - z1)
    } else {
      targetX = this.bot.entity.position.x + (Math.random() - 0.5) * 30
      targetY = this.bot.entity.position.y
      targetZ = this.bot.entity.position.z + (Math.random() - 0.5) * 30
    }

    try {
      await this.bot.pathfinder.goto(new GoalNear(targetX, targetY, targetZ, 2))
    } catch (err) {
      // Couldn't reach search location
    }
  }

  private async collectXPOrbs(): Promise<void> {
    const xpOrbs = Object.values(this.bot.entities).filter(entity => {
      return entity.name === 'experience_orb' &&
             entity.position &&
             entity.position.distanceTo(this.bot.entity.position) < 16
    })

    for (const orb of xpOrbs.slice(0, 3)) {
      if (!this.loopRunning || !orb.position) break

      try {
        await this.bot.pathfinder.goto(new GoalNear(orb.position.x, orb.position.y, orb.position.z, 1))
      } catch (err) {
        // Couldn't reach orb
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
