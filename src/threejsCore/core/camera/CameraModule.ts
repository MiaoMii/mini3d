import { MathUtils, type Camera, type PerspectiveCamera, type OrthographicCamera } from 'three'
import type {
  IModule,
  TickInfo,
  CoreEventMap,
  CoreConfig,
  ResizeConfig,
  EngineContext
} from '../index'
import { EventBus } from '../index'
import type { CameraConfig, CameraMode } from './index'
import { PrspectiveCameraImpl, OrthographicCameraImpl } from './index'
export class CameraModule implements IModule<CameraConfig> {
  readonly id = 'camera'
  readonly name: string = 'camera'
  readonly config: CameraConfig
  readonly resizeConfig: ResizeConfig
  readonly order = -1000
  // readonly ctx: EngineContext
  readonly eventsBus: EventBus<CoreEventMap>
  private instance: PerspectiveCamera | OrthographicCamera | undefined = undefined
  prspectiveCamera: PrspectiveCameraImpl | null = null
  othographicCamera: OrthographicCameraImpl | null = null
  // 当前激活模式
  private activeMode: CameraMode = 'perspective'
  // 模块内部缓存待更新参数
  private updateConfigCache: CameraConfig | null = null
  constructor(eventsBus: EventBus<CoreEventMap>, config: Omit<CoreConfig, 'canvas'>) {
    this.config = config.camera ?? {}
    this.resizeConfig = config.resize ?? {}
    this.eventsBus = eventsBus

    this.activeMode = this.config?.mod ? this.config?.mod : this.activeMode
    this.start()
  }

  // 初始化相机
  init() {
    // 创建透视相机
    this.prspectiveCamera = new PrspectiveCameraImpl(this.config, this.getAspect())

    // 2. 创建正交相机
    const halfHeight = this.calcOrthHalfHeight()
    const halfWidth = halfHeight * this.getAspect()

    this.othographicCamera = new OrthographicCameraImpl({
      ...this.config,
      left: -halfWidth,
      right: halfWidth,
      top: halfHeight,
      bottom: -halfHeight
    })
  }

  start() {
    this.init()
    this.setMod()
    // this.eventsBus.on('camera:update', (payload: CameraConfig) => {
    //   this.updateConfigCache = payload
    // })
  }

  update(_tick: TickInfo, context: EngineContext) {
    console.log('相机更新了')
    // if (this.updateConfigCache) {
    //   this.handleConfigUpdate(this.updateConfigCache)
    //   this.updateConfigCache = null
    // }
  }

  resize(resizeInfo, ctx, config) {
    this.updateCameraProjection()
  }

  stop() {}

  destroy() {
    // this.eventsBus.off('camera:update')
    this.instance = undefined
  }

  setMod() {
    const nextMode = this.config.mod ?? this.activeMode
    if (this.instance && this.activeMode === nextMode) return

    if (nextMode === 'perspective') {
      this.instance = this.prspectiveCamera?.instance
    } else {
      this.instance = this.othographicCamera?.instance
    }

    this.activeMode = nextMode
  }

  handleConfigUpdate(updateConfig: CameraConfig) {
    Object.assign(this.config, updateConfig)
    this.setMod()
    this.updateCameraProjection()
  }

  /**
   * 内部方法：更新两个相机的投影参数
   */
  updateCameraProjection(): void {
    const resizeInfo = this.getResizeInfo()

    // 更新透视相机
    this.prspectiveCamera?.resize(resizeInfo)

    // 更新正交相机
    const halfHeight = this.calcOrthHalfHeight()
    const halfWidth = this.getAspect() * halfHeight
    this.othographicCamera?.resize(resizeInfo, { halfHeight, halfWidth })
  }

  /**
   * 计算正交相机半高：和透视相机可视范围匹配，切换时画面不跳变
   * 原理：基于透视相机 fov 和相机到目标的距离，计算目标平面的可视高度
   */
  private calcOrthHalfHeight(): number {
    const distance = this.prspectiveCamera?.distance ?? 1
    const fovRad = MathUtils.degToRad((this.config?.fov ?? 45) / 2)
    return distance * Math.tan(fovRad)
  }

  private getAspect(): number {
    const { aspect, width, height } = this.resizeConfig
    if (typeof aspect === 'number' && Number.isFinite(aspect) && aspect > 0) {
      return aspect
    }

    if (width && height) {
      return width / height
    }

    return 1
  }

  private getResizeInfo() {
    const width = this.resizeConfig.width ?? 1
    const height = this.resizeConfig.height ?? 1
    return {
      width,
      height,
      pixelRatio: this.resizeConfig.pixelRatio ?? 1,
      aspect: this.getAspect()
    }
  }

  get camera(): Camera {
    const camera = this.instance
    if (!camera) {
      throw new Error('CameraModule has not been initialized.')
    }

    return camera
  }
}
