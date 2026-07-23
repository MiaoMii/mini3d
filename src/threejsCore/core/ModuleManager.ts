import type { CoreConfig, IModule, ResizeInfo, TickInfo } from './index'
// import { EventBus } from './EventBus'
// import type { CoreEventMap } from './types'
import type { EngineContext } from './index'
export class ModuleManager {
  private ctx: EngineContext | null = null
  private modules = new Map<string, IModule>()
  private readonly dataSubscriptions = new Map<string, () => void>()
  private started = false
  private config: Partial<CoreConfig>

  /**
   * 创建模块管理器实例。
   */
  constructor(context: EngineContext, config: Partial<CoreConfig>) {
    this.ctx = context
    this.config = config
  }

  /**
   * 注册模块并执行初始化与数据订阅。
   */
  register(module: IModule) {
    if (this.modules.has(module.id)) {
      throw new Error(`Module "${module.id}" is already registered.`)
    }

    this.modules.set(module.id, module)

    module.init?.(this.ctx!)
    this.subscribeModuleData(module)

    if (this.started) {
      module.start?.(this.ctx!)
    }
  }

  /**
   * 注销模块并执行停止和销毁流程。
   */
  async unregister(id: string): Promise<boolean> {
    const module = this.modules.get(id)

    if (!module) return false

    this.unsubscribeModuleData(id)

    if (this.started) {
      await module.stop?.(this.ctx!)
    }

    await module.destroy?.(this.ctx!)

    this.modules.delete(id)
    return true
  }

  /**
   * 初始化全部已注册模块。
   */
  init() {
    this.getSortedModules().forEach((module: IModule) => {
      module.init?.(this.ctx!)
    })
  }

  /**
   * 按执行顺序启动全部已注册模块。
   */
  async start() {
    if (this.started) return

    this.started = true

    for (const module of this.getSortedModules()) {
      await module.start?.(this.ctx!)
    }
  }

  /**
   * 按执行顺序停止全部已注册模块。
   */
  async stop() {
    if (!this.started) return

    this.started = false

    for (const module of this.getSortedModules()) {
      await module.stop?.(this.ctx!)
    }
  }

  /**
   * 按执行顺序驱动全部模块更新一帧。
   */
  update(tick: TickInfo) {
    this.getSortedModules().forEach((module: IModule) => {
      module.update?.(tick, this.ctx!)
    })
  }

  /**
   * 更新指定模块的配置。
   */
  async updateConfig<TConfig = unknown>(id: string, config: Partial<TConfig>): Promise<boolean> {
    const module = this.modules.get(id) as IModule<TConfig> | undefined

    if (!module?.updateConfig) return false

    await module.updateConfig(config, this.ctx!)
    return true
  }

  /**
   * 为模块绑定或解除数据源订阅。
   */
  bindData(id: string, dataSourceId?: string): boolean {
    const module = this.modules.get(id)
    if (!module) return false

    if (!module.onDataChange) {
      throw new Error(`Module "${id}" does not support data binding.`)
    }

    if (dataSourceId && !this.ctx?.data.has(dataSourceId)) {
      throw new Error(`Data source with id "${dataSourceId}" is not registered.`)
    }

    this.unsubscribeModuleData(id)
    module.dataSourceId = dataSourceId
    this.subscribeModuleData(module)
    return true
  }

  /**
   * 判断指定模块是否已注册。
   */
  has(id: string): boolean {
    return this.modules.has(id)
  }

  /**
   * 将尺寸变化通知全部已注册模块。
   */
  resize(info: ResizeInfo) {
    this.getSortedModules().forEach((module: IModule) => {
      module.resize?.(info, this.ctx!, this.config)
    })
  }

  /**
   * 停止并销毁全部模块，同时取消数据源订阅。
   */
  async destroy() {
    await this.stop()

    this.dataSubscriptions.forEach((unsubscribe) => unsubscribe())
    this.dataSubscriptions.clear()

    await Promise.all(this.getSortedModules().map((module: IModule) => module.destroy?.(this.ctx!)))

    this.modules.clear()
  }

  /**
   * 按执行顺序返回已注册模块。
   */
  private getSortedModules(): IModule[] {
    return [...this.modules.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  /**
   * 订阅模块绑定的数据源并转发数据变化。
   */
  private subscribeModuleData(module: IModule): void {
    if (!module.dataSourceId || !module.onDataChange || !this.ctx) return

    const unsubscribe = this.ctx.data.subscribe(module.dataSourceId, (data) => {
      Promise.resolve(module.onDataChange?.(data, this.ctx!)).catch((error) => {
        console.error(`Module "${module.id}" failed to apply data.`, error)
      })
    })

    this.dataSubscriptions.set(module.id, unsubscribe)
  }

  /**
   * 取消模块当前的数据源订阅。
   */
  private unsubscribeModuleData(id: string): void {
    this.dataSubscriptions.get(id)?.()
    this.dataSubscriptions.delete(id)
  }
}
