import { EventBus } from './index'
import type { CoreEventMap, CoreConfig, CoreCanvas, ResizeConfig, ResizeInfo } from './index'

type SizedCanvas = {
  width?: number
  height?: number
}

export class Resize {
  readonly eventsBus: EventBus<CoreEventMap>
  readonly canvas: CoreCanvas
  readonly container?: HTMLElement
  readonly resizeConfig: ResizeConfig
  private isActive = false
  private debounceTimer: number | null = null
  private observer: ResizeObserver | null = null
  private readonly debounceDelay = 100 // 防抖延迟，单位ms
  constructor(eventsBus: EventBus<CoreEventMap>, config: CoreConfig) {
    this.eventsBus = eventsBus
    this.canvas = config.canvas
    this.container = config.container
    this.resizeConfig = config.resize ?? {}
    this.init()
  }

  // 初始化
  init() {
    if (this.isActive) return
    this.setupObserver()
    this.isActive = true
    // 初始化主动触发一次，保证初始尺寸正确
    this.handleResize()
  }

  setupObserver() {
    const target = this.getResizeTarget()

    // 优先使用 ResizeObserver 监听容器
    if ('ResizeObserver' in window && target) {
      this.observer = new ResizeObserver(() => {
        this.debounceResize()
      })
      this.observer.observe(target)
    } else {
      // 降级为 window.resize
      window.addEventListener('resize', this.debounceResize)
    }
  }

  private getResizeTarget(): Element | null {
    if (this.container) return this.container
    return this.canvas instanceof HTMLCanvasElement ? this.canvas : null
  }

  private debounceResize = (): void => {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null
      this.handleResize()
    }, this.debounceDelay)
  }

  public stop(): void {
    if (!this.isActive) return
    this.observer?.disconnect()
    window.removeEventListener('resize', this.debounceResize)

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    this.isActive = false
  }

  public start(): void {
    if (this.isActive) return
    this.setupObserver()
    this.isActive = true
    this.handleResize() // 恢复时同步一次尺寸
  }

  handleResize(): ResizeConfig {
    const resizeConfig = this.getResizeConfig()

    this.eventsBus.emit('resize', resizeConfig)

    return resizeConfig
  }

  private getResizeConfig(): ResizeInfo {
    const width = this.resizeConfig.width ?? this.getTargetWidth()
    const height = this.resizeConfig.height ?? this.getTargetHeight()
    const pixelRatio = this.resizeConfig.pixelRatio ?? window.devicePixelRatio ?? 1
    const aspect = this.resizeConfig.aspect ?? width / height

    return {
      width,
      height,
      pixelRatio,
      aspect
    }
  }

  public destroy(): void {
    this.stop()
    this.observer = null
  }

  private getTargetWidth(): number {
    if (this.container) return this.container.clientWidth || 1

    if (this.canvas instanceof HTMLCanvasElement) {
      return this.canvas.clientWidth || this.canvas.width || 1
    }

    return (this.canvas as SizedCanvas).width || 1
  }

  private getTargetHeight(): number {
    if (this.container) return this.container.clientHeight || 1

    if (this.canvas instanceof HTMLCanvasElement) {
      return this.canvas.clientHeight || this.canvas.height || 1
    }

    return (this.canvas as SizedCanvas).height || 1
  }
}
