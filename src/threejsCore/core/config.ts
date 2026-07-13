// import type { LoopOptions } from './Loop'
import { type ColorRepresentation, type Scene, type WebGLRendererParameters } from 'three'
import type { CameraConfig } from './camera/config'
import type { ControlsConfig } from './camera/controls/config'
import type { CoreCanvas, IModule } from './types'

export interface ResizeConfig {
  width?: number
  height?: number
  pixelRatio?: number
  aspect?: number
}

export interface EngineContextConfig extends CoreConfig {}

export interface RenderConfig extends Omit<WebGLRendererParameters, 'canvas'> {
  width?: number
  height?: number
  pixelRatio?: number
  maxPixelRatio?: number
  clearColor?: ColorRepresentation
  clearAlpha?: number // 透明通道 0 - 1
  canvas: CoreCanvas
}

export interface CoreConfig<TAppConfig = unknown> {
  canvas: CoreCanvas
  container?: HTMLElement
  scene?: Scene
  camera?: CameraConfig
  renderer?: RenderConfig
  resize?: ResizeConfig
  // loop?: LoopOptions
  modules?: IModule[]
  autoStart?: boolean
  controls?: ControlsConfig
  app?: TAppConfig
}
