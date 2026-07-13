import {
  BoxGeometry,
  Color,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  type ColorRepresentation,
  type Vector3Tuple
} from 'three'
import { gsap } from 'gsap'
import type { EngineContext, IModule, TickInfo } from '../../core'
import type { CubeModuleConfig } from './index'

const DEFAULT_CONFIG: Required<Omit<CubeModuleConfig, 'id'>> = {
  name: 'cube',
  size: 1,
  color: '#00aaff',
  position: [0, 0, 0],
  renderOrder: 0,
  rotateSpeed: [0, 0.8, 0],
  transitionDuration: 0.35,
  transitionEase: 'power2.out'
}

export class CubeModule implements IModule<CubeModuleConfig> {
  readonly id: string
  readonly name: string
  readonly order = 0
  readonly config: Required<Omit<CubeModuleConfig, 'id'>>

  private cube: Mesh<BoxGeometry, MeshBasicMaterial> | null = null
  private running = false

  constructor(config: CubeModuleConfig = {}) {
    this.id = config.id ?? MathUtils.generateUUID()
    this.config = {
      name: config.name ?? DEFAULT_CONFIG.name,
      size: config.size ?? DEFAULT_CONFIG.size,
      color: config.color ?? DEFAULT_CONFIG.color,
      position: config.position ?? DEFAULT_CONFIG.position,
      renderOrder: config.renderOrder ?? DEFAULT_CONFIG.renderOrder,
      rotateSpeed: config.rotateSpeed ?? DEFAULT_CONFIG.rotateSpeed,
      transitionDuration: config.transitionDuration ?? DEFAULT_CONFIG.transitionDuration,
      transitionEase: config.transitionEase ?? DEFAULT_CONFIG.transitionEase
    }
    this.name = this.config.name
  }

  init(context: EngineContext): void {
    if (this.cube) return

    const geometry = new BoxGeometry(1, 1, 1)
    const material = new MeshBasicMaterial({ color: this.config.color })
    const cube = new Mesh(geometry, material)

    cube.name = this.config.name
    cube.position.fromArray(this.config.position)
    cube.scale.setScalar(this.config.size)
    cube.renderOrder = this.config.renderOrder

    this.cube = cube
    context.scene.add(cube)
  }

  start(): void {
    this.running = true

    if (this.cube) {
      this.cube.visible = true
    }
  }

  update(tick: TickInfo): void {
    if (!this.running || !this.cube) return

    const [x, y, z] = this.config.rotateSpeed

    this.cube.rotation.x += x * tick.delta
    this.cube.rotation.y += y * tick.delta
    this.cube.rotation.z += z * tick.delta
  }

  updateConfig(config: Partial<CubeModuleConfig>): void {
    const hasColor = config.color !== undefined
    const hasPosition = config.position !== undefined
    const hasSize = config.size !== undefined
    const nextSize = config.size ?? this.config.size
    const nextColor = config.color ?? this.config.color
    const nextPosition = config.position ?? this.config.position
    const nextDuration = config.transitionDuration ?? this.config.transitionDuration
    const nextEase = config.transitionEase ?? this.config.transitionEase

    this.config.name = config.name ?? this.config.name
    this.config.size = nextSize
    this.config.color = nextColor
    this.config.position = nextPosition
    this.config.renderOrder = config.renderOrder ?? this.config.renderOrder
    this.config.rotateSpeed = config.rotateSpeed ?? this.config.rotateSpeed
    this.config.transitionDuration = nextDuration
    this.config.transitionEase = nextEase

    if (!this.cube) return

    this.cube.name = this.config.name
    this.cube.renderOrder = this.config.renderOrder

    if (hasPosition) {
      const [x, y, z] = nextPosition

      gsap.killTweensOf(this.cube.position)
      gsap.to(this.cube.position, {
        x,
        y,
        z,
        duration: nextDuration,
        ease: nextEase
      })
    }

    if (hasColor) {
      const color = new Color(nextColor)

      gsap.killTweensOf(this.cube.material.color)
      gsap.to(this.cube.material.color, {
        r: color.r,
        g: color.g,
        b: color.b,
        duration: nextDuration,
        ease: nextEase
      })
    }

    if (hasSize) {
      gsap.killTweensOf(this.cube.scale)
      gsap.to(this.cube.scale, {
        x: nextSize,
        y: nextSize,
        z: nextSize,
        duration: nextDuration,
        ease: nextEase
      })
    }
  }

  stop(): void {
    this.running = false
  }

  destroy(context: EngineContext): void {
    if (!this.cube) return

    gsap.killTweensOf(this.cube.position)
    gsap.killTweensOf(this.cube.scale)
    gsap.killTweensOf(this.cube.material.color)

    context.scene.remove(this.cube)
    this.cube.geometry.dispose()
    this.cube.material.dispose()
    this.cube = null
    this.running = false
  }
}
