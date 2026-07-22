import * as THREE from 'three'
import * as _ from 'lodash'
import type {
  DataResourceSnapshot,
  DataSourceConfig,
  DataSourceListener,
  DataSourceType,
  Engins,
  IModule,
  Vector3Tuple
} from '../core'
import { findSceneCoreDefinition, sceneCoreDefinitions } from './coreSettings'
import { findSceneModuleDefinition } from './definitions'
import { useEditorStore } from '@/stores/editor'
const store = useEditorStore()

export interface SceneModuleSnapshot<TConfig extends object = object> {
  id: string
  dataSourceId?: string
  type: string
  label: string
  removable: boolean
  acceptsData: boolean
  config: TConfig
}

export type SceneModuleListener = (modules: readonly SceneModuleSnapshot[]) => void

export interface CapturedCameraView {
  position: Vector3Tuple
  target: Vector3Tuple
}

interface RegisteredSceneModule {
  type: string
  label: string
  module: IModule<object>
}

export interface SceneCoreSetting {
  id: string
  type: string
  config: object
}

export interface SceneModuleDraft {
  id: string
  type: string
  dataSourceId?: string
  config: object
}

export interface SceneDraftSummary {
  coreSettingCount: number
  moduleCount: number
  dataSourceCount: number
}

export interface SceneSetting {
  dataSources: DataSourceConfig[]
  coreSettings: SceneCoreSetting[]
  modules: SceneModuleDraft[]
}

export class SceneModuleRegistry {
  private readonly modules = new Map<string, RegisteredSceneModule>()
  private readonly listeners = new Set<SceneModuleListener>()
  private readonly dataSourceListeners = new Set<DataSourceListener>()
  private engine: Engins | null = null
  private defaultCoreSettings: SceneCoreSetting[] = []
  private sceneDraftRevision = 0
  private stopDataSourceSubscription: (() => void) | null = null

  /**
   * 连接场景引擎
   * @param engine
   * @returns
   */
  connectEngine(engine: Engins): () => void {
    if (this.engine && this.engine !== engine) {
      throw new Error('Another scene engine is already connected.')
    }

    if (this.engine === engine) {
      void this.restoreSceneDraft(engine)

      return () => {
        if (this.engine !== engine) return

        this.sceneDraftRevision += 1
        this.stopDataSourceSubscription?.()
        this.stopDataSourceSubscription = null
        this.engine = null
        this.defaultCoreSettings = []
        this.modules.clear()
        this.publishModules()
        this.publishDataSources()
      }
    }

    this.engine = engine
    this.defaultCoreSettings = sceneCoreDefinitions.map((definition) => ({
      id: definition.id,
      type: definition.type,
      config: _.cloneDeep(definition.getConfig(engine))
    }))
    void this.restoreSceneDraft(engine)
    this.stopDataSourceSubscription = engine.ctx.data.subscribeSources(() => {
      this.publishDataSources()
    })
    this.publishModules()

    return () => {
      if (this.engine !== engine) return

      this.stopDataSourceSubscription?.()
      this.stopDataSourceSubscription = null
      this.sceneDraftRevision += 1
      this.engine = null
      this.defaultCoreSettings = []
      this.modules.clear()
      this.publishModules()
      this.publishDataSources()
    }
  }

  /**
   * 判断场景引擎是否已连接
   * @returns
   */
  isEngineConnected(): boolean {
    return this.engine !== null
  }

  /**
   * 获取当前相机视角
   * @returns
   */
  captureCurrentCameraView(): CapturedCameraView | null {
    if (!this.engine) return null

    return {
      position: this.engine.ctx.camera.position.toArray() as Vector3Tuple,
      target: this.engine.ctx.controlsModule.target.toArray() as Vector3Tuple
    }
  }

  /**
   * 创建场景模块
   * @param type
   * @param config
   * @returns
   */
  createModule(type: string, config: object = {}): SceneModuleSnapshot | null {
    if (!this.engine) return null

    const definition = findSceneModuleDefinition(type)
    if (!definition) {
      throw new Error(`Scene module type "${type}" is not registered.`)
    }

    const module = definition.create(config as never) as IModule<object>

    this.engine.use(module)
    this.modules.set(module.id, {
      type: definition.type,
      label: definition.label,
      module
    })
    this.publishModules()

    return this.createSnapshot(this.modules.get(module.id)!)
  }

  /**
   * 删除场景模块
   * @param id
   * @returns
   */
  async removeModule(id: string): Promise<boolean> {
    if (!this.engine) return false

    const sceneModule = this.modules.get(id)
    if (!sceneModule) return false

    this.modules.delete(id)
    this.publishModules()
    const removed = await this.engine.removeModule(id)
    if (removed) return true

    this.modules.set(id, sceneModule)
    this.publishModules()
    return false
  }

