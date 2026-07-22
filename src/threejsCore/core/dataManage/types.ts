export type DataStatus = 'idle' | 'loading' | 'success' | 'error'
export type DataSourceType = 'static' | 'api'
export type DataRequestMethod = 'GET' | 'POST'
export type DataRequestParams = Record<string, unknown>

export interface BaseDataSourceConfig {
  id: string
  name?: string
  type: DataSourceType
}

export interface StaticDataSourceConfig<TData = unknown> extends BaseDataSourceConfig {
  type: 'static'
  data?: TData
}

export interface ApiDataSourceConfig extends BaseDataSourceConfig {
  type: 'api'
  url?: string
  method?: DataRequestMethod
  params?: DataRequestParams
  body?: unknown
  headers?: Record<string, string>
  responsePath?: string
  polling?: number
  autoRequest?: boolean
}

export type DataSourceConfig<TData = unknown> = StaticDataSourceConfig<TData> | ApiDataSourceConfig

export interface DataStoreSnapshot<TData = unknown> {
  id: string
  data: TData | undefined
  status: DataStatus
  error: Error | undefined
  updatedAt: number | undefined
  params: DataRequestParams
}

export interface DataResourceSnapshot<TData = unknown> {
  source: DataSourceConfig<TData>
  store: DataStoreSnapshot<TData>
  polling: boolean
}

export type DataStoreListener<TData = unknown> = (snapshot: DataStoreSnapshot<TData>) => void

export type DataListener<TData = unknown> = (
  data: TData,
  snapshot: DataStoreSnapshot<TData>
) => void

export type DataSourceListener = (sources: readonly DataResourceSnapshot[]) => void

export type DataRequester = (config: ApiDataSourceConfig, signal: AbortSignal) => Promise<unknown>
