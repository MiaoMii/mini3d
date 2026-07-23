import type { DataRequestParams, DataStoreListener, DataStoreSnapshot } from './types'

export class DataStore {
  readonly id: string

  private data: unknown
  private status: DataStoreSnapshot['status'] = 'idle'
  private error: Error | undefined
  private updatedAt: number | undefined
  private params: DataRequestParams
  private readonly listeners = new Set<DataStoreListener>()

  /**
   * 创建数据存储实例。
   */
  constructor(id: string, params: DataRequestParams = {}) {
    this.id = id
    this.params = { ...params }
  }

  /**
   * 获取当前存储的数据。
   */
  get<TData = unknown>(): TData | undefined {
    return this.data as TData | undefined
  }

  /**
   * 获取当前存储状态的独立快照。
   */
  getSnapshot<TData = unknown>(): DataStoreSnapshot<TData> {
    return {
      id: this.id,
      data: this.data as TData | undefined,
      status: this.status,
      error: this.error,
      updatedAt: this.updatedAt,
      params: { ...this.params }
    }
  }

  /**
   * 写入数据并将存储状态标记为成功。
   */
  set<TData>(data: TData): void {
    this.data = data
    this.status = 'success'
    this.error = undefined
    this.updatedAt = Date.now()
    this.publish()
  }

  /**
   * 将数据存储标记为加载中。
   */
  setLoading(): void {
    this.status = 'loading'
    this.error = undefined
    this.publish()
  }

  /**
   * 记录请求错误并更新存储状态。
   */
  setError(error: Error): void {
    this.status = 'error'
    this.error = error
    this.publish()
  }

  /**
   * 合并数据请求参数并触发对应状态更新。
   */
  updateParams(params: DataRequestParams): void {
    this.params = { ...this.params, ...params }
    this.publish()
  }

  /**
   * 订阅存储状态变化，并立即接收当前快照。
   */
  subscribe<TData>(listener: DataStoreListener<TData>): () => void {
    const storedListener = listener as DataStoreListener

    this.listeners.add(storedListener)
    listener(this.getSnapshot())

    return () => this.listeners.delete(storedListener)
  }

  /**
   * 取消存储状态监听器。
   */
  unsubscribe<TData>(listener: DataStoreListener<TData>): void {
    this.listeners.delete(listener as DataStoreListener)
  }

  /**
   * 释放数据存储持有的资源。
   */
  destroy(): void {
    this.listeners.clear()
  }

  /**
   * 向订阅者发布最新的数据存储快照。
   */
  private publish(): void {
    const snapshot = this.getSnapshot()
    this.listeners.forEach((listener) => listener(snapshot))
  }
}
