export * from './CubeModule'
export * from './config'
export * from './styleSchema'

import { CubeModule } from './CubeModule'
import type { CubeModuleConfig } from './config'
import { styleSchema } from './styleSchema'
import type { SceneModuleDefinition } from '../types'

export const moduleDefinition: SceneModuleDefinition<CubeModuleConfig> = {
  type: 'cube',
  label: '立方体',
  styleSchema: styleSchema,
  create: (config = {}) => new CubeModule(config)
}
