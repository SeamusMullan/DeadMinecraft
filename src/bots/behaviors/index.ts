import { Bot } from 'mineflayer'
import { Behavior, BehaviorType, BehaviorConfig } from '../../types'
import { FarmerBehavior } from './farmer'
import { MinerBehavior } from './miner'
import { WandererBehavior } from './wanderer'
import { BuilderBehavior } from './builder'
import { IdleBehavior } from './idle'
import { GuardBehavior } from './guard'
import { PvPBehavior } from './pvp'
import { TraderBehavior } from './trader'
import { CrafterBehavior } from './crafter'
import { FisherBehavior } from './fisher'
import { XPFarmerBehavior } from './xpfarmer'

export { FarmerBehavior } from './farmer'
export { MinerBehavior } from './miner'
export { WandererBehavior } from './wanderer'
export { BuilderBehavior } from './builder'
export { IdleBehavior } from './idle'
export { GuardBehavior } from './guard'
export { PvPBehavior } from './pvp'
export { TraderBehavior } from './trader'
export { CrafterBehavior } from './crafter'
export { FisherBehavior } from './fisher'
export { XPFarmerBehavior } from './xpfarmer'

export function createBehavior(bot: Bot, type: BehaviorType, config?: BehaviorConfig): Behavior {
  switch (type) {
    case 'farmer':
      return new FarmerBehavior(bot, config)
    case 'miner':
      return new MinerBehavior(bot, config)
    case 'wanderer':
      return new WandererBehavior(bot, config)
    case 'builder':
      return new BuilderBehavior(bot, config)
    case 'guard':
      return new GuardBehavior(bot, config)
    case 'pvp':
      return new PvPBehavior(bot, config)
    case 'trader':
      return new TraderBehavior(bot, config)
    case 'crafter':
      return new CrafterBehavior(bot, config)
    case 'fisher':
      return new FisherBehavior(bot, config)
    case 'xpfarmer':
      return new XPFarmerBehavior(bot, config)
    case 'idle':
    default:
      return new IdleBehavior(bot, config)
  }
}
