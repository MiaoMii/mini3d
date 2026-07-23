import { BoxGeometry, Color, MathUtils, Mesh, MeshBasicMaterial } from 'three'
import { gsap } from 'gsap'
import type { EngineContext, IModule, TickInfo } from '../../core'
import { diff } from '../../utils/diff'
import { DEFAULT_CUBE_MODULE_CONFIG } from './config'
import type { CubeModuleConfig, ResolvedCubeModuleConfig } from './config'
import { cloneDeep } from 'lodash'

type CubeConfigKey = Extract<keyof ResolvedCubeModuleConfig, string>

export class CubeModule implements IModule<CubeModuleConfig> {
  readonly id: string
  dataSourceId?: string
  readonly name: string
  readonly order = 0
  readonly type = 'BusinessView'
  readonly config: ResolvedCubeModuleConfig

  private instance: Mesh<BoxGeometry, MeshBasicMaterial> | null = null
  private lifecycleAnimation: gsap.core.Timeline | null = null
  private appliedConfig: ResolvedCubeModuleConfig
  private readonly pendingConfigKeys = new Set<CubeConfigKey>()
  private readonly updatepdatesByConfigKey: Partial<Record<CubeConfigKey, () => void>> = {
    name: this.updateName,
    size: this.updateSize,
    color: this.updateColor,
    position: this.updatePosition,
    visible: this.updateVisibility,
    renderOrder: this.updateRenderOrder
  }
  private running = false

  /**
   * 创建立方体模块实例。
   */
  constructor(config: CubeModuleConfig = {}) {
    this.id = config.id ?? MathUtils.generateUUID()
    this.dataSourceId = config.dataSourceId
    this.config = {
      name: config.name ?? DEFAULT_CUBE_MODULE_CONFIG.name,
      size: config.size ?? DEFAULT_CUBE_MODULE_CONFIG.size,
      color: config.color ?? DEFAULT_CUBE_MODULE_CONFIG.color,
      position: config.position ?? DEFAULT_CUBE_MODULE_CONFIG.position,
      visible: config.visible ?? DEFAULT_CUBE_MODULE_CONFIG.visible,
      renderOrder: config.renderOrder ?? DEFAULT_CUBE_MODULE_CONFIG.renderOrder,
      rotateSpeed: config.rotateSpeed ?? DEFAULT_CUBE_MODULE_CONFIG.rotateSpeed,
      transitionDuration:
        config.transitionDuration ?? DEFAULT_CUBE_MODULE_CONFIG.transitionDuration,
      transitionEase: config.transitionEase ?? DEFAULT_CUBE_MODULE_CONFIG.transitionEase,
      enterAnimation: {
        ...DEFAULT_CUBE_MODULE_CONFIG.enterAnimation,
        ...config.enterAnimation
      },
      leaveAnimation: {
        ...DEFAULT_CUBE_MODULE_CONFIG.leaveAnimation,
        ...config.leaveAnimation
      }
    }
    this.appliedConfig = cloneDeep(this.config)
    this.name = this.config.name
  }

  /**
   * 初始化立方体模块所需资源。
   */
  init(context: EngineContext): void {
    if (this.instance) return

    const geometry = new BoxGeometry(1, 1, 1)
    const material = new MeshBasicMaterial({
      color: this.config.color,
      transparent: true
    })
    const cube = new Mesh(geometry, material)

    cube.name = this.config.name
    cube.position.fromArray(this.config.position)
    cube.scale.setScalar(this.config.size)
    cube.visible = this.config.visible
    cube.renderOrder = this.config.renderOrder

    this.instance = cube
    context.scene.add(cube)
    this.appliedConfig = cloneDeep(this.config)
    this.pendingConfigKeys.clear()
  }

  /**
   * 启动立方体模块。
   */
  async start(): Promise<void> {
    this.running = true

    if (!this.instance) return

    this.instance.visible = this.config.visible
    this.instance.scale.setScalar(this.config.size)
    this.instance.material.opacity = 1

    if (!this.config.visible || !this.config.enterAnimation.enabled) return

    const { startScale, startOpacity, duration, ease } = this.config.enterAnimation

    this.instance.scale.setScalar(startScale)
    this.instance.material.opacity = startOpacity

    await this.playLifecycleAnimation(this.config.size, 1, duration, ease)
  }

  /**
   * 更新立方体模块的运行状态。
   */
  update(tick: TickInfo): void {
    this.commitPendingConfigChanges()

    if (!this.running || !this.instance) return

    const [x, y, z] = this.config.rotateSpeed

    this.instance.rotation.x += x * tick.delta
    this.instance.rotation.y += y * tick.delta
    this.instance.rotation.z += z * tick.delta
  }

  /**
   * 应用立方体模块的配置变更。
   */
  updateConfig(config: Partial<CubeModuleConfig>): void {
    const nextConfig: ResolvedCubeModuleConfig = {
      name: config.name ?? this.config.name,
      size: config.size ?? this.config.size,
      color: config.color ?? this.config.color,
      position: config.position ?? this.config.position,
      visible: config.visible ?? this.config.visible,
      renderOrder: config.renderOrder ?? this.config.renderOrder,
      rotateSpeed: config.rotateSpeed ?? this.config.rotateSpeed,
      transitionDuration: config.transitionDuration ?? this.config.transitionDuration,
      transitionEase: config.transitionEase ?? this.config.transitionEase,
      enterAnimation: {
        ...this.config.enterAnimation,
        ...config.enterAnimation
      },
      leaveAnimation: {
        ...this.config.leaveAnimation,
        ...config.leaveAnimation
      }
    }

    Object.assign(this.config, nextConfig)

    const configChanges = diff(this.appliedConfig, this.config)

    this.pendingConfigKeys.clear()
    Object.keys(configChanges).forEach((key) => {
      this.pendingConfigKeys.add(key as CubeConfigKey)
    })
  }

