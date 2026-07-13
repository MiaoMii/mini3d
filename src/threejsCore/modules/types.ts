import type { IModule } from '../core'

export interface SceneModuleDefinition {
  type: string
  label: string
  create: () => IModule
}
