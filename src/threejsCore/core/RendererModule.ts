import { WebGLRenderer, type Camera, type Scene } from 'three'
import type {
  RenderConfig,
  CoreCanvas,
  ResizeInfo,
  IModule,
  EngineContext,
  TickInfo
} from './index'

type SizedCanvas = {
  width?: number
  height?: number
}

export class RendererMoudle implements IModule<RenderConfig> {
  readonly id = 'render'
  readonly name: string = 'render'
  readonly instance: WebGLRenderer
  canvas
  /**
   * 创建渲染器模块实例。
   */
  constructor(config: RenderConfig) {
    const {
      canvas,
      width = this.getCanvasWidth(canvas),
      height = this.getCanvasHeight(canvas),
      pixelRatio = 1,
      maxPixelRatio = 2,
      clearColor,
      clearAlpha = 1
    } = config
    this.instance = new WebGLRenderer({ antialias: true, canvas })
    this.canvas = canvas
    this.setSize(width, height, this.resolvePixelRatio(pixelRatio, maxPixelRatio))

    if (clearColor) {
      this.instance.setClearColor(clearColor, clearAlpha)
    }
  }

  /**
   * 更新渲染器的输出尺寸。
   */
  setSize(w: number, h: number, pixelRatio: number) {
    this.instance.setSize(w, h, false)
    this.instance.setPixelRatio(pixelRatio)
  }

  /**
   * 根据最新尺寸更新渲染器模块。
   */
  resize(resizeInfo: ResizeInfo) {
    this.instance.setPixelRatio(resizeInfo.pixelRatio)
    this.instance.setSize(resizeInfo.width, resizeInfo.height, false)
  }

  /**
   * 执行渲染器模块的帧更新钩子。
   */
  update?: ((tick: TickInfo, context: EngineContext) => void) | undefined = (_tick, context) => {
    this.render(context.scene, context.camera)
  }

  /**
   * 使用当前场景和相机渲染一帧。
   */
  render(scene: Scene, camera: Camera) {
    this.instance.render(scene, camera)
  }

  /**
   * 释放渲染器模块持有的资源。
   */
  destroy(): void {
    this.instance.dispose()
    this.instance.forceContextLoss()
  }

  /**
   * 解析受上限约束的设备像素比。
   */
  private resolvePixelRatio(pixelRatio?: number, maxPixelRatio = 2): number {
    if (typeof pixelRatio === 'number' && Number.isFinite(pixelRatio) && pixelRatio > 0) {
      return pixelRatio
    }

    const devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1

    return Math.min(devicePixelRatio, maxPixelRatio)
  }

  /**
   * 获取渲染画布的有效宽度。
   */
  private getCanvasWidth(canvas: CoreCanvas) {
    if (canvas instanceof HTMLCanvasElement) {
      return canvas.clientWidth || canvas.width || 1
    }

    return (canvas as SizedCanvas).width || 1
  }

  /**
   * 获取渲染画布的有效高度。
   */
  private getCanvasHeight(canvas: CoreCanvas) {
    if (canvas instanceof HTMLCanvasElement) {
      return canvas.clientHeight || canvas.height || 1
    }

    return (canvas as SizedCanvas).height || 1
  }

  /**
   * 获取底层 WebGL 渲染器实例。
   */
  get renderer() {
    return this.instance
  }
}
