import type { ApiDataSourceConfig, DataSourceConfig, StaticDataSourceConfig } from './types'

export class DataSource<TData = unknown> {
  private config: DataSourceConfig<TData>

  /**
   * 创建数据源实例。
   */
  constructor(registration: DataSourceConfig<TData>) {
    this.config = this.resolveConfig(registration)
  }

  /**
   * 获取数据源标识。
   */
  get id(): string {
    return this.config.id
  }

  /**
   * 获取数据源类型。
   */
  get type(): DataSourceConfig['type'] {
    return this.config.type
  }

  /**
   * 获取数据源配置的独立副本。
   */
  getConfig(): DataSourceConfig<TData> {
    return structuredClone(this.config)
  }

  /**
   * 校验并应用数据源配置变更。
   */
  update(patch: Partial<DataSourceConfig<TData>>): void {
    if (patch.id && patch.id !== this.id) {
      throw new Error('Data source id cannot be changed.')
    }

    if (patch.type && patch.type !== this.type) {
      throw new Error('Data source type cannot be changed.')
    }

    if (this.config.type === 'static') {
      this.config = {
        ...this.config,
        ...(patch as Partial<StaticDataSourceConfig<TData>>),
        id: this.id,
        type: 'static'
      }
      return
    }

    const apiPatch = patch as Partial<ApiDataSourceConfig>

    this.config = {
      ...this.config,
      ...apiPatch,
      id: this.id,
      type: 'api',
      params: apiPatch.params ? { ...apiPatch.params } : this.config.params,
      headers: apiPatch.headers ? { ...apiPatch.headers } : this.config.headers
    }
  }

  /**
   * 合并并校验数据源配置。
   */
  private resolveConfig(registration: DataSourceConfig<TData>): DataSourceConfig<TData> {
    if (registration.type === 'static') {
      return {
        ...registration,
        type: 'static'
      }
    }

    return {
      ...registration,
      type: 'api',
      method: registration.method ?? 'GET',
      params: { ...registration.params },
      headers: { ...registration.headers },
      polling: registration.polling ?? 0,
      autoRequest: registration.autoRequest ?? true
    }
  }
}
