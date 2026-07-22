export * from './AxesHelperModule'
export * from './config'
export * from './styleSchema'

import { AxesHelperModule } from './AxesHelperModule'
import type { AxesHelperConfig } from './config'
import { styleSchema } from './styleSchema'
import type { SceneModuleDefinition } from '../types'

export const moduleDefinition: SceneModuleDefinition<AxesHelperConfig> = {
  type: 'AxesHelper',
  label: '坐标轴',
  styleSchema: styleSchema,
  create: (config = {}) => new AxesHelperModule(config)
}
