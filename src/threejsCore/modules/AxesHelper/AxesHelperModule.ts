import { Color, MathUtils, AxesHelper } from 'three'
import { gsap } from 'gsap'
import type { EngineContext, IModule, TickInfo } from '../../core'
import { diff } from '../../utils/diff'
import { DEFAULT_MODULE_CONFIG } from './config'
import type { AxesHelperConfig, ResolvedAxesHelperConfig } from './config'
import { cloneDeep } from 'lodash'

type ConfigKey = Extract<keyof AxesHelperConfig, string>

export class AxesHelperModule implements IModule<AxesHelperConfig> {
  readonly id: string
  readonly name: string
  readonly order = 0
  readonly type = 'HelperTool'
  readonly config: ResolvedAxesHelperConfig

  private instance: AxesHelper | null = null
  private appliedConfig: ResolvedAxesHelperConfig
  private readonly pendingConfigKeys = new Set<ConfigKey>()
  private readonly updatepdatesByConfigKey: Partial<Record<ConfigKey, () => void>> = {
    name: this.updateName,
    size: this.updateSize,
    visible: this.updateVisibility,
    renderOrder: this.updateRenderOrder,
    xAxisColor: this.updateColor,
    yAxisColor: this.updateColor,
    zAxisColor: this.updateColor
  }
  private running = false

  constructor(config: AxesHelperConfig = {}) {
    this.id = config.id ?? MathUtils.generateUUID()
    this.config = {
      name: config.name ?? DEFAULT_MODULE_CONFIG.name,
      size: config.size ?? DEFAULT_MODULE_CONFIG.size,
      visible: config.visible ?? DEFAULT_MODULE_CONFIG.visible,
      renderOrder: config.renderOrder ?? DEFAULT_MODULE_CONFIG.renderOrder,
      xAxisColor: config.xAxisColor ?? DEFAULT_MODULE_CONFIG.xAxisColor,
      yAxisColor: config.yAxisColor ?? DEFAULT_MODULE_CONFIG.yAxisColor,
      zAxisColor: config.zAxisColor ?? DEFAULT_MODULE_CONFIG.zAxisColor,
      transitionDuration: config.transitionDuration ?? DEFAULT_MODULE_CONFIG.transitionDuration,
      transitionEase: config.transitionEase ?? DEFAULT_MODULE_CONFIG.transitionEase
    }
    this.appliedConfig = cloneDeep(this.config)
    this.name = this.config.name
  }

  init(context: EngineContext): void {
    if (this.instance) return

    this.instance = new AxesHelper(this.config.size)
    this.instance.setColors(
      new Color(this.config.xAxisColor),
      new Color(this.config.yAxisColor),
      new Color(this.config.zAxisColor)
    )

    this.instance.name = this.config.name
    this.instance.visible = this.config.visible
    this.instance.renderOrder = this.config.renderOrder

    // this.instance = cube
    context.scene.add(this.instance)
    this.appliedConfig = cloneDeep(this.config)
    this.pendingConfigKeys.clear()
  }

  async start(): Promise<void> {
    this.running = true

    if (!this.instance) return

    this.instance.visible = this.config.visible
  }

  update(tick: TickInfo): void {
    this.commitPendingConfigChanges()
  }

  updateConfig(config: Partial<AxesHelperConfig>): void {
    const nextConfig: AxesHelperConfig = {
      name: config.name ?? this.config.name,
      size: config.size ?? this.config.size,
      xAxisColor: config.xAxisColor ?? this.config.xAxisColor,
      yAxisColor: config.yAxisColor ?? this.config.yAxisColor,
      zAxisColor: config.zAxisColor ?? this.config.zAxisColor,
      visible: config.visible ?? this.config.visible,
      renderOrder: config.renderOrder ?? this.config.renderOrder,
      transitionDuration: config.transitionDuration ?? this.config.transitionDuration,
      transitionEase: config.transitionEase ?? this.config.transitionEase
    }

    Object.assign(this.config, nextConfig)

    const configChanges = diff(this.appliedConfig, this.config)

    this.pendingConfigKeys.clear()
    Object.keys(configChanges).forEach((key) => {
      this.pendingConfigKeys.add(key as CubeConfigKey)
    })
  }

  async stop(): Promise<void> {
    this.running = false
    if (!this.instance) return
    this.instance.visible = false
  }

  destroy(context: EngineContext): void {
    if (!this.instance) return

    context.scene.remove(this.instance)
    this.instance.dispose()
    this.instance = null
    this.pendingConfigKeys.clear()
    this.running = false
  }

  private commitPendingConfigChanges(): void {
    if (this.pendingConfigKeys.size === 0) return
    if (this.instance) {
      this.pendingConfigKeys.forEach((key) => {
        this.updatepdatesByConfigKey[key]?.call(this)
      })
    }
    this.appliedConfig = cloneDeep(this.config)
    this.pendingConfigKeys.clear()
  }

  private updateName(): void {
    if (!this.instance) return

    this.instance.name = this.config.name
  }

  private updateRenderOrder(): void {
    if (!this.instance) return

    this.instance.renderOrder = this.config.renderOrder
  }

  private updateVisibility(): void {
    if (!this.instance) return

    this.instance.visible = this.config.visible
  }

  private updateColor(): void {
    if (!this.instance) return
    this.instance.setColors(
      new Color(this.config.xAxisColor),
      new Color(this.config.yAxisColor),
      new Color(this.config.zAxisColor)
    )
  }

  private updateSize(): void {
    if (!this.instance) return

    gsap.killTweensOf(this.instance.scale)
    gsap.to(this.instance.scale, {
      x: this.config.size,
      y: this.config.size,
      z: this.config.size,
      duration: this.config.transitionDuration,
      ease: this.config.transitionEase
    })
  }
}
