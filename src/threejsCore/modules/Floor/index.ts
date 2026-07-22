export * from './FloorModule'
export * from './config'
export * from './styleSchema'

import { GridHelperModule } from './FloorModule'
import type { FloorConfig } from './config'
import { styleSchema } from './styleSchema'
import type { SceneModuleDefinition } from '../types'

export const moduleDefinition: SceneModuleDefinition<FloorConfig> = {
  type: 'Floor',
  label: '地板',
  styleSchema: styleSchema,
  create: (config = {}) => new GridHelperModule(config)
}
