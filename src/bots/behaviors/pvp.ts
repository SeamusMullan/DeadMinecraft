import { Bot } from 'mineflayer'
import { Behavior, PvPConfig } from '../../types'
import { goals, Movements } from 'mineflayer-pathfinder'

const { GoalNear } = goals

export class PvPBehavior extends Behavior {
  protected config: PvPConfig
  private loopRunning: boolean = false
  private currentTarget: any = null
  private pvpPlugin: any = null

  constructor(bot: Bot, config: Partial<PvPConfig> = {}) {
    super(bot, config)
    this.config = {
      attackRange: config.attackRange || 4,
      targets: config.targets || [],
      autoEquipWeapon: config.autoEquipWeapon !== false,
      useShield: config.useShield !== false,
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.loopRunning = true

    console.log(`[${this.bot.username}] Starting PvP behavior`)

    // Load PvP plugin
    try {
      const pvp = require('mineflayer-pvp').plugin
      this.bot.loadPlugin(pvp)
      this.pvpPlugin = (this.bot as any).pvp
    } catch (err) {
      console.error(`[${this.bot.username}] Failed to load PvP plugin:`, err)
    }

    const defaultMove = new Movements(this.bot)
    this.bot.pathfinder.setMovements(defaultMove)

    // Equip best weapon
    if (this.config.autoEquipWeapon) {
      await this.equipBestWeapon()
    }

    this.pvpLoop()
  }

  async stop(): Promise<void> {
    this.running = false
    this.loopRunning = false
    if (this.pvpPlugin) {
      this.pvpPlugin.stop()
    }
    this.bot.pathfinder.setGoal(null)
    console.log(`[${this.bot.username}] Stopping PvP behavior`)
  }

  getStatus(): string {
    if (!this.running) return 'stopped'
    if (this.currentTarget) {
      return `fighting ${this.currentTarget.username || this.currentTarget.name}`
    }
    return 'searching for targets'
  }

  private async pvpLoop(): Promise<void> {
    while (this.loopRunning) {
      try {
        const target = this.findTarget()

        if (target) {
          this.currentTarget = target
          await this.attack(target)
        } else {
          this.currentTarget = null
          await this.searchForTargets()
        }

        await this.sleep(500)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Error in PvP loop:`, err.message)
        await this.sleep(2000)
      }
    }
  }

  private findTarget(): any {
    let nearestTarget: any = null
    let nearestDistance = 32

    // Look for players
    for (const username of Object.keys(this.bot.players)) {
      if (username === this.bot.username) continue

      // If targets list is specified, only attack those
      if (this.config.targets && this.config.targets.length > 0) {
        if (!this.config.targets.includes(username)) continue
      }

      const player = this.bot.players[username]
      if (!player || !player.entity) continue

      const distance = this.bot.entity.position.distanceTo(player.entity.position)
      if (distance < nearestDistance) {
        nearestTarget = player.entity
        nearestDistance = distance
      }
    }

    // Also look for hostile mobs if no player targets
    if (!nearestTarget) {
      const hostileMobs = [
        'zombie',
        'skeleton',
        'creeper',
        'spider',
        'enderman',
        'witch',
        'slime',
        'phantom',
      ]

      for (const entity of Object.values(this.bot.entities)) {
        if (!entity.position) continue

        const entityName = entity.name?.toLowerCase() || ''
        const isHostile = hostileMobs.some(mob => entityName.includes(mob))

        if (!isHostile) continue

        const distance = this.bot.entity.position.distanceTo(entity.position)
        if (distance < nearestDistance) {
          nearestTarget = entity
          nearestDistance = distance
        }
      }
    }

    return nearestTarget
  }

  private async attack(target: any): Promise<void> {
    if (!target || !target.position) return

    try {
      if (this.pvpPlugin) {
        // Use PvP plugin if available
        this.pvpPlugin.attack(target)
      } else {
        // Manual combat
        const distance = this.bot.entity.position.distanceTo(target.position)

        if (distance > this.config.attackRange) {
          // Move closer
          const goal = new GoalNear(target.position.x, target.position.y, target.position.z, this.config.attackRange - 1)
          this.bot.pathfinder.setGoal(goal)
        } else {
          // In range, attack
          await this.bot.lookAt(target.position.offset(0, target.height || 1.6, 0))
          await this.bot.attack(target)
        }
      }
    } catch (err: any) {
      // Target might be dead or out of range
    }
  }

  private async searchForTargets(): Promise<void> {
    // Wander around to find targets
    const x = this.bot.entity.position.x + (Math.random() - 0.5) * 30
    const y = this.bot.entity.position.y
    const z = this.bot.entity.position.z + (Math.random() - 0.5) * 30

    try {
      await this.bot.pathfinder.goto(new GoalNear(x, y, z, 2))
    } catch (err) {
      // Couldn't reach search location
    }
  }

  private async equipBestWeapon(): Promise<void> {
    try {
      const weapons = this.bot.inventory.items().filter(item =>
        item.name.includes('sword') || item.name.includes('axe')
      )

      if (weapons.length === 0) return

      // Sort by material quality
      const materialOrder = ['netherite', 'diamond', 'iron', 'stone', 'wooden', 'golden']
      weapons.sort((a, b) => {
        const aIndex = materialOrder.findIndex(m => a.name.includes(m))
        const bIndex = materialOrder.findIndex(m => b.name.includes(m))
        return aIndex - bIndex
      })

      await this.bot.equip(weapons[0], 'hand')
    } catch (err) {
      // Couldn't equip weapon
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
