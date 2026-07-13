import type { CoreConfig, IModule, ResizeInfo, TickInfo } from './index'
// import { EventBus } from './EventBus'
// import type { CoreEventMap } from './types'
import { EngineContext } from './index'
export class ModuleManager {
  private ctx: EngineContext | null = null
  private modules = new Map<string, IModule>()
  private started = false
  private config: Partial<CoreConfig>

  constructor(context: EngineContext, config: Partial<CoreConfig>) {
    this.ctx = context
    this.config = config
  }

  register(module: IModule) {
    if (this.modules.has(module.id)) {
      throw new Error(`Module "${module.id}" is already registered.`)
    }

    this.modules.set(module.id, module)

    module.init?.(this.ctx!)

    if (this.started) {
      module.start?.(this.ctx!)
    }
  }

  unRegister(id: string) {
    const module = this.modules.get(id)

    if (!module) return

    if (this.started) {
      module.stop?.(this.ctx!)
    }

    module.destroy?.(this.ctx!)

    this.modules.delete(id)
  }

  init() {
    this.getSortedModules().forEach((module: IModule) => {
      module.init?.(this.ctx!)
    })
  }

  async start() {
    if (this.started) return

    this.started = true

    await Promise.all(this.getSortedModules().map((module: IModule) => module.start?.(this.ctx!)))
  }

  async stop() {
    if (!this.started) return

    this.started = false

    await Promise.all(this.getSortedModules().map((module: IModule) => module.stop?.(this.ctx!)))
  }

  update(tick: TickInfo) {
    this.getSortedModules().forEach((module: IModule) => {
      module.update?.(tick, this.ctx!)
    })
  }

  async updateConfig<TConfig = unknown>(id: string, config: Partial<TConfig>): Promise<boolean> {
    const module = this.modules.get(id) as IModule<TConfig> | undefined

    if (!module?.updateConfig) return false

    await module.updateConfig(config, this.ctx!)
    return true
  }

  resize(info: ResizeInfo) {
    this.getSortedModules().forEach((module: IModule) => {
      module.resize?.(info, this.ctx!, this.config)
    })
  }

  async destroy() {
    await this.stop()

    await Promise.all(this.getSortedModules().map((module: IModule) => module.destroy?.(this.ctx!)))

    this.modules.clear()
  }

  private getSortedModules(): IModule[] {
    return [...this.modules.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }
}
