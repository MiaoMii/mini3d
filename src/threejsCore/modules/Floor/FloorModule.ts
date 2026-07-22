import {
  Color,
  MathUtils,
  GridHelper,
  Group,
  Object3D,
  BufferGeometry,
  LineSegments
} from 'three'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { EngineContext, IModule, TickInfo } from '../../core'
import { syncObject3DProperties } from '../syncObject3DProperties'
import { diff } from '../../utils/diff'
import { DEFAULT_MODULE_CONFIG } from './config'
import type { FloorConfig, ResolvedFloorConfig } from './config'
import { cloneDeep } from 'lodash'

type ConfigKey = Extract<keyof FloorConfig, string>

interface BeamState {
  x: number
  z: number
  y: number
  speed: number
  bright: number
}

interface QuadState {
  start: number
  flashStart: number
  dur: number
  peak: number
}

type FrameUpdater = (dt: number) => void

const GRID_KEYS: ConfigKey[] = ['gridSize', 'gridDivision', 'gridColor']
const BASE_KEYS: ConfigKey[] = ['name', 'visible', 'renderOrder', 'transitionDuration', 'transitionEase']
const SHAPE_KEYS: ConfigKey[] = ['shapeSize', 'shapeColor']
const POINT_KEYS: ConfigKey[] = ['pointSize', 'pointColor', 'pointLayout']
const FLASH_KEYS: ConfigKey[] = [
  'flashEnabled',
  'flashColor',
  'flashOpacity',
  'flashDuration',
  'flashConcurrent'
]
const CELL_LINE_KEYS: ConfigKey[] = ['cellLineEnabled', 'cellLineColor', 'cellLineOpacity']
const BEAM_KEYS: ConfigKey[] = [
  'beamEnabled',
  'beamColor',
  'beamHeight',
  'beamLength',
  'beamSpeed',
  'beamWidth',
  'beamConcurrent',
  'beamOpacity'
]

export class GridHelperModule implements IModule<FloorConfig> {
  readonly id: string
  readonly name: string
  readonly order = 0
  readonly type = 'HelperTool'
  readonly config: ResolvedFloorConfig

  private context: EngineContext | null = null
  private root: Group | null = null
  private gridHelper: GridHelper | null = null
  private appliedConfig: ResolvedFloorConfig
  private readonly pendingConfigKeys = new Set<ConfigKey>()

  private shapeObject: Object3D | null = null
  private pointObject: Object3D | null = null
  private cellLineObject: Object3D | null = null
  private beamObject: Object3D | null = null
  private flashObject: Object3D | null = null
  private beamUpdater: FrameUpdater | null = null
  private flashUpdater: FrameUpdater | null = null

  private running = false
  private needsUpdate = false

  constructor(config: FloorConfig = {}) {
    this.id = config.id ?? MathUtils.generateUUID()
    this.config = {
      name: config.name ?? DEFAULT_MODULE_CONFIG.name,
      visible: config.visible ?? DEFAULT_MODULE_CONFIG.visible,
      renderOrder: config.renderOrder ?? DEFAULT_MODULE_CONFIG.renderOrder,
      transitionDuration: config.transitionDuration ?? DEFAULT_MODULE_CONFIG.transitionDuration,
      transitionEase: config.transitionEase ?? DEFAULT_MODULE_CONFIG.transitionEase,
      gridSize: config.gridSize ?? DEFAULT_MODULE_CONFIG.gridSize,
      gridDivision: config.gridDivision ?? DEFAULT_MODULE_CONFIG.gridDivision,
      gridColor: config.gridColor ?? DEFAULT_MODULE_CONFIG.gridColor,
      shapeSize: config.shapeSize ?? DEFAULT_MODULE_CONFIG.shapeSize,
      shapeColor: config.shapeColor ?? DEFAULT_MODULE_CONFIG.shapeColor,
      pointSize: config.pointSize ?? DEFAULT_MODULE_CONFIG.pointSize,
      pointColor: config.pointColor ?? DEFAULT_MODULE_CONFIG.pointColor,
      pointLayout: config.pointLayout ?? DEFAULT_MODULE_CONFIG.pointLayout,
      flashEnabled: config.flashEnabled ?? DEFAULT_MODULE_CONFIG.flashEnabled,
      flashColor: config.flashColor ?? DEFAULT_MODULE_CONFIG.flashColor,
      flashOpacity: config.flashOpacity ?? DEFAULT_MODULE_CONFIG.flashOpacity,
      flashDuration: config.flashDuration ?? DEFAULT_MODULE_CONFIG.flashDuration,
      flashConcurrent: config.flashConcurrent ?? DEFAULT_MODULE_CONFIG.flashConcurrent,
      cellLineEnabled: config.cellLineEnabled ?? DEFAULT_MODULE_CONFIG.cellLineEnabled,
      cellLineColor: config.cellLineColor ?? DEFAULT_MODULE_CONFIG.cellLineColor,
      cellLineOpacity: config.cellLineOpacity ?? DEFAULT_MODULE_CONFIG.cellLineOpacity,
      beamEnabled: config.beamEnabled ?? DEFAULT_MODULE_CONFIG.beamEnabled,
      beamColor: config.beamColor ?? DEFAULT_MODULE_CONFIG.beamColor,
      beamHeight: config.beamHeight ?? DEFAULT_MODULE_CONFIG.beamHeight,
      beamLength: config.beamLength ?? DEFAULT_MODULE_CONFIG.beamLength,
      beamSpeed: config.beamSpeed ?? DEFAULT_MODULE_CONFIG.beamSpeed,
      beamWidth: config.beamWidth ?? DEFAULT_MODULE_CONFIG.beamWidth,
      beamConcurrent: config.beamConcurrent ?? DEFAULT_MODULE_CONFIG.beamConcurrent,
      beamOpacity: config.beamOpacity ?? DEFAULT_MODULE_CONFIG.beamOpacity
    }
    this.appliedConfig = cloneDeep(this.config)
    this.name = this.config.name
  }

