import axios from 'axios'
import { DataSource } from './DataSource'
import { DataStore } from './DataStore'
import type {
  ApiDataSourceConfig,
  DataListener,
  DataRequester,
  DataRequestParams,
  DataResourceSnapshot,
  DataSourceConfig,
  DataSourceListener
} from './types'

const requestWithAxios: DataRequester = async (config, signal) => {
  const response = await axios.request({
    url: config.url,
    method: config.method ?? 'GET',
    params: config.params,
    data: config.method === 'GET' ? undefined : config.body,
    headers: config.headers,
    signal
  })

  return response.data
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class DataManager {
  private readonly sources = new Map<string, DataSource>()
  private readonly stores = new Map<string, DataStore>()
  private readonly storeSubscriptions = new Map<string, () => void>()
  private readonly dataSubscriptions = new Map<string, Map<DataListener<unknown>, () => void>>()
  private readonly pollingTimers = new Map<string, ReturnType<typeof setInterval>>()
  private readonly requestControllers = new Map<string, AbortController>()
  private readonly requestVersions = new Map<string, number>()
  private readonly sourceListeners = new Set<DataSourceListener>()
  private readonly requester: DataRequester

  constructor(requester: DataRequester = requestWithAxios) {
    this.requester = requester
  }

  register<TData>(registration: DataSourceConfig<TData>): DataResourceSnapshot<TData> {
    assertUuid(registration.id, 'Data source')

    if (this.sources.has(registration.id)) {
      throw new Error(`Data source with id "${registration.id}" already exists.`)
    }

    const source = new DataSource(registration)
    const sourceConfig = source.getConfig()
    const store = new DataStore(
      source.id,
      sourceConfig.type === 'api' ? sourceConfig.params : undefined
    )

    this.sources.set(source.id, source)
    this.stores.set(source.id, store)
    this.storeSubscriptions.set(
      source.id,
      store.subscribe(() => this.publishSources())
    )

    if (sourceConfig.type === 'static') {
      store.set(sourceConfig.data as TData)
    } else {
      if (sourceConfig.autoRequest && sourceConfig.url) {
        void this.request(source.id).catch(() => undefined)
      }

      if ((sourceConfig.polling ?? 0) > 0) {
        this.startPolling(source.id)
      }
    }

    this.publishSources()
    return this.getSnapshot(source.id) as DataResourceSnapshot<TData>
  }

  has(dataSourceId: string): boolean {
    return this.sources.has(dataSourceId)
  }

  get<TData = unknown>(dataSourceId: string): TData | undefined {
    return this.getStore(dataSourceId).get<TData>()
  }

  getSnapshot<TData = unknown>(dataSourceId: string): DataResourceSnapshot<TData> {
    const source = this.getSource<TData>(dataSourceId)
    const store = this.getStore(dataSourceId)

    return {
      source: source.getConfig(),
      store: store.getSnapshot<TData>(),
      polling: this.pollingTimers.has(dataSourceId)
    }
  }

  getSources(): readonly DataResourceSnapshot[] {
    return [...this.sources.keys()].map((dataSourceId) => this.getSnapshot(dataSourceId))
  }

  set<TData>(dataSourceId: string, data: TData): void {
    const source = this.getSource<TData>(dataSourceId)

    if (source.type === 'static') {
      source.update({ data } as Partial<DataSourceConfig<TData>>)
    }

    this.getStore(dataSourceId).set(data)
  }

  updateSource<TData>(dataSourceId: string, patch: Partial<DataSourceConfig<TData>>): void {
    const source = this.getSource<TData>(dataSourceId)
    const wasPolling = this.pollingTimers.has(dataSourceId)

    source.update(patch)

    const config = source.getConfig()
    if (config.type === 'api' && 'params' in patch && patch.params) {
      this.getStore(dataSourceId).updateParams(config.params ?? {})
    }

    if (wasPolling) {
      this.stopPolling(dataSourceId)
      if (config.type === 'api' && (config.polling ?? 0) > 0) {
        this.startPolling(dataSourceId)
      }
    }

    this.publishSources()
  }

  updateParams(dataSourceId: string, params: DataRequestParams): Promise<unknown> {
    const source = this.getApiSource(dataSourceId)
    const config = source.getConfig() as ApiDataSourceConfig
    const nextParams = { ...config.params, ...params }

    source.update({ params: nextParams })
    this.getStore(dataSourceId).updateParams(params)
    this.abortRequest(dataSourceId)

    return this.request(dataSourceId)
  }

  subscribe<TData>(dataSourceId: string, listener: DataListener<TData>): () => void {
    this.unsubscribe(dataSourceId, listener)

    const store = this.getStore(dataSourceId)
    const unsubscribe = store.subscribe<TData>((snapshot) => {
      if (snapshot.status === 'success') {
        listener(snapshot.data as TData, snapshot)
      }
    })

    let subscriptions = this.dataSubscriptions.get(dataSourceId)
    if (!subscriptions) {
      subscriptions = new Map()
      this.dataSubscriptions.set(dataSourceId, subscriptions)
    }

    subscriptions.set(listener as DataListener<unknown>, unsubscribe)

    return () => this.unsubscribe(dataSourceId, listener)
  }

  unsubscribe<TData>(dataSourceId: string, listener: DataListener<TData>): void {
    const subscriptions = this.dataSubscriptions.get(dataSourceId)
    const unsubscribe = subscriptions?.get(listener as DataListener<unknown>)

    unsubscribe?.()
    subscriptions?.delete(listener as DataListener<unknown>)

    if (subscriptions?.size === 0) {
      this.dataSubscriptions.delete(dataSourceId)
    }
  }

  subscribeSources(listener: DataSourceListener): () => void {
    this.sourceListeners.add(listener)
    listener(this.getSources())

    return () => this.sourceListeners.delete(listener)
  }

  async request<TData = unknown>(dataSourceId: string): Promise<TData | undefined> {
    const source = this.getApiSource(dataSourceId)
    const config = source.getConfig() as ApiDataSourceConfig
    const store = this.getStore(dataSourceId)

    if (!config.url?.trim()) {
      const error = new Error(`API data source "${source.id}" has no request URL.`)
      store.setError(error)
      throw error
    }

    this.abortRequest(dataSourceId)

    const controller = new AbortController()
    const requestVersion = (this.requestVersions.get(dataSourceId) ?? 0) + 1

    this.requestControllers.set(dataSourceId, controller)
    this.requestVersions.set(dataSourceId, requestVersion)
    store.setLoading()

    try {
      const response = await this.requester(config, controller.signal)

      if (controller.signal.aborted || this.requestVersions.get(dataSourceId) !== requestVersion) {
        return store.get<TData>()
      }

      const data = readResponsePath(response, config.responsePath) as TData
      store.set(data)
      return data
    } catch (requestError) {
      if (controller.signal.aborted || this.requestVersions.get(dataSourceId) !== requestVersion) {
        return store.get<TData>()
      }

      const error = toError(requestError)
      store.setError(error)
      throw error
    } finally {
      if (this.requestControllers.get(dataSourceId) === controller) {
        this.requestControllers.delete(dataSourceId)
      }
    }
  }

  startPolling(dataSourceId: string): boolean {
    if (this.pollingTimers.has(dataSourceId)) return false

    const source = this.getApiSource(dataSourceId)
    const config = source.getConfig() as ApiDataSourceConfig
    const polling = config.polling ?? 0

    if (polling <= 0) return false

    const timer = setInterval(() => {
      void this.request(dataSourceId).catch(() => undefined)
    }, polling)

    this.pollingTimers.set(dataSourceId, timer)
    this.publishSources()
    return true
  }

  stopPolling(dataSourceId: string): boolean {
    const timer = this.pollingTimers.get(dataSourceId)
    if (!timer) return false

    clearInterval(timer)
    this.pollingTimers.delete(dataSourceId)
    this.publishSources()
    return true
  }

  remove(dataSourceId: string): boolean {
    if (!this.sources.has(dataSourceId)) return false

    this.stopPolling(dataSourceId)
    this.abortRequest(dataSourceId)
    this.storeSubscriptions.get(dataSourceId)?.()
    this.storeSubscriptions.delete(dataSourceId)
    this.dataSubscriptions.get(dataSourceId)?.forEach((unsubscribe) => unsubscribe())
    this.dataSubscriptions.delete(dataSourceId)
    this.stores.get(dataSourceId)?.destroy()
    this.stores.delete(dataSourceId)
    this.sources.delete(dataSourceId)
    this.requestVersions.delete(dataSourceId)
    this.publishSources()
    return true
  }

  destroy(): void {
    ;[...this.sources.keys()].forEach((dataSourceId) => this.remove(dataSourceId))
    this.sourceListeners.clear()
  }

  private getSource<TData = unknown>(dataSourceId: string): DataSource<TData> {
    const source = this.sources.get(dataSourceId)
    if (!source) {
      throw new Error(`Data source with id "${dataSourceId}" is not registered.`)
    }

    return source as DataSource<TData>
  }

  private getApiSource(dataSourceId: string): DataSource {
    const source = this.getSource(dataSourceId)
    if (source.type !== 'api') {
      throw new Error(`Data source with id "${dataSourceId}" is not an API data source.`)
    }

    return source
  }

  private getStore(dataSourceId: string): DataStore {
    const store = this.stores.get(dataSourceId)
    if (!store) {
      throw new Error(`Data source with id "${dataSourceId}" is not registered.`)
    }

    return store
  }

  private abortRequest(dataSourceId: string): void {
    this.requestControllers.get(dataSourceId)?.abort()
    this.requestControllers.delete(dataSourceId)
  }

  private publishSources(): void {
    const sources = this.getSources()
    this.sourceListeners.forEach((listener) => listener(sources))
  }
}

function readResponsePath(response: unknown, responsePath?: string): unknown {
  if (!responsePath?.trim()) return response

  const segments = responsePath
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)

  let value = response

  for (const segment of segments) {
    if (value === null || typeof value !== 'object' || !(segment in value)) {
      throw new Error(`Response path "${responsePath}" does not exist.`)
    }

    value = (value as Record<string, unknown>)[segment]
  }

  return value
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : 'API request failed.')
}

function assertUuid(id: string, entityName: string): void {
  if (!UUID_PATTERN.test(id)) {
    throw new Error(`${entityName} id "${id}" must be a UUID.`)
  }
}
