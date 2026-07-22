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

  setSize(w: number, h: number, pixelRatio: number) {
    this.instance.setSize(w, h, false)
    this.instance.setPixelRatio(pixelRatio)
  }

  resize(resizeInfo: ResizeInfo) {
    this.instance.setPixelRatio(resizeInfo.pixelRatio)
    this.instance.setSize(resizeInfo.width, resizeInfo.height, false)
  }

  update?: ((tick: TickInfo, context: EngineContext) => void) | undefined = (_tick, context) => {
    this.render(context.scene, context.camera)
  }

  render(scene: Scene, camera: Camera) {
    this.instance.render(scene, camera)
  }

  destroy(): void {
    this.instance.dispose()
    this.instance.forceContextLoss()
  }

  private resolvePixelRatio(pixelRatio?: number, maxPixelRatio = 2): number {
    if (typeof pixelRatio === 'number' && Number.isFinite(pixelRatio) && pixelRatio > 0) {
      return pixelRatio
    }

    const devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1

    return Math.min(devicePixelRatio, maxPixelRatio)
  }

  private getCanvasWidth(canvas: CoreCanvas) {
    if (canvas instanceof HTMLCanvasElement) {
      return canvas.clientWidth || canvas.width || 1
    }

    return (canvas as SizedCanvas).width || 1
  }

  private getCanvasHeight(canvas: CoreCanvas) {
    if (canvas instanceof HTMLCanvasElement) {
      return canvas.clientHeight || canvas.height || 1
    }

    return (canvas as SizedCanvas).height || 1
  }

  get renderer() {
    return this.instance
  }
}
