import type { Camera, Scene, WebGLRenderer } from 'three'
import {
  Resize,
  EventBus,
  RendererMoudle,
  SceneMoudle,
  Loop,
  CameraModule,
  ModuleManager,
  ControlsModule
} from './index'
import type { CoreEventMap, CoreConfig, CoreCanvas } from './index'

export class EngineContext {
  readonly canvas: CoreCanvas
  // readonly container?: HTMLElement
  // readonly scene: Scene
  // camera: Camera
  // readonly renderer: RendererMoudle
  readonly loop: Loop
  readonly eventsBus = new EventBus<CoreEventMap>()
  readonly modules: ModuleManager
  readonly resize: Resize
  public readonly controlsModule: ControlsModule
  public readonly sceneModule: SceneMoudle
  public readonly cameraModule: CameraModule
  public readonly rendererModule: RendererMoudle

  // 插件服务注册
  private readonly services = new Map<string, unknown>()

  constructor(config: CoreConfig) {
    // 初始化场景
    this.sceneModule = new SceneMoudle()
    // 初始化渲染器
    this.rendererModule = new RendererMoudle({ canvas: config.canvas })
    // 初始化相机
    this.cameraModule = new CameraModule(this.eventsBus, config)
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

  set<TValue>(key: string, value: TValue): this {
    this.services.set(key, value)
    return this
  }

  get<TValue>(key: string): TValue {
    if (!this.services.has(key)) {
      throw new Error(`Service "${key}" is not registered in EngineContext.`)
    }

    return this.services.get(key) as TValue
  }

  maybe<TValue>(key: string): TValue | undefined {
    return this.services.get(key) as TValue | undefined
  }

  has(key: string): boolean {
    return this.services.has(key)
  }

  delete(key: string): boolean {
    return this.services.delete(key)
  }

  clear(): void {
    this.services.clear()
  }

  // 快捷getter，业务层直接取原生Three对象
  get scene(): Scene {
    return this.sceneModule.scene
  }
  get camera(): Camera {
    return this.cameraModule.camera
  }
  get renderer(): WebGLRenderer {
    return this.rendererModule.renderer
  }
}
