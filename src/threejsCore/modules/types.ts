import type { IModule } from '../core'

export interface ModuleStyleSchema {
  type: 'object'
  properties: Record<string, unknown>
}

export interface SceneModuleDefinition<TConfig extends object = object> {
  type: string
  label: string
  styleSchema: ModuleStyleSchema
  create: (config?: TConfig) => IModule<TConfig>
}
