import { type WebGLRendererParameters } from 'three'
import type { EngineContext } from './Context'
import type { CoreConfig, ResizeConfig } from './config'
import type { CameraConfig } from './camera/config'

export interface TickInfo {
  delta: number
  elapsed: number
}

export interface IModule<TConfig = unknown> {
  id: string
  name?: string
  order?: number
  config?: TConfig
  init?: (context: EngineContext) => void | Promise<void>
  start?: (context: EngineContext) => void | Promise<void>
  updateConfig?: (config: Partial<TConfig>, context: EngineContext) => void | Promise<void>
  update?: (tick: TickInfo, context: EngineContext, config?: Partial<CoreConfig>) => void
  resize?: (size: ResizeInfo, context: EngineContext, config?: Partial<CoreConfig>) => void
  stop?: (context: EngineContext) => void | Promise<void>
  destroy?: (context: EngineContext) => void | Promise<void>
}

export interface ResizeInfo {
  width: number
  height: number
  pixelRatio: number
  aspect: number
}

export type CoreCanvas = NonNullable<WebGLRendererParameters['canvas']>

export interface CoreEventMap {
  [event: string]: unknown
  'loop:tick': TickInfo
  'camera:update': CameraConfig
  // "engine:initialized": { context: EngineContext };
  // "engine:start": { context: EngineContext };
  // "engine:stop": undefined;
  // "engine:destroy": undefined;
  // "engine:error": { error: unknown };
  // "loop:render": TickInfo;
  resize: ResizeInfo
  // "module:added": ModuleEventPayload;
  // "module:initialized": ModuleEventPayload;
  // "module:started": ModuleEventPayload;
  // "module:stopped": ModuleEventPayload;
  // "module:destroyed": ModuleEventPayload;
  // "module:removed": ModuleEventPayload;
  // "module:dirty": ModuleEventPayload;
  // "module:committed": ModuleEventPayload;
  // "module:error": ModuleErrorPayload;
}
