export * from './RotateBorderModule'
export * from './config'
export * from './styleSchema'

import { RotateBorderModule } from './RotateBorderModule'
import type { RotateBorderConfig } from './config'
import { styleSchema } from './styleSchema'
import type { SceneModuleDefinition } from '../types'

export const moduleDefinition: SceneModuleDefinition<RotateBorderConfig> = {
  type: 'RotateBorder',
  label: '旋转圆',
  styleSchema: styleSchema,
  create: (config = {}) => new RotateBorderModule(config)
}
