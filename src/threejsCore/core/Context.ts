import type { Camera, Scene, WebGLRenderer } from 'three'
import {
  Resize,
  EventBus,
  RendererMoudle,
  SceneMoudle,
  Loop,
  CameraModule,
  ModuleManager,
  ControlsModule,
  DataManager
} from './index'
import { engineEvents } from './EngineEvents'
import type { CoreEventMap, CoreConfig, CoreCanvas, EngineEventMap } from './index'

export class EngineContext {
  readonly canvas: CoreCanvas
  // readonly container?: HTMLElement
  // readonly scene: Scene
  // camera: Camera
  // readonly renderer: RendererMoudle
  readonly loop: Loop
  readonly events: EventBus<EngineEventMap> // 外部使用 避免污染内部方法
  readonly eventsBus = new EventBus<CoreEventMap>() // 内部使用
  readonly data: DataManager
  readonly modules: ModuleManager
  readonly resize: Resize
  public readonly controlsModule: ControlsModule
  public readonly sceneModule: SceneMoudle
  public readonly cameraModule: CameraModule
  public readonly rendererModule: RendererMoudle

  // 插件服务注册
  private readonly services = new Map<string, unknown>()

  /**
   * 创建引擎上下文实例。
   */
  constructor(config: CoreConfig, events = engineEvents) {
    this.events = events
    this.data = new DataManager(config.dataRequester)
    config.dataSources?.forEach((source) => {
      this.data.register(source)
    })

    // 初始化场景
    this.sceneModule = new SceneMoudle(config.scene)
    // 初始化渲染器
    this.rendererModule = new RendererMoudle({ canvas: config.canvas })
    // 初始化相机
    this.cameraModule = new CameraModule(config)
    // 初始化控制器
    this.controlsModule = new ControlsModule(this.cameraModule, config)

    // 创建序列帧
    this.loop = new Loop(this.eventsBus)

    // resize
    this.resize = new Resize(this.eventsBus, config)
    this.canvas = config.canvas
    this.modules = new ModuleManager(this, config)
    // this.modules.register(this.controlsModule)
  }

  /**
   * 注册或替换扩展服务。
   */
  set<TValue>(key: string, value: TValue): this {
    this.services.set(key, value)
    return this
  }

  /**
   * 获取扩展服务；不存在时抛出错误。
   */
  get<TValue>(key: string): TValue {
    if (!this.services.has(key)) {
      throw new Error(`Service "${key}" is not registered in EngineContext.`)
    }

    return this.services.get(key) as TValue
  }

  /**
   * 获取可能不存在的扩展服务。
   */
  maybe<TValue>(key: string): TValue | undefined {
    return this.services.get(key) as TValue | undefined
  }

  /**
   * 判断扩展服务是否已注册。
   */
  has(key: string): boolean {
    return this.services.has(key)
  }

  /**
   * 删除指定扩展服务。
   */
  delete(key: string): boolean {
    return this.services.delete(key)
  }

  /**
   * 清空上下文中注册的扩展服务。
   */
  clear(): void {
    this.services.clear()
  }

  // 快捷getter，业务层直接取原生Three对象
  /**
   * 获取引擎场景实例。
   */
  get scene(): Scene {
    return this.sceneModule.scene
  }
  /**
   * 获取引擎相机实例。
   */
  get camera(): Camera {
    return this.cameraModule.camera
  }
  /**
   * 获取引擎渲染器实例。
   */
  get renderer(): WebGLRenderer {
    return this.rendererModule.renderer
  }
}
