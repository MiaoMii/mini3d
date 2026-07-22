import { EngineContext } from './Context'
import { engineEvents } from './EngineEvents'
import type { CoreConfig, ResizeInfo, IModule } from './index'

export class Engins {
  readonly container?: HTMLElement
  readonly ctx: EngineContext
  readonly events = engineEvents

  constructor(config: CoreConfig) {
    this.ctx = new EngineContext(config, this.events)

    // 注册业务模块
    config.modules?.forEach((module) => {
      this.ctx.modules.register(module)
    })

    // loop 每帧驱动模块和渲染
    this.ctx.eventsBus.on('loop:tick', (tick) => {
      this.ctx.modules.update(tick)
      this.ctx.renderer.render(this.ctx.scene, this.ctx.camera)
      this.ctx.controlsModule.update(tick)
    })

    // resize 驱动 renderer/camera/modules
    this.ctx.eventsBus.on('resize', (size: ResizeInfo) => {
      this.ctx.rendererModule.resize(size)
      this.ctx.cameraModule.updateCameraProjection()
      this.ctx.modules.resize(size)
    })

    if (config.autoStart) {
      this.start()
    }
  }

  use(module: IModule) {
    this.ctx.modules.register(module)
    return this
  }

  updateModuleConfig<TConfig = unknown>(id: string, config: Partial<TConfig>) {
    return this.ctx.modules.updateConfig<TConfig>(id, config)
  }

  removeModule(id: string) {
    return this.ctx.modules.unregister(id)
  }

  bindModuleData(id: string, dataSourceId?: string) {
    return this.ctx.modules.bindData(id, dataSourceId)
  }

  async start() {
    this.ctx.resize.start()
    this.ctx.loop.start()
    await this.ctx.modules.start()
  }

  async stop() {
    await this.ctx.modules.stop()
    this.ctx.loop.stop()
    this.ctx.resize.stop()
  }

  async destroy() {
    await this.stop()
    await this.ctx.modules.destroy()
    this.ctx.data.destroy()
    this.ctx.rendererModule.destroy()
    this.ctx.eventsBus.clear()
    this.ctx.clear()
  }
}