  /**
   * 更新场景核心配置或模块配置
   * @param id
   * @param config
   * @returns
   */
  async updateConfig(id: string, config: object): Promise<boolean> {
    if (!this.engine) return false

    const coreDefinition = findSceneCoreDefinition(id)
    if (coreDefinition) {
      await coreDefinition.updateConfig(this.engine, config)
      this.publishModules()
      return true
    }

    const sceneModule = this.modules.get(id)
    if (!sceneModule) return false

    const updated = await this.engine.updateModuleConfig(id, config)
    if (!updated) return false

    this.publishModules()
    return true
  }

  /**
   * 绑定模块数据源
   * @param id
   * @param dataSourceId
   * @returns
   */
  bindModuleData(id: string, dataSourceId?: string): boolean {
    if (!this.engine) return false

    const bound = this.engine.bindModuleData(id, dataSourceId)
    if (bound) this.publishModules()
    return bound
  }

  /**
   * 创建数据源
   * @param type
   * @returns
   */
  createDataSource(type: DataSourceType): DataResourceSnapshot | null {
    if (!this.engine) return null

    const id = THREE.MathUtils.generateUUID()

    const source =
      type === 'static'
        ? this.engine.ctx.data.register({
            id,
            name: '静态数据',
            type: 'static',
            data: {}
          })
        : this.engine.ctx.data.register({
            id,
            name: 'API 数据',
            type: 'api',
            url: '',
            method: 'GET',
            params: {},
            polling: 0,
            autoRequest: false
          })

    this.publishDataSources()
    return source
  }

  /**
   * 更新数据源配置
   * @param dataSourceId
   * @param config
   * @returns
   */
  updateDataSource(dataSourceId: string, config: Partial<DataSourceConfig>): boolean {
    if (!this.engine?.ctx.data.has(dataSourceId)) return false

    this.engine.ctx.data.updateSource(dataSourceId, config)
    return true
  }

  /**
   * 设置数据源数据
   * @param dataSourceId
   * @param data
   * @returns
   */
  setData(dataSourceId: string, data: unknown): boolean {
    if (!this.engine?.ctx.data.has(dataSourceId)) return false

    this.engine.ctx.data.set(dataSourceId, data)
    return true
  }

  /**
   * 请求数据源数据
   * @param dataSourceId
   * @returns
   */
  requestData(dataSourceId: string): Promise<unknown> {
    if (!this.engine) return Promise.reject(new Error('Scene engine is not connected.'))
    return this.engine.ctx.data.request(dataSourceId)
  }

  /**
   * 启动数据源轮询
   * @param dataSourceId
   * @returns
   */
  startDataPolling(dataSourceId: string): boolean {
    return this.engine?.ctx.data.startPolling(dataSourceId) ?? false
  }

  /**
   * 停止数据源轮询
   * @param dataSourceId
   * @returns
   */
  stopDataPolling(dataSourceId: string): boolean {
    return this.engine?.ctx.data.stopPolling(dataSourceId) ?? false
  }

  /**
   * 删除数据源
   * @param dataSourceId
   * @returns
   */
  removeDataSource(dataSourceId: string): boolean {
    if (!this.engine) return false

    this.modules.forEach(({ module }) => {
      if (module.dataSourceId === dataSourceId) {
        this.engine?.bindModuleData(module.id, undefined)
      }
    })

    const removed = this.engine.ctx.data.remove(dataSourceId)
    if (removed) this.publishModules()
    return removed
  }

  /**
   * 获取数据源快照
   * @returns
   */
  getDataSources(): readonly DataResourceSnapshot[] {
    return this.engine?.ctx.data.getSources() ?? []
  }

  /**
   * 订阅数据源变更
   * @param listener
   * @returns
   */
  subscribeDataSources(listener: DataSourceListener): () => void {
    this.dataSourceListeners.add(listener)
    listener(this.getDataSources())

    return () => this.dataSourceListeners.delete(listener)
  }

  /**
   * 保存场景草稿
   * @returns
   */
  saveSceneDraft(): SceneDraftSummary {
    if (!this.engine) {
      throw new Error('Scene engine is not connected.')
    }

    const draft: SceneSetting = {
      dataSources: this.getDataSources().map(({ source }) => _.cloneDeep(source)),
      coreSettings: sceneCoreDefinitions.map((definition) => ({
        id: definition.id,
        type: definition.type,
        config: _.cloneDeep(definition.getConfig(this.engine!))
      })),
      modules: [...this.modules.values()].map(({ type, module }) => ({
        id: module.id,
        type,
        dataSourceId: module.dataSourceId,
        config: _.cloneDeep(module.config ?? {})
      }))
    }

    store.updateSceneSetting(draft)

    return {
      coreSettingCount: draft.coreSettings.length,
      moduleCount: draft.modules.length,
      dataSourceCount: draft.dataSources.length
    }
  }

