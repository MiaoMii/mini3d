export * from './config'
export * from './ExtrudeMapModule'
export * from './styleSchema'

import { ExtrudeMapModule } from './ExtrudeMapModule'
import type { ExtrudeMapConfig } from './config'
import { styleSchema } from './styleSchema'
import type { SceneModuleDefinition } from '../types'

export const moduleDefinition: SceneModuleDefinition<ExtrudeMapConfig> = {
  type: 'ExtrudeMap',
  label: '地图',
  styleSchema: styleSchema,
  create: (config = {}) => new ExtrudeMapModule(config)
}