  init(context: EngineContext): void {
    if (this.root) return

    this.context = context
    this.root = new Group()
    syncObject3DProperties(this.root, this.config)
    this.root.name = this.config.name

    this.gridHelper = this.createGridHelper()
    this.root.add(this.gridHelper)

    this.shapeObject = this.createShapeObject()
    this.pointObject = this.createPointObject()
    this.cellLineObject = this.config.cellLineEnabled ? this.createCellLineObject() : null

    this.rebuildBeamObject()
    this.rebuildFlashObject()

    if (this.shapeObject) this.root.add(this.shapeObject)
    if (this.pointObject) this.root.add(this.pointObject)
    if (this.cellLineObject) this.root.add(this.cellLineObject)

    this.applyBaseConfig()
    context.scene.add(this.root)

    this.appliedConfig = cloneDeep(this.config)
    this.pendingConfigKeys.clear()
    this.needsUpdate = false
  }

  async start(): Promise<void> {
    this.running = true
    if (!this.root) return
    this.root.visible = this.config.visible
  }

  update(tick: TickInfo): void {
    const dt = this.getDeltaSeconds(tick)

    if (this.running) {
      this.beamUpdater?.(dt)
      this.flashUpdater?.(dt)
    }

    if (this.needsUpdate) {
      this.commitPendingConfigChanges()
    }
  }

  updateConfig(config: Partial<FloorConfig>): void {
    Object.assign(this.config, config)

    const configChanges = diff(this.appliedConfig, this.config)
    this.pendingConfigKeys.clear()

    Object.keys(configChanges).forEach((key) => {
      this.pendingConfigKeys.add(key as ConfigKey)
    })

    this.needsUpdate = this.pendingConfigKeys.size > 0
  }

  async stop(): Promise<void> {
    this.running = false
    if (!this.root) return
    this.root.visible = false
  }

  destroy(context: EngineContext): void {
    if (!this.root) return

    context.scene.remove(this.root)
    this.disposeObjectTree(this.root)

    this.root = null
    this.gridHelper = null
    this.shapeObject = null
    this.pointObject = null
    this.cellLineObject = null
    this.beamObject = null
    this.flashObject = null
    this.beamUpdater = null
    this.flashUpdater = null
    this.context = null
    this.pendingConfigKeys.clear()
    this.running = false
    this.needsUpdate = false
  }

  private commitPendingConfigChanges(): void {
    if (!this.root || !this.pendingConfigKeys.size) return

    if (this.hasChanged(BASE_KEYS)) {
      this.applyBaseConfig()
    }
    if (this.hasChanged(GRID_KEYS)) {
      this.rebuildGridHelper()
    }
    if (this.hasChanged(SHAPE_KEYS)) {
      this.rebuildShapeObject()
    }
    if (this.hasChanged(POINT_KEYS)) {
      this.rebuildPointObject()
    }
    if (this.hasChanged(CELL_LINE_KEYS)) {
      this.rebuildCellLineObject()
    }
    if (this.hasChanged(BEAM_KEYS)) {
      this.rebuildBeamObject()
    }
    if (this.hasChanged(FLASH_KEYS)) {
      this.rebuildFlashObject()
    }

    this.appliedConfig = cloneDeep(this.config)
    this.pendingConfigKeys.clear()
    this.needsUpdate = false
  }

