import { Bot } from 'mineflayer'
import { Behavior, BehaviorType, BehaviorConfig } from '../../types'
import { FarmerBehavior } from './farmer'
import { MinerBehavior } from './miner'
import { WandererBehavior } from './wanderer'
import { BuilderBehavior } from './builder'
import { IdleBehavior } from './idle'

export { FarmerBehavior } from './farmer'
export { MinerBehavior } from './miner'
export { WandererBehavior } from './wanderer'
export { BuilderBehavior } from './builder'
export { IdleBehavior } from './idle'

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
    case 'idle':
    default:
      return new IdleBehavior(bot, config)
  }
}
