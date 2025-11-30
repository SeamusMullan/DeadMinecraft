import { Bot } from 'mineflayer'
import { Behavior, CrafterConfig } from '../../types'
import { goals, Movements } from 'mineflayer-pathfinder'
import { createVec3 } from '../../utils/vec3Helper'

const { GoalNear } = goals

export class CrafterBehavior extends Behavior {
  protected config: CrafterConfig
  private loopRunning: boolean = false

  constructor(bot: Bot, config: Partial<CrafterConfig> = {}) {
    super(bot, config)
    this.config = {
      recipes: config.recipes || [],
      craftingTable: config.craftingTable,
      autoGatherMaterials: config.autoGatherMaterials !== false,
    }
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true
    this.loopRunning = true

    console.log(`[${this.bot.username}] Starting crafter behavior`)

    const defaultMove = new Movements(this.bot)
    this.bot.pathfinder.setMovements(defaultMove)

    this.craftingLoop()
  }

  async stop(): Promise<void> {
    this.running = false
    this.loopRunning = false
    this.bot.pathfinder.setGoal(null)
    console.log(`[${this.bot.username}] Stopping crafter behavior`)
  }

  getStatus(): string {
    if (!this.running) return 'stopped'
    return 'crafting'
  }

  private async craftingLoop(): Promise<void> {
    while (this.loopRunning) {
      try {
        for (const recipe of this.config.recipes) {
          await this.craftItem(recipe.item, recipe.count)
          await this.sleep(1000)
        }

        await this.sleep(5000)
      } catch (err: any) {
        console.error(`[${this.bot.username}] Error in crafting loop:`, err.message)
        await this.sleep(3000)
      }
    }
  }

  private async craftItem(itemName: string, count: number): Promise<void> {
    try {
      const item = this.bot.registry.itemsByName[itemName]
      if (!item) {
        console.log(`[${this.bot.username}] Unknown item: ${itemName}`)
        return
      }

      const recipe = this.bot.recipesFor(item.id, null, 1, null)[0]
      if (!recipe) {
        console.log(`[${this.bot.username}] No recipe found for ${itemName}`)
        return
      }

      // Check if we need a crafting table
      if (recipe.requiresTable && this.config.craftingTable) {
        const block = this.bot.blockAt(createVec3(
          this.config.craftingTable.x,
          this.config.craftingTable.y,
          this.config.craftingTable.z
        ))

        if (!block || block.name !== 'crafting_table') {
          console.log(`[${this.bot.username}] No crafting table found`)
          return
        }

        // Move to crafting table
        await this.bot.pathfinder.goto(
          new GoalNear(this.config.craftingTable.x, this.config.craftingTable.y, this.config.craftingTable.z, 3)
        )

        await this.bot.craft(recipe, count, block)
      } else {
        await this.bot.craft(recipe, count)
      }

      console.log(`[${this.bot.username}] Crafted ${count}x ${itemName}`)
    } catch (err: any) {
      console.log(`[${this.bot.username}] Failed to craft ${itemName}:`, err.message)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
