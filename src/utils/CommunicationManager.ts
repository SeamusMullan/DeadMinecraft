import { Bot } from 'mineflayer'
import { EventEmitter } from 'events'
import { BotMessage, ChatCommand } from '../types'

export class CommunicationManager extends EventEmitter {
  private bot: Bot
  private commands: Map<string, ChatCommand> = new Map()
  private messageQueue: BotMessage[] = []
  private allowedUsers: Set<string> = new Set()
  private adminUsers: Set<string> = new Set()
  private owner: string
  private running: boolean = false

  constructor(bot: Bot, owner: string) {
    super()
    this.bot = bot
    this.owner = owner
    this.adminUsers.add(owner)
    this.setupDefaultCommands()
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.setupEventHandlers()
  }

  stop(): void {
    this.running = false
  }

  private setupEventHandlers(): void {
    this.bot.on('chat', (username, message) => {
      if (username === this.bot.username) return

      this.emit('messageReceived', { username, message })

      // Check if it's a command
      if (message.startsWith('!')) {
        this.handleCommand(username, message)
      }
    })

    this.bot.on('whisper', (username, message) => {
      if (username === this.bot.username) return

      this.emit('whisperReceived', { username, message })

      // Check if it's a command
      if (message.startsWith('!')) {
        this.handleCommand(username, message, true)
      }
    })
  }

  private setupDefaultCommands(): void {
    // Status command
    this.registerCommand({
      command: 'status',
      aliases: ['s', 'info'],
      permission: 'all',
      handler: async (bot, username) => {
        const health = bot.health
        const food = bot.food
        const pos = bot.entity.position
        this.sendMessage(
          username,
          `Status: HP=${health} Food=${food} Pos=(${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`,
          true
        )
      },
    })

    // Come command
    this.registerCommand({
      command: 'come',
      aliases: ['follow'],
      permission: 'admin',
      handler: async (bot, username) => {
        const player = bot.players[username]
        if (player && player.entity) {
          const pathfinder = bot.pathfinder
          const { GoalNear } = require('mineflayer-pathfinder').goals
          const goal = new GoalNear(player.entity.position.x, player.entity.position.y, player.entity.position.z, 1)
          pathfinder.setGoal(goal)
          this.sendMessage(username, 'Coming!', true)
        }
      },
    })

    // Stop command
    this.registerCommand({
      command: 'stop',
      aliases: ['halt', 'wait'],
      permission: 'admin',
      handler: async (bot, username) => {
        bot.pathfinder.setGoal(null)
        this.sendMessage(username, 'Stopped', true)
      },
    })

    // Inventory command
    this.registerCommand({
      command: 'inv',
      aliases: ['inventory', 'items'],
      permission: 'all',
      handler: async (bot, username) => {
        const items = bot.inventory.items()
        if (items.length === 0) {
          this.sendMessage(username, 'Inventory is empty', true)
        } else {
          const itemList = items
            .map(item => `${item.name}x${item.count}`)
            .slice(0, 5)
            .join(', ')
          this.sendMessage(username, `Items: ${itemList}...`, true)
        }
      },
    })

    // Toss command
    this.registerCommand({
      command: 'toss',
      aliases: ['throw', 'drop'],
      permission: 'admin',
      handler: async (bot, username, args) => {
        if (args.length === 0) {
          this.sendMessage(username, 'Usage: !toss <item> [amount]', true)
          return
        }

        const itemName = args[0]
        const amount = args[1] ? parseInt(args[1]) : 1

        const item = bot.inventory.items().find(i => i.name.includes(itemName))
        if (item) {
          await bot.toss(item.type, null, Math.min(amount, item.count))
          this.sendMessage(username, `Tossed ${amount}x ${item.name}`, true)
        } else {
          this.sendMessage(username, `Don't have ${itemName}`, true)
        }
      },
    })

    // Help command
    this.registerCommand({
      command: 'help',
      aliases: ['h', 'commands'],
      permission: 'all',
      handler: async (bot, username) => {
        const commands = Array.from(this.commands.keys()).join(', ')
        this.sendMessage(username, `Commands: ${commands}`, true)
      },
    })
  }

  private async handleCommand(username: string, message: string, isWhisper: boolean = false): Promise<void> {
    const parts = message.slice(1).split(' ')
    const commandName = parts[0].toLowerCase()
    const args = parts.slice(1)

    // Find command
    let command: ChatCommand | undefined
    for (const [name, cmd] of this.commands.entries()) {
      if (name === commandName || cmd.aliases?.includes(commandName)) {
        command = cmd
        break
      }
    }

    if (!command) {
      this.sendMessage(username, `Unknown command: ${commandName}`, isWhisper)
      return
    }

    // Check permissions
    if (command.permission === 'owner' && username !== this.owner) {
      this.sendMessage(username, 'Only the owner can use this command', isWhisper)
      return
    }

    if (command.permission === 'admin' && !this.adminUsers.has(username)) {
      this.sendMessage(username, 'Only admins can use this command', isWhisper)
      return
    }

    // Execute command
    try {
      await command.handler(this.bot, username, args)
      this.emit('commandExecuted', { command: commandName, username, args })
    } catch (err: any) {
      this.sendMessage(username, `Command error: ${err.message}`, isWhisper)
      this.emit('commandError', { command: commandName, username, error: err.message })
    }
  }

  registerCommand(command: ChatCommand): void {
    this.commands.set(command.command, command)
  }

  unregisterCommand(commandName: string): boolean {
    return this.commands.delete(commandName)
  }

  sendMessage(target: string, message: string, whisper: boolean = false): void {
    try {
      if (whisper) {
        this.bot.whisper(target, message)
      } else {
        this.bot.chat(message)
      }
      this.emit('messageSent', { target, message, whisper })
    } catch (err) {
      this.emit('sendError', err)
    }
  }

  sendBotMessage(targetBot: string, message: BotMessage): void {
    this.messageQueue.push(message)
    this.emit('botMessage', message)
  }

  receiveBotMessage(message: BotMessage): void {
    if (message.to === this.bot.username) {
      this.emit('botMessageReceived', message)
    }
  }

  getBotMessages(count: number = 10): BotMessage[] {
    return this.messageQueue.slice(-count)
  }

  addAdmin(username: string): void {
    this.adminUsers.add(username)
  }

  removeAdmin(username: string): void {
    if (username !== this.owner) {
      this.adminUsers.delete(username)
    }
  }

  addAllowedUser(username: string): void {
    this.allowedUsers.add(username)
  }

  removeAllowedUser(username: string): void {
    this.allowedUsers.delete(username)
  }
}
