export * from './CubeModule'
export * from './config'

import { CubeModule } from './CubeModule'
import type { SceneModuleDefinition } from '../types'

export const moduleDefinition: SceneModuleDefinition = {
  type: 'cube',
  label: '立方体',
  create: () => new CubeModule()
}