  /**
   * 将数据源的新数据应用到立方体模块。
   */
  onDataChange(data: unknown): void {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return

    const source = data as Record<string, unknown>
    const config: Partial<CubeModuleConfig> = {}

    if (typeof source.name === 'string') config.name = source.name
    if (typeof source.size === 'number' && Number.isFinite(source.size)) config.size = source.size
    if (typeof source.color === 'string' || typeof source.color === 'number') {
      config.color = source.color
    }
    if (typeof source.visible === 'boolean') config.visible = source.visible
    if (typeof source.renderOrder === 'number' && Number.isFinite(source.renderOrder)) {
      config.renderOrder = source.renderOrder
    }
    if (
      Array.isArray(source.position) &&
      source.position.length === 3 &&
      source.position.every((coordinate) => typeof coordinate === 'number')
    ) {
      config.position = source.position as [number, number, number]
    }
    if (
      Array.isArray(source.rotateSpeed) &&
      source.rotateSpeed.length === 3 &&
      source.rotateSpeed.every((speed) => typeof speed === 'number')
    ) {
      config.rotateSpeed = source.rotateSpeed as [number, number, number]
    }

    if (Object.keys(config).length > 0) {
      this.updateConfig(config)
    }
  }

  /**
   * 停止立方体模块。
   */
  async stop(): Promise<void> {
    this.running = false

    if (!this.instance) return

    if (!this.instance.visible || !this.config.leaveAnimation.enabled) {
      this.instance.visible = false
      return
    }

    const { endScale, endOpacity, duration, ease } = this.config.leaveAnimation

    await this.playLifecycleAnimation(endScale, endOpacity, duration, ease)
    this.instance.visible = false
  }

  /**
   * 释放立方体模块持有的资源。
   */
  destroy(context: EngineContext): void {
    if (!this.instance) return

    this.lifecycleAnimation?.kill()
    gsap.killTweensOf(this.instance.position)
    gsap.killTweensOf(this.instance.scale)
    gsap.killTweensOf(this.instance.material)
    gsap.killTweensOf(this.instance.material.color)

    context.scene.remove(this.instance)
    this.instance.geometry.dispose()
    this.instance.material.dispose()
    this.instance = null
    this.lifecycleAnimation = null
    this.pendingConfigKeys.clear()
    this.running = false
  }

  /**
   * 提交待处理的配置变更并更新场景对象。
   */
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

  /**
   * 更新模块名称。
   */
  private updateName(): void {
    if (!this.instance) return

    this.instance.name = this.config.name
  }

  /**
   * 更新场景对象的渲染顺序。
   */
  private updateRenderOrder(): void {
    if (!this.instance) return

    this.instance.renderOrder = this.config.renderOrder
  }

  /**
   * 更新场景对象的可见性。
   */
  private updateVisibility(): void {
    if (!this.instance) return

    this.instance.visible = this.config.visible
  }

  /**
   * 更新场景对象的位置。
   */
  private updatePosition(): void {
    if (!this.instance) return

    const [x, y, z] = this.config.position

    gsap.killTweensOf(this.instance.position)
    gsap.to(this.instance.position, {
      x,
      y,
      z,
      duration: this.config.transitionDuration,
      ease: this.config.transitionEase
    })
  }

  /**
   * 更新场景对象的颜色。
   */
  private updateColor(): void {
    if (!this.instance) return

    const color = new Color(this.config.color)

    gsap.killTweensOf(this.instance.material.color)
    gsap.to(this.instance.material.color, {
      r: color.r,
      g: color.g,
      b: color.b,
      duration: this.config.transitionDuration,
      ease: this.config.transitionEase
    })
  }

  /**
   * 更新场景对象的尺寸。
   */
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

  /**
   * 播放模块进入或离开场景的生命周期动画。
   */
  private playLifecycleAnimation(
    scale: number,
    opacity: number,
    duration: number,
    ease: string
  ): Promise<void> {
    if (!this.instance) return Promise.resolve()

    const cube = this.instance

    this.lifecycleAnimation?.kill()

    if (duration <= 0) {
      cube.scale.setScalar(scale)
      cube.material.opacity = opacity
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      /**
       * 结束生命周期动画并释放时间线引用。
       */
      const finishAnimation = () => {
        if (this.lifecycleAnimation === animation) {
          this.lifecycleAnimation = null
        }

        resolve()
      }

      const animation = gsap.timeline({
        onComplete: finishAnimation,
        onInterrupt: finishAnimation
      })
      this.lifecycleAnimation = animation

      animation
        .to(
          cube.scale,
          {
            x: scale,
            y: scale,
            z: scale,
            duration,
            ease
          },
          0
        )
        .to(
          cube.material,
          {
            opacity,
            duration,
            ease
          },
          0
        )
    })
  }
}
