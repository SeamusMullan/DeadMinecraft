import { Bot } from 'mineflayer'
import { Item } from 'prismarine-item'
import { EventEmitter } from 'events'
import { createVec3 } from './vec3Helper'

export interface InventoryManagerConfig {
  autoSort: boolean
  sortInterval: number
  keepItems: string[]
  throwAwayItems: string[]
  maxStacksPerItem: number
}

export class InventoryManager extends EventEmitter {
  private bot: Bot
  private config: InventoryManagerConfig
  private running: boolean = false
  private sortInterval: NodeJS.Timeout | null = null

  constructor(bot: Bot, config: Partial<InventoryManagerConfig> = {}) {
    super()
    this.bot = bot
    this.config = {
      autoSort: config.autoSort !== false,
      sortInterval: config.sortInterval || 30000,
      keepItems: config.keepItems || [],
      throwAwayItems: config.throwAwayItems || ['dirt', 'cobblestone', 'gravel'],
      maxStacksPerItem: config.maxStacksPerItem || 3,
    }
  }

  start(): void {
    if (this.running) return
    this.running = true

    if (this.config.autoSort) {
      this.sortInterval = setInterval(() => {
        this.sortInventory()
      }, this.config.sortInterval)
    }

    this.setupEventHandlers()
  }

  stop(): void {
    if (!this.running) return
    this.running = false

    if (this.sortInterval) {
      clearInterval(this.sortInterval)
      this.sortInterval = null
    }
  }

  private setupEventHandlers(): void {
    this.bot.on('playerCollect', (collector, collected) => {
      if (collector.username === this.bot.username) {
        this.emit('itemCollected', collected.displayName)
      }
    })
  }

  async sortInventory(): Promise<void> {
    try {
      // Group items by type
      const items = this.bot.inventory.items()
      const itemGroups = new Map<string, Item[]>()

      for (const item of items) {
        if (!itemGroups.has(item.name)) {
          itemGroups.set(item.name, [])
        }
        itemGroups.get(item.name)!.push(item)
      }

      // Throw away excess items
      for (const [itemName, itemList] of itemGroups.entries()) {
        if (this.config.throwAwayItems.includes(itemName)) {
          await this.throwAwayItem(itemName)
        } else if (itemList.length > this.config.maxStacksPerItem) {
          // Keep only max stacks
          const toThrow = itemList.slice(this.config.maxStacksPerItem)
          for (const item of toThrow) {
            await this.throwAwayItem(itemName, item.count)
          }
        }
      }

      this.emit('inventorySorted')
    } catch (err) {
      this.emit('sortFailed', err)
    }
  }

  async throwAwayItem(itemName: string, count?: number): Promise<boolean> {
    try {
      // Don't throw away items in keep list
      if (this.config.keepItems.includes(itemName)) {
        return false
      }

      const item = this.bot.inventory.items().find(i => i.name === itemName)
      if (!item) return false

      const throwCount = count || item.count
      await this.bot.toss(item.type, null, throwCount)
      this.emit('itemThrown', { item: itemName, count: throwCount })
      return true
    } catch (err) {
      return false
    }
  }

  async depositToChest(chestPosition: { x: number; y: number; z: number }, itemNames?: string[]): Promise<void> {
    try {
      const block = this.bot.blockAt(createVec3(chestPosition.x, chestPosition.y, chestPosition.z))
      if (!block || block.name !== 'chest') {
        throw new Error('No chest found at position')
      }

      const chest = await this.bot.openChest(block)
      const items = this.bot.inventory.items()

      for (const item of items) {
        if (!itemNames || itemNames.includes(item.name)) {
          if (!this.config.keepItems.includes(item.name)) {
            await chest.deposit(item.type, null, item.count)
            this.emit('itemDeposited', { item: item.name, count: item.count })
          }
        }
      }

      chest.close()
    } catch (err: any) {
      this.emit('depositFailed', err.message)
      throw err
    }
  }