  private applyBaseConfig(): void {
    if (!this.root) return
    syncObject3DProperties(this.root, this.config)
    this.root.name = this.config.name
    this.root.visible = this.config.visible
    this.root.renderOrder = this.config.renderOrder
    this.root.userData.moduleConfig = cloneDeep(this.config)
  }

  private rebuildGridHelper(): void {
    if (!this.root) return

    const next = this.createGridHelper()
    if (this.gridHelper) {
      next.position.copy(this.gridHelper.position)
      next.rotation.copy(this.gridHelper.rotation)
      next.scale.copy(this.gridHelper.scale)
      this.root.remove(this.gridHelper)
      this.gridHelper.dispose()
    }

    this.gridHelper = next
    this.root.add(next)
  }

  private rebuildShapeObject(): void {
    this.replaceChildObject('shapeObject', this.createShapeObject())
  }

  private rebuildPointObject(): void {
    this.replaceChildObject('pointObject', this.createPointObject())
  }

  private rebuildCellLineObject(): void {
    this.replaceChildObject(
      'cellLineObject',
      this.config.cellLineEnabled ? this.createCellLineObject() : null
    )
  }

  private rebuildBeamObject(): void {
    this.beamUpdater = null
    if (!this.config.beamEnabled) {
      this.replaceChildObject('beamObject', null)
      return
    }
    this.replaceChildObject('beamObject', this.createBeamObject())
  }

  private rebuildFlashObject(): void {
    this.flashUpdater = null
    if (!this.config.flashEnabled) {
      this.replaceChildObject('flashObject', null)
      return
    }
    this.replaceChildObject('flashObject', this.createFlashObject())
  }

  private replaceChildObject(
    key: 'shapeObject' | 'pointObject' | 'cellLineObject' | 'beamObject' | 'flashObject',
    next: Object3D | null
  ): void {
    if (!this.root) return

    const current = this[key]
    if (current) {
      this.root.remove(current)
      this.disposeObjectTree(current)
    }

    this[key] = next
    if (next) {
      this.root.add(next)
    }
  }

  private hasChanged(keys: ConfigKey[]): boolean {
    return keys.some((key) => this.pendingConfigKeys.has(key))
  }

  private disposeObjectTree(object: Object3D): void {
    object.traverse((node: any) => {
      if (node.geometry?.dispose) {
        node.geometry.dispose()
      }
      if (Array.isArray(node.material)) {
        node.material.forEach((material: any) => material?.dispose?.())
      } else if (node.material?.dispose) {
        node.material.dispose()
      }
    })
  }

  private getDeltaSeconds(tick: TickInfo): number {
    const anyTick = tick as any
    return anyTick.delta ?? anyTick.deltaTime ?? anyTick.dt ?? 0.016
  }

  private createGridHelper(): GridHelper {
    return new GridHelper(
      this.config.gridSize,
      this.config.gridDivision,
      new Color(this.config.gridColor),
      new Color(this.config.gridColor)
    )
  }

  private createShapeObject(): LineSegments | null {
    const { gridSize, gridDivision, shapeSize, shapeColor } = this.config
    const shapeSpace = gridSize / gridDivision
    const range = gridSize / 2

    const geometries: THREE.BufferGeometry[] = []
    for (let i = 0; i < gridDivision + 1; i++) {
      for (let j = 0; j < gridDivision + 1; j++) {
        const geometry = createPlusGeometry(shapeSize)
        geometry.translate(-range + i * shapeSpace, -range + j * shapeSpace, 0)
        geometries.push(geometry)
      }
    }
    const merged = mergeGeometries(geometries)
    geometries.forEach((g) => g.dispose())

    const material = new THREE.MeshBasicMaterial({ color: shapeColor, side: THREE.DoubleSide })
    const object = new THREE.Mesh(merged, material)
    object.renderOrder = -1
    object.rotateX(-Math.PI / 2)
    object.position.y += 0.01
    return object as unknown as LineSegments
  }

