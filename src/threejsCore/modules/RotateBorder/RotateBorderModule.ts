import { MathUtils } from 'three'
import type { EngineContext, IModule, TickInfo } from '../../core'
import { diff } from '../../utils/diff'
import { DEFAULT_MODULE_CONFIG } from './config'
import type { RotateBorderConfig, ResolvedRotateBorderConfig } from './config'
import { cloneDeep } from 'lodash'
import * as THREE from 'three'
import rotationBorderBg1 from './images/rotationBorder1.png'

type ConfigKey = Extract<keyof RotateBorderConfig, string>



export class RotateBorderModule implements IModule<RotateBorderConfig> {
  readonly id: string
  readonly name: string
  readonly order = 0
  readonly type = 'HelperTool'
  readonly config: ResolvedRotateBorderConfig

  private context: EngineContext | null = null
  private instance: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null
  private texture: THREE.Texture | null = null
  private appliedConfig: ResolvedRotateBorderConfig
  private readonly pendingConfigKeys = new Set<ConfigKey>()
  private running = false
  private resolveResourceUrl(url: string): string {
    if (/^(https?:|data:|blob:)/i.test(url)) return url

    const baseUrl = String(import.meta.env.VITE_IMAGE_URL ?? '').replace(/\/$/, '')
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`
    return `${baseUrl}${normalizedUrl}`
  }
  constructor(config: RotateBorderConfig = {}) {
    this.id = config.id ?? MathUtils.generateUUID()
    this.config = {
      name: config.name ?? DEFAULT_MODULE_CONFIG.name,
      size: config.size ?? DEFAULT_MODULE_CONFIG.size,
      visible: config.visible ?? DEFAULT_MODULE_CONFIG.visible,
      rotateSpeed: config.rotateSpeed ?? DEFAULT_MODULE_CONFIG.rotateSpeed,
      imageUrl: config.imageUrl ?? DEFAULT_MODULE_CONFIG.imageUrl,
      color: config.color ?? DEFAULT_MODULE_CONFIG.color,
      opacity: config.opacity ?? DEFAULT_MODULE_CONFIG.opacity,
      position: config.position ?? DEFAULT_MODULE_CONFIG.position,
      renderOrder: config.renderOrder ?? DEFAULT_MODULE_CONFIG.renderOrder,
      transitionDuration: config.transitionDuration ?? DEFAULT_MODULE_CONFIG.transitionDuration,
      transitionEase: config.transitionEase ?? DEFAULT_MODULE_CONFIG.transitionEase
    }
    this.appliedConfig = cloneDeep(this.config)
    this.name = this.config.name
  }

  init(context: EngineContext): void {
    if (this.instance) return
    this.context = context
    const loader = new THREE.TextureLoader()
    const imageSrc = this.config.imageUrl ? this.resolveResourceUrl(this.config.imageUrl) : rotationBorderBg1
    this.texture = loader.load(imageSrc)
    this.texture.colorSpace = THREE.SRGBColorSpace

    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: this.config.opacity,
      color: new THREE.Color(this.config.color),
      side: THREE.DoubleSide,
      depthWrite: false
    })

    const geometry = new THREE.PlaneGeometry(...this.config.size)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.renderOrder = this.config.renderOrder

    const [x, y, z] = this.config.position
    mesh.position.set(x, y, z)
    mesh.visible = this.config.visible
    mesh.name = this.config.name

    this.instance = mesh
    context.scene.add(mesh)

    this.appliedConfig = cloneDeep(this.config)
    this.pendingConfigKeys.clear()
  }

  async start(): Promise<void> {
    this.running = true
    if (!this.instance) return
    this.instance.visible = this.config.visible
  }

  update(tick: TickInfo): void {
    if (!this.config.rotateSpeed) this.config.rotateSpeed = 0
    if (this.instance && this.running && this.config.visible) {
      const dt = (tick as any).delta ?? (tick as any).deltaTime ?? (tick as any).dt ?? 0.016
      this.instance.rotation.z += this.config.rotateSpeed * dt
    }

    this.commitPendingConfigChanges()
  }

  updateConfig(config: Partial<RotateBorderConfig>): void {
    Object.assign(this.config, {
      ...config,
      imageUrl: config.imageUrl ?? this.config.imageUrl
    })

    const configChanges = diff(this.appliedConfig, this.config)

    this.pendingConfigKeys.clear()
    Object.keys(configChanges).forEach((key) => {
      this.pendingConfigKeys.add(key as ConfigKey)
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
    this.instance.geometry.dispose()
    this.instance.material.dispose()
    this.texture?.dispose()

    this.texture = null
    this.instance = null
    this.context = null
    this.pendingConfigKeys.clear()
    this.running = false
  }

  private commitPendingConfigChanges(): void {
    if (!this.instance || this.pendingConfigKeys.size === 0) return

    if (this.pendingConfigKeys.has('size')) {
      this.instance.geometry.dispose()
      this.instance.geometry = new THREE.PlaneGeometry(...this.config.size)
    }

    if (this.pendingConfigKeys.has('imageUrl')) {
      const loader = new THREE.TextureLoader()
      const imageSrc = this.resolveResourceUrl(this.config.imageUrl) || rotationBorderBg1
      const nextTexture = loader.load(imageSrc)
      nextTexture.colorSpace = THREE.SRGBColorSpace

      this.texture?.dispose()
      this.texture = nextTexture
      this.instance.material.map = nextTexture
      this.instance.material.needsUpdate = true
    }

    if (this.pendingConfigKeys.has('color')) {
      this.instance.material.color.set(this.config.color)
    }

    if (this.pendingConfigKeys.has('opacity')) {
      this.instance.material.opacity = this.config.opacity
    }

    if (this.pendingConfigKeys.has('position')) {
      const [x, y, z] = this.config.position
      this.instance.position.set(x, y, z)
    }

    if (this.pendingConfigKeys.has('visible')) {
      this.instance.visible = this.config.visible
    }

    if (this.pendingConfigKeys.has('renderOrder')) {
      this.instance.renderOrder = this.config.renderOrder
    }

    if (this.pendingConfigKeys.has('name')) {
      this.instance.name = this.config.name
    }

    this.appliedConfig = cloneDeep(this.config)
    this.pendingConfigKeys.clear()
  }
}