  async withdrawFromChest(
    chestPosition: { x: number; y: number; z: number },
    itemName: string,
    count: number
  ): Promise<boolean> {
    try {
      const block = this.bot.blockAt(createVec3(chestPosition.x, chestPosition.y, chestPosition.z))
      if (!block || block.name !== 'chest') {
        return false
      }

      const chest = await this.bot.openChest(block)
      const item = chest.containerItems().find(i => i.name === itemName)

      if (item) {
        await chest.withdraw(item.type, null, Math.min(count, item.count))
        this.emit('itemWithdrawn', { item: itemName, count })
        chest.close()
        return true
      }

      chest.close()
      return false
    } catch (err) {
      return false
    }
  }

  getInventoryInfo(): {
    slots: number
    items: Array<{ name: string; count: number; slot: number }>
    usedSlots: number
    freeSlots: number
  } {
    const items = this.bot.inventory.items().map(item => ({
      name: item.name,
      count: item.count,
      slot: item.slot,
    }))

    return {
      slots: this.bot.inventory.slots.length,
      items,
      usedSlots: items.length,
      freeSlots: this.bot.inventory.emptySlotCount(),
    }
  }

  hasItem(itemName: string, count: number = 1): boolean {
    const items = this.bot.inventory.items().filter(i => i.name === itemName)
    const totalCount = items.reduce((sum, item) => sum + item.count, 0)
    return totalCount >= count
  }

  getItemCount(itemName: string): number {
    const items = this.bot.inventory.items().filter(i => i.name === itemName)
    return items.reduce((sum, item) => sum + item.count, 0)
  }

  async equipBestTool(blockName: string): Promise<boolean> {
    try {
      const block = this.bot.registry.blocksByName[blockName]
      if (!block) return false

      // Get all tools that can harvest this block
      const tools = this.bot.inventory.items().filter(item => {
        return item.name.includes('pickaxe') ||
               item.name.includes('axe') ||
               item.name.includes('shovel') ||
               item.name.includes('sword')
      })

      if (tools.length === 0) return false

      // Sort by material quality: netherite > diamond > iron > stone > wooden > golden
      const materialOrder = ['netherite', 'diamond', 'iron', 'stone', 'wooden', 'golden']
      tools.sort((a, b) => {
        const aIndex = materialOrder.findIndex(m => a.name.includes(m))
        const bIndex = materialOrder.findIndex(m => b.name.includes(m))
        return aIndex - bIndex
      })

      await this.bot.equip(tools[0], 'hand')
      return true
    } catch (err) {
      return false
    }
  }

  async equipBestWeapon(): Promise<boolean> {
    try {
      const weapons = this.bot.inventory.items().filter(item =>
        item.name.includes('sword') || item.name.includes('axe')
      )

      if (weapons.length === 0) return false

      // Sort by material quality
      const materialOrder = ['netherite', 'diamond', 'iron', 'stone', 'wooden', 'golden']
      weapons.sort((a, b) => {
        const aIndex = materialOrder.findIndex(m => a.name.includes(m))
        const bIndex = materialOrder.findIndex(m => b.name.includes(m))
        return aIndex - bIndex
      })

      await this.bot.equip(weapons[0], 'hand')
      return true
    } catch (err) {
      return false
    }
  }

  async equipArmor(): Promise<void> {
    const armorPieces = ['helmet', 'chestplate', 'leggings', 'boots']
    const materialOrder = ['netherite', 'diamond', 'iron', 'chainmail', 'golden', 'leather']

    for (const piece of armorPieces) {
      const availableArmor = this.bot.inventory.items().filter(item => item.name.includes(piece))

      if (availableArmor.length === 0) continue

      // Sort by material quality
      availableArmor.sort((a, b) => {
        const aIndex = materialOrder.findIndex(m => a.name.includes(m))
        const bIndex = materialOrder.findIndex(m => b.name.includes(m))
        return aIndex - bIndex
      })

      try {
        const destination = piece === 'helmet' ? 'head'
          : piece === 'chestplate' ? 'torso'
          : piece === 'leggings' ? 'legs'
          : 'feet'

        await this.bot.equip(availableArmor[0], destination as any)
      } catch (err) {
        // Already equipped or can't equip
      }
    }
  }
}
