import { type WebGLRendererParameters } from 'three'
import type { EngineContext } from './Context'
import type { CoreConfig } from './config'
import type { CameraConfig } from './camera/config'

export interface TickInfo {
  delta: number
  elapsed: number
}

export type ModulesType =
  | 'BaseGround' /*底层基底*/
  | 'Light' /*全局光照*/
  | 'EffectAnim' /*告警/动画特效*/
  | 'HelperTool' /*调试辅助工具*/
  | 'BusinessView' /*业务*/

export interface IModule<TConfig = unknown> {
  id: string
  dataSourceId?: string
  name?: string
  order?: number
  config?: TConfig
  type?: ModulesType
  init?: (context: EngineContext) => void | Promise<void>
  start?: (context: EngineContext) => void | Promise<void>
  updateConfig?: (config: Partial<TConfig>, context: EngineContext) => void | Promise<void>
  onDataChange?: (data: unknown, context: EngineContext) => void | Promise<void>
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
  'loop:tick': TickInfo
  'camera:update': CameraConfig
  resize: ResizeInfo
}

/** Public events are extended by each integration through EventBus.withTypes(). */
export interface EngineEventMap {
  [event: string]: unknown
}