  /**
   * 获取场景核心设置和模块快照
   * @returns
   */
  getModules(): readonly SceneModuleSnapshot[] {
    const coreSettings = this.engine
      ? sceneCoreDefinitions.map((definition) => ({
          id: definition.id,
          type: definition.type,
          label: definition.label,
          removable: false,
          acceptsData: false,
          config: _.cloneDeep(definition.getConfig(this.engine!))
        }))
      : []
    const sceneModules = [...this.modules.values()].map((sceneModule) =>
      this.createSnapshot(sceneModule)
    )

    return [...coreSettings, ...sceneModules]
  }

  /**
   * 订阅场景模块变更
   * @param listener
   * @returns
   */
  subscribe(listener: SceneModuleListener): () => void {
    this.listeners.add(listener)
    listener(this.getModules())

    return () => this.listeners.delete(listener)
  }

  /**
   * 发布场景模块快照
   */
  private publishModules(): void {
    const modules = this.getModules()
    this.listeners.forEach((listener) => listener(modules))
  }

  /**
   * 发布数据源快照
   */
  private publishDataSources(): void {
    const sources = this.getDataSources()
    this.dataSourceListeners.forEach((listener) => listener(sources))
  }

  /**
   * 从编辑器存储恢复场景草稿
   * @param engine
   */
  private async restoreSceneDraft(engine: Engins): Promise<void> {
    const revision = ++this.sceneDraftRevision

    try {
      const savedSceneSetting = store.getSceneSetting as Partial<SceneSetting> | null
      const savedDataSources = savedSceneSetting?.dataSources
      const savedCoreSettings = savedSceneSetting?.coreSettings
      const savedModules = savedSceneSetting?.modules
      const draft: SceneSetting = {
        dataSources: _.cloneDeep(Array.isArray(savedDataSources) ? savedDataSources : []),
        coreSettings: _.cloneDeep(Array.isArray(savedCoreSettings) ? savedCoreSettings : []),
        modules: _.cloneDeep(Array.isArray(savedModules) ? savedModules : [])
      }

      for (const moduleId of [...this.modules.keys()]) {
        await engine.removeModule(moduleId)
        this.modules.delete(moduleId)

        if (this.engine !== engine || this.sceneDraftRevision !== revision) return
      }

      engine.ctx.data.getSources().forEach(({ source }) => {
        engine.ctx.data.remove(source.id)
      })

      if (this.engine !== engine || this.sceneDraftRevision !== revision) return

      draft.dataSources.forEach((source) => {
        engine.ctx.data.register(source)
      })

      for (const definition of sceneCoreDefinitions) {
        const savedCoreSetting = draft.coreSettings.find(
          ({ id, type }) => id === definition.id || type === definition.type
        )
        const defaultCoreSetting = this.defaultCoreSettings.find(({ id }) => id === definition.id)
        const config = savedCoreSetting?.config ?? defaultCoreSetting?.config
        if (!config) continue

        await definition.updateConfig(engine, _.cloneDeep(config))
        if (this.engine !== engine || this.sceneDraftRevision !== revision) return
      }

      draft.modules.forEach((savedModule) => {
        const definition = findSceneModuleDefinition(savedModule.type)
        if (!definition) {
          console.warn(`Scene module type "${savedModule.type}" is not registered.`)
          return
        }

        const dataSourceId =
          savedModule.dataSourceId && engine.ctx.data.has(savedModule.dataSourceId)
            ? savedModule.dataSourceId
            : undefined
        const module = definition.create({
          ...savedModule.config,
          id: savedModule.id,
          dataSourceId
        } as never) as IModule<object>

        engine.use(module)
        if (dataSourceId && module.onDataChange) {
          engine.bindModuleData(module.id, dataSourceId)
        }
        this.modules.set(module.id, {
          type: definition.type,
          label: definition.label,
          module
        })
      })
    } catch (error) {
      console.warn('Failed to restore the browser scene draft.', error)
    } finally {
      if (this.engine === engine && this.sceneDraftRevision === revision) {
        this.publishModules()
        this.publishDataSources()
      }
    }
  }

  /**
   * 创建场景模块快照
   * @param sceneModule
   * @returns
   */
  private createSnapshot(sceneModule: RegisteredSceneModule): SceneModuleSnapshot {
    return {
      id: sceneModule.module.id,
      dataSourceId: sceneModule.module.dataSourceId,
      type: sceneModule.type,
      label: sceneModule.label,
      removable: true,
      acceptsData: typeof sceneModule.module.onDataChange === 'function',
      config: _.cloneDeep(sceneModule.module.config ?? {})
    }
  }
}

export const sceneModuleRegistry = new SceneModuleRegistry()
