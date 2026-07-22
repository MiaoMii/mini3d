import type { DataRequestParams, DataStoreListener, DataStoreSnapshot } from './types'

export class DataStore {
  readonly id: string

  private data: unknown
  private status: DataStoreSnapshot['status'] = 'idle'
  private error: Error | undefined
  private updatedAt: number | undefined
  private params: DataRequestParams
  private readonly listeners = new Set<DataStoreListener>()

  constructor(id: string, params: DataRequestParams = {}) {
    this.id = id
    this.params = { ...params }
  }

  get<TData = unknown>(): TData | undefined {
    return this.data as TData | undefined
  }

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

  set<TData>(data: TData): void {
    this.data = data
    this.status = 'success'
    this.error = undefined
    this.updatedAt = Date.now()
    this.publish()
  }

  setLoading(): void {
    this.status = 'loading'
    this.error = undefined
    this.publish()
  }

  setError(error: Error): void {
    this.status = 'error'
    this.error = error
    this.publish()
  }

  updateParams(params: DataRequestParams): void {
    this.params = { ...this.params, ...params }
    this.publish()
  }

  subscribe<TData>(listener: DataStoreListener<TData>): () => void {
    const storedListener = listener as DataStoreListener

    this.listeners.add(storedListener)
    listener(this.getSnapshot())

    return () => this.listeners.delete(storedListener)
  }

  unsubscribe<TData>(listener: DataStoreListener<TData>): void {
    this.listeners.delete(listener as DataStoreListener)
  }

  destroy(): void {
    this.listeners.clear()
  }

  private publish(): void {
    const snapshot = this.getSnapshot()
    this.listeners.forEach((listener) => listener(snapshot))
  }
}
