import { EventEmitter } from 'events'
import { BotGroup, FormationType } from '../types'
import { Vec3 } from 'vec3'

export class GroupManager extends EventEmitter {
  private groups: Map<string, BotGroup> = new Map()

  createGroup(name: string, bots: string[], leader?: string, objective?: string): string {
    const groupId = this.generateGroupId()

    const group: BotGroup = {
      id: groupId,
      name,
      bots,
      leader: leader || bots[0],
      objective,
      formation: 'spread',
      shareInventory: false,
      shareResources: false,
    }

    this.groups.set(groupId, group)
    this.emit('groupCreated', group)

    console.log(`[GroupManager] Created group: ${name} with ${bots.length} bots`)
    return groupId
  }

  getGroup(groupId: string): BotGroup | undefined {
    return this.groups.get(groupId)
  }

  getAllGroups(): BotGroup[] {
    return Array.from(this.groups.values())
  }

  addBotToGroup(groupId: string, botUsername: string): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    if (!group.bots.includes(botUsername)) {
      group.bots.push(botUsername)
      this.emit('botAddedToGroup', { groupId, botUsername })
      return true
    }

    return false
  }

  removeBotFromGroup(groupId: string, botUsername: string): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    const index = group.bots.indexOf(botUsername)
    if (index !== -1) {
      group.bots.splice(index, 1)

      // If leader was removed, assign new leader
      if (group.leader === botUsername && group.bots.length > 0) {
        group.leader = group.bots[0]
      }

      this.emit('botRemovedFromGroup', { groupId, botUsername })
      return true
    }

    return false
  }

  removeGroup(groupId: string): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    this.groups.delete(groupId)
    this.emit('groupRemoved', { groupId, name: group.name })

    console.log(`[GroupManager] Removed group: ${group.name}`)
    return true
  }

  setGroupLeader(groupId: string, leaderUsername: string): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    if (group.bots.includes(leaderUsername)) {
      group.leader = leaderUsername
      this.emit('groupLeaderChanged', { groupId, leader: leaderUsername })
      return true
    }

    return false
  }

  setGroupObjective(groupId: string, objective: string): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    group.objective = objective
    this.emit('groupObjectiveChanged', { groupId, objective })
    return true
  }

  setGroupFormation(groupId: string, formation: FormationType): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    group.formation = formation
    this.emit('groupFormationChanged', { groupId, formation })
    return true
  }

  setGroupResourceSharing(groupId: string, shareInventory: boolean, shareResources: boolean): boolean {
    const group = this.groups.get(groupId)
    if (!group) return false

    group.shareInventory = shareInventory
    group.shareResources = shareResources
    this.emit('groupSharingChanged', { groupId, shareInventory, shareResources })
    return true
  }

  getBotsInGroup(groupId: string): string[] {
    const group = this.groups.get(groupId)
    return group ? [...group.bots] : []
  }

  getGroupForBot(botUsername: string): BotGroup | undefined {
    for (const group of this.groups.values()) {
      if (group.bots.includes(botUsername)) {
        return group
      }
    }
    return undefined
  }

  calculateFormationPositions(groupId: string, centerPosition: Vec3, spacing: number = 3): Map<string, Vec3> {
    const group = this.groups.get(groupId)
    if (!group) return new Map()

    const positions = new Map<string, Vec3>()
    const botCount = group.bots.length

    switch (group.formation) {
      case 'spread':
        // Random spread around center
        group.bots.forEach((bot, index) => {
          const angle = (Math.PI * 2 * index) / botCount
          const distance = spacing * (1 + Math.floor(index / 8))
          const x = centerPosition.x + Math.cos(angle) * distance
          const z = centerPosition.z + Math.sin(angle) * distance
          positions.set(bot, new Vec3(x, centerPosition.y, z))
        })
        break

      case 'line':
        // Line formation
        group.bots.forEach((bot, index) => {
          const offset = (index - (botCount - 1) / 2) * spacing
          positions.set(bot, new Vec3(centerPosition.x + offset, centerPosition.y, centerPosition.z))
        })
        break

      case 'circle':
        // Circle formation
        const radius = (botCount * spacing) / (2 * Math.PI)
        group.bots.forEach((bot, index) => {
          const angle = (Math.PI * 2 * index) / botCount
          const x = centerPosition.x + Math.cos(angle) * radius
          const z = centerPosition.z + Math.sin(angle) * radius
          positions.set(bot, new Vec3(x, centerPosition.y, z))
        })
        break

      case 'grid':
        // Grid formation
        const cols = Math.ceil(Math.sqrt(botCount))
        group.bots.forEach((bot, index) => {
          const row = Math.floor(index / cols)
          const col = index % cols
          const x = centerPosition.x + (col - (cols - 1) / 2) * spacing
          const z = centerPosition.z + (row - (Math.ceil(botCount / cols) - 1) / 2) * spacing
          positions.set(bot, new Vec3(x, centerPosition.y, z))
        })
        break

      case 'follow':
        // All bots follow leader closely
        positions.set(group.bots[0], centerPosition)
        group.bots.slice(1).forEach((bot, index) => {
          const angle = (Math.PI * 2 * index) / (botCount - 1)
          const x = centerPosition.x + Math.cos(angle) * spacing
          const z = centerPosition.z + Math.sin(angle) * spacing
          positions.set(bot, new Vec3(x, centerPosition.y, z))
        })
        break
    }

    return positions
  }

  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getGroupStats(groupId: string): {
    totalBots: number
    formation: FormationType
    leader: string | undefined
    objective: string | undefined
  } | null {
    const group = this.groups.get(groupId)
    if (!group) return null

    return {
      totalBots: group.bots.length,
      formation: group.formation || 'spread',
      leader: group.leader,
      objective: group.objective,
    }
  }
}