  private createPointObject(): Object3D | null {
    const { gridSize, pointSize, pointColor, pointLayout } = this.config
    const [rows, cols] = pointLayout

    const positions = new Float32Array(rows * cols * 3)
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const index = (i * cols + j) * 3
        positions[index] = rows === 1 ? 0 : (i / (rows - 1)) * gridSize - gridSize / 2
        positions[index + 1] = 0
        positions[index + 2] = cols === 1 ? 0 : (j / (cols - 1)) * gridSize - gridSize / 2
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({
      size: pointSize,
      sizeAttenuation: true,
      color: pointColor,
      blending: THREE.NormalBlending
    })
    return new THREE.Points(geometry, material)
  }

  private createCellLineObject(): Object3D | null {
    const { gridSize, gridDivision, cellLineColor, cellLineOpacity } = this.config
    const cell = gridSize / gridDivision
    const half = cell / 2
    const range = gridSize / 2
    const y = 0.006

    const pos: number[] = []
    for (let gx = 0; gx < gridDivision; gx++) {
      for (let gz = 0; gz < gridDivision; gz++) {
        const cx = -range + gx * cell + half
        const cz = -range + gz * cell + half
        pos.push(cx - half, y, cz, cx + half, y, cz)
        pos.push(cx, y, cz - half, cx, y, cz + half)
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    const material = new THREE.LineBasicMaterial({
      color: cellLineColor,
      transparent: true,
      opacity: cellLineOpacity,
      blending: THREE.NormalBlending,
      depthWrite: false
    })
    const object = new THREE.LineSegments(geometry, material)
    object.renderOrder = -1
    return object
  }

  private createBeamObject(): Object3D | null {
    const {
      gridSize,
      beamColor,
      beamHeight,
      beamLength,
      beamSpeed,
      beamWidth,
      beamConcurrent,
      beamOpacity
    } = this.config

    const range = gridSize / 2
    const spawnBeam = (initial: boolean): BeamState => ({
      x: (Math.random() * 2 - 1) * range,
      z: (Math.random() * 2 - 1) * range,
      y: initial ? Math.random() * beamHeight : 0,
      speed: beamSpeed * (0.7 + Math.random() * 0.6),
      bright: 0.6 + Math.random() * 0.4
    })

    const beams: BeamState[] = []
    for (let n = 0; n < beamConcurrent; n++) beams.push(spawnBeam(true))

    const positions = new Float32Array(beamConcurrent * 6 * 3)
    const colors = new Float32Array(beamConcurrent * 6 * 4)
    const c = new THREE.Color(beamColor)
    for (let i = 0; i < beamConcurrent * 6; i++) {
      colors[i * 4] = c.r
      colors[i * 4 + 1] = c.g
      colors[i * 4 + 2] = c.b
      colors[i * 4 + 3] = 0
    }

    const geometry = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(positions, 3)
    const colorAttr = new THREE.BufferAttribute(colors, 4)
    geometry.setAttribute('position', posAttr)
    geometry.setAttribute('color', colorAttr)

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const object = new THREE.Mesh(geometry, material)
    object.renderOrder = -1
    object.frustumCulled = false

    const pos = posAttr.array as Float32Array
    const col = colorAttr.array as Float32Array
    const aOf = [0.0, 0.0, 1.0, 0.0, 1.0, 1.0]

    this.beamUpdater = (dt: number) => {
      const camera = this.context?.camera as THREE.Camera | undefined
      const camDir = new THREE.Vector3(0, 0, -1)
      let rx = 1
      let rz = 0
      if (camera) {
        camera.getWorldDirection(camDir)
        rx = -camDir.z
        rz = camDir.x
        const len = Math.hypot(rx, rz) || 1
        rx /= len
        rz /= len
      }

      const hw = beamWidth / 2
      for (let n = 0; n < beams.length; n++) {
        let beam = beams[n]
        beam.y += beam.speed * dt
        if (beam.y - beamLength > beamHeight) {
          beam = beams[n] = spawnBeam(false)
        }

        const topY = beam.y
        const botY = Math.max(0, beam.y - beamLength)
        const ox = rx * hw
        const oz = rz * hw
        const verts = [
          [beam.x - ox, botY, beam.z - oz],
          [beam.x + ox, botY, beam.z + oz],
          [beam.x + ox, topY, beam.z + oz],
          [beam.x - ox, botY, beam.z - oz],
          [beam.x + ox, topY, beam.z + oz],
          [beam.x - ox, topY, beam.z - oz]
        ]
        const vi = n * 18
        for (let k = 0; k < 6; k++) {
          pos[vi + k * 3] = verts[k][0]
          pos[vi + k * 3 + 1] = verts[k][1]
          pos[vi + k * 3 + 2] = verts[k][2]
        }

        const fadeTop = 1 - Math.max(0, (beam.y - beamHeight * 0.7) / (beamHeight * 0.3))
        const headA = beamOpacity * beam.bright * Math.max(0, fadeTop)
        const ci = n * 24
        for (let k = 0; k < 6; k++) {
          col[ci + k * 4 + 3] = headA * aOf[k]
        }
      }

      posAttr.needsUpdate = true
      colorAttr.needsUpdate = true
    }

    return object
  }

  private createFlashObject(): Object3D | null {
    const { gridSize, gridDivision, flashColor, flashOpacity, flashDuration, flashConcurrent } =
      this.config

    const cell = gridSize / gridDivision
    const half = cell / 2
    const range = gridSize / 2
    const y = 0.005

    const color = new THREE.Color(flashColor)
    const positions: number[] = []
    const colors: number[] = []
    const quads: QuadState[] = []

    const quadOffsets = [
      { ox: -half, oz: -half },
      { ox: 0, oz: -half },
      { ox: 0, oz: 0 },
      { ox: -half, oz: 0 }
    ]

    let vertCount = 0
    for (let gx = 0; gx < gridDivision; gx++) {
      for (let gz = 0; gz < gridDivision; gz++) {
        const cx = -range + gx * cell + half
        const cz = -range + gz * cell + half

        for (const q of quadOffsets) {
          const x0 = cx + q.ox
          const x1 = cx + q.ox + half
          const z0 = cz + q.oz
          const z1 = cz + q.oz + half
          const verts = [
            [x0, y, z0],
            [x1, y, z0],
            [x1, y, z1],
            [x0, y, z0],
            [x1, y, z1],
            [x0, y, z1]
          ]
          for (const p of verts) {
            positions.push(p[0], p[1], p[2])
            colors.push(color.r, color.g, color.b, 0)
          }
          quads.push({ start: vertCount, flashStart: -1, dur: 0, peak: 1 })
          vertCount += 6
        }
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const colorAttr = new THREE.Float32BufferAttribute(colors, 4)
    geometry.setAttribute('color', colorAttr)

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false
    })

    const object = new THREE.Mesh(geometry, material)
    object.renderOrder = -2
    // Vertices are already authored on the XZ floor plane with a small +Y offset.
    // Rotating again would turn the flash sheet upright and make it intersect the floor vertically.
    object.position.y = 0

    let elapsed = 0
    const arr = colorAttr.array as Float32Array

    const activateRandomQuad = () => {
      for (let tries = 0; tries < 8; tries++) {
        const qd = quads[(Math.random() * quads.length) | 0]
        if (qd.flashStart < 0) {
          qd.flashStart = elapsed
          qd.dur = flashDuration * (0.6 + Math.random() * 0.8)
          qd.peak = 0.6 + Math.random() * 0.4
          return
        }
      }
    }

    this.flashUpdater = (dt: number) => {
      elapsed += dt
      let active = 0

      for (const qd of quads) {
        if (qd.flashStart < 0) continue
        const t = elapsed - qd.flashStart
        if (t >= qd.dur) {
          qd.flashStart = -1
          for (let k = 0; k < 6; k++) arr[(qd.start + k) * 4 + 3] = 0
          continue
        }
        active++
        const intensity = Math.sin((t / qd.dur) * Math.PI)
        const alpha = intensity * flashOpacity * qd.peak
        for (let k = 0; k < 6; k++) arr[(qd.start + k) * 4 + 3] = alpha
      }

      if (flashConcurrent > active) {
        let expected = (flashConcurrent / Math.max(flashDuration, 0.001)) * dt
        while (expected > 0) {
          if (expected >= 1 || Math.random() < expected) activateRandomQuad()
          expected -= 1
        }
      }

      colorAttr.needsUpdate = true
    }

    return object
  }
}

function createPlusGeometry(shapeSize: number): THREE.ShapeGeometry {
  const w = shapeSize / 18
  const h = shapeSize / 3
  const points = [
    new THREE.Vector2(-h, -w),
    new THREE.Vector2(-w, -w),
    new THREE.Vector2(-w, -h),
    new THREE.Vector2(w, -h),
    new THREE.Vector2(w, -w),
    new THREE.Vector2(h, -w),
    new THREE.Vector2(h, w),
    new THREE.Vector2(w, w),
    new THREE.Vector2(w, h),
    new THREE.Vector2(-w, h),
    new THREE.Vector2(-w, w),
    new THREE.Vector2(-h, w)
  ]
  return new THREE.ShapeGeometry(new THREE.Shape(points), 24)
}
