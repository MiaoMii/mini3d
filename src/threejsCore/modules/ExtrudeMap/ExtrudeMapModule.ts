import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  MultiPolygon,
  Polygon,
  Position
} from 'geojson'
import { gsap } from 'gsap'
import {
  AdditiveBlending,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MathUtils,
  Material,
  Object3D,
  Path,
  Shape,
  ShapeUtils,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  TubeGeometry,
  Vector2,
  Vector3,
  AmbientLight
} from 'three'
import type { EngineContext, IModule, TickInfo } from '../../core'
import { diff } from '../../utils/diff'
import { syncObject3DProperties } from '../syncObject3DProperties'
import { DEFAULT_MODULE_CONFIG } from './config'
import type { ExtrudeMapConfig, ResolvedExtrudeMapConfig } from './config'
import { cloneDeep } from 'lodash'
import { geoMercator } from 'd3-geo'
import {
  asyncLoaderTexture,
  resolveResourceUrl
} from '@/views/Projects/mapScene3D/threejsCore/utils/asyncLoader'

type ConfigKey = Extract<keyof ExtrudeMapConfig, string>
type MapGeometry = Polygon | MultiPolygon
type MapFeature = Feature<MapGeometry, GeoJsonProperties>
type MapGeoJson = FeatureCollection<MapGeometry, GeoJsonProperties>

interface MapMaterials {
  top: MeshLambertMaterial
  side: ShaderMaterial
  stroke: MeshBasicMaterial
  boundary: ShaderMaterial
}

interface SideUniforms {
  [uniform: string]: { value: unknown }
  time: { value: number }
  depth: { value: number }
  baseTopColor: { value: Color }
  baseBottomColor: { value: Color }
  scanColor: { value: Color }
  opacity: { value: number }
}

interface TopUniforms {
  uColor1: { value: Color }
  uColor2: { value: Color }
  uTopColor: { value: Color }
  uTime: { value: number }
}

interface BoundaryUniforms {
  [uniform: string]: { value: unknown }
  uColor: { value: Color }
  uTime: { value: number }
  uOpacity: { value: number }
}

const REBUILD_KEYS = new Set<ConfigKey>([
  'mapJsonUrl',
  'boundaryJsonUrl',
  'depth',
  'scale',
  'center',
  'storkWidth',
  'boundaryLineWidth',
  'faceMaterialUrl',
  'label'
])

export class ExtrudeMapModule implements IModule<ExtrudeMapConfig> {
  readonly id: string
  context: EngineContext | null = null
  dataSourceId?: string
  readonly name: string
  readonly order = 0
  readonly type = 'BaseGround'
  readonly config: ResolvedExtrudeMapConfig

  private instance: Group | null = null
  private surfaceGroup: Group | null = null
  private strokeGroup: Group | null = null
  private labelGroup: Group | null = null
  private topMaterial: MeshLambertMaterial | null = null
  sideMaterial: ShaderMaterial | null = null
  private strokeMaterial: MeshBasicMaterial | null = null
  private boundaryMaterial: ShaderMaterial | null = null
  private labelMaterials: SpriteMaterial[] = []
  private lifecycleAnimation: gsap.core.Timeline | null = null
  private buildPromise: Promise<void> | null = null
  private buildVersion = 0
  private mapReady = false
  private running = false
  private readonly jsonCache = new Map<string, Promise<MapGeoJson>>()
  private readonly projection = geoMercator()
  private sideUniforms: SideUniforms = this.createSideUniforms(DEFAULT_MODULE_CONFIG)
  private topUniforms: TopUniforms = this.createTopUniforms(DEFAULT_MODULE_CONFIG)
  private boundaryUniforms: BoundaryUniforms = this.createBoundaryUniforms(DEFAULT_MODULE_CONFIG)

  /**
   * 创建挤出地图模块
   * @param config
   */
  constructor(config: ExtrudeMapConfig = {}) {
    const { id, dataSourceId, label, enterAnimation, leaveAnimation, ...configOverrides } = config

    this.id = id ?? MathUtils.generateUUID()
    this.dataSourceId = dataSourceId

    const defaults = cloneDeep(DEFAULT_MODULE_CONFIG)
    this.config = {
      ...defaults,
      ...configOverrides,
      label: {
        ...defaults.label,
        ...label
      },
      enterAnimation: {
        ...defaults.enterAnimation,
        ...enterAnimation
      },
      leaveAnimation: {
        ...defaults.leaveAnimation,
        ...leaveAnimation
      }
    }

    this.name = this.config.name
  }

  /**
   * 初始化地图实例
   * @param context
   * @returns
   */
  async init(context: EngineContext): Promise<void> {
    if (this.instance) return

    this.instance = new Group()
    syncObject3DProperties(this.instance, this.config)
    this.updateTransform()

    context.scene.add(this.instance)

    // 1. 创建环境光
    context.scene.add(new AmbientLight(0xffffff, 0.6))

    this.requestMapBuild()
    await this.buildPromise
  }

  /**
   * 启动地图模块
   * @returns
   */
  async start(): Promise<void> {
    this.running = true

    if (!this.instance || !this.config.visible) {
      if (this.instance) this.instance.visible = false
      return
    }

    await this.buildPromise
    if (!this.running || !this.mapReady) return

    await this.playEnterAnimation()
  }

  /**
   * 更新着色器动画时间
   * @param tick
   */
  update(tick: TickInfo): void {
    this.topUniforms.uTime.value += tick.delta
    this.sideUniforms.time.value += tick.delta
    this.boundaryUniforms.uTime.value += tick.delta
  }

  /**
   * 更新地图配置
   * @param config
   */
  updateConfig(config: Partial<ExtrudeMapConfig>): void {
    const {
      id: _id,
      dataSourceId: _dataSourceId,
      label,
      enterAnimation,
      leaveAnimation,
      ...configOverrides
    } = config
    const nextConfig = {
      ...this.config,
      ...configOverrides,
      label: {
        ...this.config.label,
        ...label
      },
      enterAnimation: {
        ...this.config.enterAnimation,
        ...enterAnimation
      },
      leaveAnimation: {
        ...this.config.leaveAnimation,
        ...leaveAnimation
      }
    } as ResolvedExtrudeMapConfig

    const changes = diff(this.config, nextConfig)
    Object.assign(this.config, nextConfig)

    if (Object.keys(changes).length === 0) return

    if (this.instance) syncObject3DProperties(this.instance, this.config)
    this.updateTransform()
    this.updateMaterialConfig()

    const changedKeys = Object.keys(changes) as ConfigKey[]
    if (changedKeys.some((key) => REBUILD_KEYS.has(key))) {
      this.requestMapBuild()
    }
  }

  /**
   * 使用数据源更新地图配置
   * @param data
   */
  onDataChange(data: unknown): void {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return
    this.updateConfig(data as Partial<ExtrudeMapConfig>)
  }

  /**
   * 停止地图模块
   * @returns
   */
  async stop(): Promise<void> {
    this.running = false
    this.lifecycleAnimation?.kill()

    if (!this.instance || !this.mapReady) {
      if (this.instance) this.instance.visible = false
      return
    }

    await this.playLeaveAnimation()
  }

  /**
   * 销毁地图模块
   * @param context
   */
  destroy(context: EngineContext): void {
    this.running = false
    this.buildVersion += 1
    this.lifecycleAnimation?.kill()
    this.lifecycleAnimation = null

    if (this.instance) {
      context.scene.remove(this.instance)
    }

    this.clearMapContent()
    this.jsonCache.clear()
    this.instance = null
    this.buildPromise = null
  }

  /**
   * 请求重新构建地图
   */
  private requestMapBuild(): void {
    const version = ++this.buildVersion
    const playWhenReady = this.running
    this.clearMapContent()

    this.buildPromise = this.buildMap(version)
      .then(async () => {
        if (
          playWhenReady &&
          version === this.buildVersion &&
          this.running &&
          this.mapReady &&
          this.config.visible
        ) {
          await this.playEnterAnimation()
        }
      })
      .catch((error) => {
        if (version === this.buildVersion) {
          console.error(`Failed to build extrude map "${this.config.name}".`, error)
        }
      })
  }

  /**
   * 构建地图内容
   * @param version
   * @returns
   */
  private async buildMap(version: number): Promise<void> {
    const mapJson = await this.loadGeoJson(this.config.mapJsonUrl)
    const boundaryJson = await this.loadGeoJson(this.config.boundaryJsonUrl, true)
    const texture = await asyncLoaderTexture(this.config.faceMaterialUrl)
    if (version !== this.buildVersion || !this.instance || !mapJson) {
      texture?.dispose()
      return
    }

    this.configureGeoProjection()
    if (texture) this.configureTopTexture(texture, mapJson)
    const materials = this.createMapMaterials(texture)
    const surfaceGroup = new Group()
    const strokeGroup = new Group()
    const labelGroup = new Group()

    surfaceGroup.name = 'map-surfaces'
    strokeGroup.name = 'map-strokes'
    labelGroup.name = 'map-labels'

    mapJson.features.forEach((feature) => {
      if (!isSupportedFeature(feature)) return
      this.createFeature(feature, surfaceGroup, strokeGroup, labelGroup, materials)
    })

    if (boundaryJson) {
      boundaryJson.features.forEach((feature) => {
        if (!isSupportedFeature(feature)) return
        this.createFeatureBoundary(feature, strokeGroup, materials.boundary)
      })
    }

    this.surfaceGroup = surfaceGroup
    this.strokeGroup = strokeGroup
    this.labelGroup = labelGroup
    this.topMaterial = materials.top
    this.sideMaterial = materials.side
    this.strokeMaterial = materials.stroke
    this.boundaryMaterial = materials.boundary
    this.labelMaterials = this.collectLabelMaterials(labelGroup)

    this.instance.add(surfaceGroup, strokeGroup, labelGroup)
    this.mapReady = true
    this.setInitialVisualState()
  }

  /**
   * 创建地图区域
   * @param feature
   * @param surfaceGroup
   * @param strokeGroup
   * @param labelGroup
   * @param materials
   */
  private createFeature(
    feature: MapFeature,
    surfaceGroup: Group,
    strokeGroup: Group,
    labelGroup: Group,
    materials: MapMaterials
  ): void {
    const polygons = this.getPolygons(feature.geometry) // coordinates
    const featureName = this.getFeatureName(feature.properties)
    polygons.forEach((rings) => {
      const shape = this.createShape(rings)
      if (!shape) return
      const geometry = new ExtrudeGeometry(shape, {
        depth: this.config.depth,
        bevelEnabled: false,
        curveSegments: 2
      })
      // geometry.computeVertexNormals()
      const mesh = new Mesh(geometry, [materials.top, materials.side])
      mesh.name = featureName || 'extrude-region'
      mesh.renderOrder = this.config.renderOrder
      mesh.userData.properties = feature.properties
      surfaceGroup.add(mesh)
      rings.forEach((ring) => {
        const stroke = this.createStroke(
          ring,
          materials.stroke,
          this.config.storkWidth,
          this.config.depth + 0.015
        )
        if (stroke) strokeGroup.add(stroke)
      })
    })
    if (featureName && this.shouldShowLabel(featureName)) {
      const label = this.createProvinceLabel(feature, featureName)
      if (label) labelGroup.add(label)
    }
  }

  /**
   * 创建地图边界线
   * @param feature
   * @param strokeGroup
   * @param material
   */
  private createFeatureBoundary(
    feature: MapFeature,
    strokeGroup: Group,
    material: ShaderMaterial
  ): void {
    this.getPolygons(feature.geometry).forEach((rings) => {
      rings.forEach((ring) => {
        const stroke = this.createStroke(
          ring,
          material,
          this.config.boundaryLineWidth,
          this.config.depth + 0.026
        )
        if (stroke) strokeGroup.add(stroke)
      })
    })
  }

  /**
   * 根据多边形环创建形状
   * @param rings
   * @returns
   */
  private createShape(rings: Position[][]): Shape | null {
    const projectedRings = rings
      .map((ring) => {
        const points = ring
          .map(([longitude, latitude]) => {
            const projected = this.geoProjection([longitude, latitude])
            if (!projected) return null

            const [x, y] = projected
            return new Vector2(x, -y)
          })
          .filter((point): point is Vector2 => point !== null)

        if (points.length > 1 && points[0].distanceTo(points[points.length - 1]) < 0.000001) {
          points.pop()
        }

        return points
      })
      .filter((ring) => ring.length >= 3)

    const outerRing = projectedRings[0]
    if (!outerRing) return null

    const outerPoints = ShapeUtils.isClockWise(outerRing) ? outerRing : [...outerRing].reverse()
    const shape = new Shape(outerPoints)

    projectedRings.slice(1).forEach((ring) => {
      const holePoints = ShapeUtils.isClockWise(ring) ? [...ring].reverse() : ring
      shape.holes.push(new Path(holePoints))
    })

    return shape
  }

  /**
   * 创建地图描边
   * @param ring
   * @param material
   * @param width
   * @param z
   * @returns
   */
  private createStroke(
    ring: Position[],
    material: MeshBasicMaterial | ShaderMaterial,
    width: number,
    z: number
  ): Mesh<TubeGeometry, MeshBasicMaterial | ShaderMaterial> | null {
    const points = ring
      .map(([longitude, latitude]) => {
        const projected = this.geoProjection([longitude, latitude])
        return projected ? new Vector3(projected[0], -projected[1], z) : null
      })
      .filter((point): point is Vector3 => point !== null)

    if (points.length > 1 && points[0].distanceTo(points[points.length - 1]) < 0.000001) {
      points.pop()
    }

    if (points.length < 3) return null

    const curve = new CatmullRomCurve3(points, true, 'centripetal')
    const radius = Math.max(0.0005, width * 0.0025)
    const geometry = new TubeGeometry(curve, Math.max(8, points.length * 2), radius, 5, true)
    const stroke = new Mesh(geometry, material)
    stroke.renderOrder = this.config.renderOrder + 1
    return stroke
  }

  /**
   * 创建区县标签
   * @param feature
   * @param featureName
   * @returns
   */
  private createProvinceLabel(feature: MapFeature, featureName: string): Sprite | null {
    if (typeof document === 'undefined') return null

    const labelConfig = this.config.label
    const center = feature?.properties?.centroid
    if (!center) return null

    const position = this.geoProjection(center)
    if (!position) return null

    const fontSize = Math.max(8, labelConfig.fontSize ?? 14)
    const fontFamily = labelConfig.fontFamil || 'sans-serif'
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return null

    context.font = `${fontSize}px ${fontFamily}`
    const textWidth = Math.ceil(context.measureText(featureName).width)
    canvas.width = Math.max(1, textWidth + 16)
    canvas.height = Math.max(1, fontSize + 16)
    context.font = `${fontSize}px ${fontFamily}`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = labelConfig.fontColor || '#ffffff'
    context.fillText(featureName, canvas.width / 2, canvas.height / 2)

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0
    })
    const sprite = new Sprite(material)
    const labelScale = Math.max(0.01, labelConfig.scale ?? 1)
    sprite.position.set(position[0], -position[1], this.config.depth + 0.08)
    sprite.scale.set((canvas.width / 100) * labelScale, (canvas.height / 100) * labelScale, 1)
    sprite.renderOrder = this.config.renderOrder + 2
    sprite.userData.label = featureName
    return sprite
  }

  /**
   * 创建地图材质
   * @param texture
   * @returns
   */
  private createMapMaterials(texture: Texture | null): MapMaterials {
    const topMaterial = this.createTopMaterial(texture)
    const sideMaterial = this.createSideMaterial()
    const strokeMaterial = new MeshBasicMaterial({
      color: this.config.storkColor,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending
    })
    const boundaryMaterial = this.createBoundaryMaterial()

    return {
      top: topMaterial,
      side: sideMaterial,
      stroke: strokeMaterial,
      boundary: boundaryMaterial
    }
  }

  /**
   * 创建边界线材质
   * @returns
   */
  private createBoundaryMaterial(): ShaderMaterial {
    this.boundaryUniforms = {
      uColor: { value: new Color(this.config.boundaryLineColor) },
      uTime: { value: 0 },
      uOpacity: { value: this.config.enterAnimation.enabled ? 0 : 1 }
    }

    const boundaryVertexShader = `
      varying vec2 vUv;
    
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    const boundaryFragmentShader = `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
    
      float segmentGlow(float flow, float center, float width) {
        return exp(-pow((flow - center) * width, 2.0));
      }
    
      void main() {
        float trail = pow(max(0.0, 1.0 - abs(vUv.y - 0.5) * 2.0), 1.6);
        float flow = fract(vUv.x - uTime * 0.35);
        float segmentA = segmentGlow(flow, 0.18, 12.0);
        float segmentB = segmentGlow(flow, 0.68, 12.0);
        float pulse = 0.18 + (segmentA + segmentB) * 1.05;
        float alpha = trail * pulse * uOpacity;
    
        if (alpha < 0.01) {
          discard;
        }
    
        gl_FragColor = vec4(uColor * pulse, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `

    const material = new ShaderMaterial({
      uniforms: this.boundaryUniforms,
      vertexShader: boundaryVertexShader,
      fragmentShader: boundaryFragmentShader,
      transparent: true,
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending
    })
    material.toneMapped = false
    return material
  }

  /**
   * 创建顶面材质
   * @param texture
   * @returns
   */
  private createTopMaterial(texture: Texture | null): MeshLambertMaterial {
    this.topUniforms = {
      uColor1: { value: new Color(this.config.faceSideColor1) },
      uColor2: { value: new Color(this.config.faceSideColor2) },
      uTopColor: { value: new Color(this.config.faceColor) },
      uTime: { value: 0 }
    }

    const topMaterial = new MeshLambertMaterial({
      color: texture ? 0xffffff : this.config.faceColor,
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: true,
      side: DoubleSide
    })

    topMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uColor1 = this.topUniforms.uColor1
      shader.uniforms.uColor2 = this.topUniforms.uColor2
      shader.uniforms.uTopColor = this.topUniforms.uTopColor
      shader.uniforms.uTime = this.topUniforms.uTime

      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `varying vec3 vMapPosition;\nvarying vec3 vMapNormal;\nvarying vec3 vMapViewDirection;\nvoid main() {\n  vMapPosition = position;\n  vMapNormal = normalize(mat3(modelMatrix) * normal);\n  vec3 mapWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;\n  vMapViewDirection = normalize(cameraPosition - mapWorldPosition);`
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `varying vec3 vMapPosition;\nvarying vec3 vMapNormal;\nvarying vec3 vMapViewDirection;\nuniform vec3 uColor1;\nuniform vec3 uColor2;\nuniform vec3 uTopColor;\nuniform float uTime;\nvoid main() {`
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `#include <opaque_fragment>
        float gradientFactor = clamp(vMapPosition.x * 0.05 + 0.5, 0.0, 1.0);
        vec3 faceGradient = mix(uColor1, uColor2, gradientFactor);
        outgoingLight *= faceGradient;
        float fresnel = pow(1.0 - abs(dot(normalize(vMapNormal), normalize(vMapViewDirection))), 2.5);
        float pulse = 0.5 + 0.5 * sin(uTime * 1.5);
        outgoingLight += uTopColor * (fresnel * 0.35 + pulse * 0.25);
        `
      )
    }

    return topMaterial
  }

  /**
   * 创建侧边材质
   */
  private createSideMaterial(): ShaderMaterial {
    this.sideUniforms = {
      time: { value: 0 },
      depth: { value: this.config.depth },
      baseTopColor: { value: new Color(this.config.sideColorTop) },
      baseBottomColor: { value: new Color(this.config.sideColorBottom) },
      scanColor: { value: new Color(this.config.sideScanColor) },
      opacity: { value: 0 }
    }

    return new ShaderMaterial({
      uniforms: this.sideUniforms,
      transparent: true,
      depthWrite: true,
      side: DoubleSide,
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPosition;
        uniform float time;
        uniform float depth;
        uniform vec3 baseTopColor;
        uniform vec3 baseBottomColor;
        uniform vec3 scanColor;
        uniform float opacity;
        void main() {
          float bandHeight = 0.45;
          float normalizedHeight = clamp(vPosition.z / max(depth, 0.0001), 0.0, 1.0);
          float progress = fract(time * 0.35) * (1.0 + bandHeight) - bandHeight;
          float distanceToBand = (progress + bandHeight) - normalizedHeight;
          float belowHead = step(0.0, distanceToBand);
          float withinBand = clamp(1.0 - distanceToBand / bandHeight, 0.0, 1.0) * belowHead;
          float feather = smoothstep(0.0, 1.0, withinBand);
          float bandCore = pow(feather, 1.5);
          float bandEdge = smoothstep(0.0, 0.6, withinBand) * (1.0 - smoothstep(0.6, 1.0, withinBand));
          float scanStrength = bandCore * 0.85 + bandEdge * 0.4;
          vec3 baseColor = mix(baseBottomColor, baseTopColor, normalizedHeight);
          vec3 scanned = mix(baseColor, scanColor, clamp(scanStrength, 0.0, 1.0));
          gl_FragColor = vec4(scanned, opacity);
        }
      `
    })
  }

  /**
   * 入场动画
   * @returns
   */
  private async playEnterAnimation(): Promise<void> {
    if (!this.instance || !this.surfaceGroup || !this.mapReady) return

    this.lifecycleAnimation?.kill()
    this.instance.visible = this.config.visible

    const enter = this.config.enterAnimation
    const startScale = Math.max(0, enter.startScale ?? 0)
    const startOpacity = clamp(enter.startOpacity ?? 0)
    const finalOpacity = clamp(this.config.faceOpacity)
    const finalTopOpacity = this.getTopOpacity()

    this.surfaceGroup.scale.z = enter.enabled ? startScale : 1
    this.sideUniforms.opacity.value = enter.enabled ? startOpacity : finalOpacity
    if (this.topMaterial) this.topMaterial.opacity = enter.enabled ? 0 : finalTopOpacity
    if (this.strokeMaterial) this.strokeMaterial.opacity = enter.enabled ? 0 : 1
    if (this.boundaryMaterial) this.boundaryMaterial.opacity = enter.enabled ? 0 : 1
    this.labelMaterials.forEach((material) => {
      material.opacity = enter.enabled ? 0 : 1
    })

    if (!enter.enabled) return

    const duration = Math.max(0, enter.duration ?? 0)
    const timeline = gsap.timeline({
      defaults: {
        ease: enter.ease || this.config.transitionEase
      }
    })
    this.lifecycleAnimation = timeline

    timeline
      .to(this.surfaceGroup.scale, {
        z: 1,
        duration
      })
      .to(this.sideUniforms.opacity, {
        value: finalOpacity,
        duration: duration * 0.35
      })
      .to(this.topMaterial!, {
        opacity: finalTopOpacity,
        duration: duration * 0.45
      })
      .to([this.strokeMaterial!], {
        opacity: 1,
        duration: duration * 0.25
      })
      .to(this.boundaryUniforms.uOpacity, {
        value: 1,
        duration: duration * 0.25
      })
    if (this.labelMaterials.length > 0) {
      timeline.to(this.labelMaterials, {
        opacity: 1,
        duration: duration
      })
    }

    await this.waitForTimeline(timeline)
  }

  /**
   * 离场动画
   * @returns
   */
  private async playLeaveAnimation(): Promise<void> {
    if (!this.instance || !this.surfaceGroup || !this.mapReady) return

    this.lifecycleAnimation?.kill()
    const leave = this.config.leaveAnimation

    if (!leave.enabled) {
      this.instance.visible = false
      return
    }

    const duration = Math.max(0, leave.duration ?? 0)
    const timeline = gsap.timeline({
      defaults: {
        ease: leave.ease || this.config.transitionEase
      }
    })
    this.lifecycleAnimation = timeline

    if (this.labelMaterials.length > 0) {
      timeline.to(this.labelMaterials, {
        opacity: 0,
        duration: 0.25
      })
    }

    timeline
      .to(this.boundaryUniforms.uOpacity, {
        value: 0,
        duration: duration * 0.25
      })
      .to([this.strokeMaterial!], {
        opacity: 0,
        duration: duration * 0.2
      })
      .to(this.topMaterial!, {
        opacity: 0,
        duration: duration * 0.25
      })
      .to(this.sideUniforms.opacity, {
        value: clamp(leave.endOpacity ?? 0),
        duration: duration * 0.3
      })
      .to(this.surfaceGroup.scale, {
        z: Math.max(0, leave.endScale ?? 0),
        duration: duration * 0.3
      })

    await this.waitForTimeline(timeline, () => {
      if (this.instance) this.instance.visible = false
    })
  }

  /**
   * 设置地图初始显示状态
   */
  private setInitialVisualState(): void {
    if (!this.surfaceGroup) return
    this.surfaceGroup.scale.z = this.config.enterAnimation.enabled
      ? Math.max(0, this.config.enterAnimation.startScale ?? 0)
      : 1
    this.sideUniforms.opacity.value = this.config.enterAnimation.enabled
      ? clamp(this.config.enterAnimation.startOpacity ?? 0)
      : clamp(this.config.faceOpacity)
    if (this.topMaterial) this.topMaterial.opacity = 0
    if (this.strokeMaterial) this.strokeMaterial.opacity = 0
    if (this.boundaryMaterial) this.boundaryMaterial.opacity = 0
    this.labelMaterials.forEach((material) => {
      material.opacity = 0
    })
  }

  /**
   * 更新地图位置和旋转
   */
  private updateTransform(): void {
    if (!this.instance) return
    this.instance.position.fromArray(this.config.position)
    this.instance.rotation.fromArray(this.config.rotation)
  }

  /**
   * 更新材质
   */
  private updateMaterialConfig(): void {
    this.sideUniforms.depth.value = this.config.depth
    this.sideUniforms.baseTopColor.value.set(this.config.sideColorTop)
    this.sideUniforms.baseBottomColor.value.set(this.config.sideColorBottom)
    this.sideUniforms.scanColor.value.set(this.config.sideScanColor)
    this.topUniforms.uColor1.value.set(this.config.faceSideColor1)
    this.topUniforms.uColor2.value.set(this.config.faceSideColor2)
    this.topUniforms.uTopColor.value.set(this.config.faceColor)

    this.topMaterial?.color.set(this.topMaterial.map ? 0xffffff : this.config.faceColor)
    if (this.topMaterial) this.topMaterial.opacity = this.getTopOpacity()
    this.strokeMaterial?.color.set(this.config.storkColor)
    this.boundaryUniforms.uColor.value.set(this.config.boundaryLineColor)
  }

  /**
   * 获取顶部透明度
   * @returns
   */
  private getTopOpacity(): number {
    const textureOpacity = Number.parseFloat(this.config.faceMaterialOpacity)
    const normalizedTextureOpacity = Number.isFinite(textureOpacity) ? textureOpacity : 1
    return clamp(this.config.faceOpacity * normalizedTextureOpacity)
  }

  /**
   * 获取地图几何中的多边形坐标
   * @param geometry
   * @returns
   */
  private getPolygons(geometry: MapGeometry): Position[][][] {
    return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  }

  /**
   * 获取地图区域名称
   * @param properties
   * @returns
   */
  private getFeatureName(properties: GeoJsonProperties): string {
    if (!properties) return ''

    const name =
      properties.name ??
      properties.NAME ??
      properties.fullname ??
      properties.adname ??
      properties.city

    return typeof name === 'string' ? name : String(name ?? '')
  }

  // private getCoordinate(value: unknown): [number, number] | null {
  //   if (
  //     !Array.isArray(value) ||
  //     value.length < 2 ||
  //     typeof value[0] !== 'number' ||
  //     typeof value[1] !== 'number'
  //   ) {
  //     return null
  //   }
  //
  //   return [value[0], value[1]]
  // }

  /**
   * 配置地图地理投影
   */
  private configureGeoProjection(): void {
    this.projection.center(this.config.center).scale(this.config.scale).translate([0, 0])
  }

  /**
   * 将顶面纹理映射到整张地图的投影范围。
   *
   * ExtrudeGeometry 会直接使用形状坐标作为顶面 UV。地图投影坐标通常只占很小的
   * 数值范围，因此需要通过纹理矩阵将其归一化到 0 到 1，避免只采样图片角落。
   * @param texture 顶面纹理
   * @param mapJson 地图要素集合
   */
  private configureTopTexture(texture: Texture, mapJson: MapGeoJson): void {
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    mapJson.features.forEach((feature) => {
      if (!isSupportedFeature(feature)) return

      this.getPolygons(feature.geometry).forEach((rings) => {
        rings.forEach((ring) => {
          ring.forEach(([longitude, latitude]) => {
            const projected = this.geoProjection([longitude, latitude])
            if (!projected) return

            const x = projected[0]
            const y = -projected[1]
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
          })
        })
      })
    })

    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return

    const width = Math.max(maxX - minX, Number.EPSILON)
    const height = Math.max(maxY - minY, Number.EPSILON)
    texture.repeat.set(1 / width, 1 / height)
    texture.offset.set(-minX / width, -minY / height)
    texture.needsUpdate = true
  }

  /**
   * 投影地理坐标
   * @param coordinate
   * @returns
   */
  private geoProjection(coordinate: [number, number]): [number, number] | null {
    return this.projection(coordinate)
  }

  /**
   * 判断是否显示区域标签
   * @param name
   * @returns
   */
  private shouldShowLabel(name: string): boolean {
    if (!this.config.label.show) return false
    const showList = this.config.label.showList ?? []
    return showList.length === 0 || showList.includes(name)
  }

  /**
   * 收集标签材质
   * @param group
   * @returns
   */
  private collectLabelMaterials(group: Group): SpriteMaterial[] {
    const materials: SpriteMaterial[] = []
    group.traverse((object) => {
      if (object instanceof Sprite && object.material instanceof SpriteMaterial) {
        materials.push(object.material)
      }
    })
    return materials
  }

  /**
   * 加载geojson
   * @param url
   * @param optional
   * @returns
   */
  private async loadGeoJson(url: string, optional = false): Promise<MapGeoJson | null> {
    if (!url.trim()) return optional ? null : { type: 'FeatureCollection', features: [] }

    const resourceUrl = resolveResourceUrl(url)
    let request = this.jsonCache.get(resourceUrl)
    if (!request) {
      request = fetch(resourceUrl).then(async (response) => {
        if (!response.ok) {
          throw new Error(`GeoJSON request failed with status ${response.status}.`)
        }

        const value = (await response.json()) as MapGeoJson
        if (value.type !== 'FeatureCollection' || !Array.isArray(value.features)) {
          throw new Error(`GeoJSON resource "${url}" is not a FeatureCollection.`)
        }

        return value
      })
      this.jsonCache.set(resourceUrl, request)
    }

    try {
      return await request
    } catch (error) {
      this.jsonCache.delete(resourceUrl)
      if (optional) {
        console.warn(`Failed to load optional GeoJSON resource "${url}".`, error)
        return null
      }
      throw error
    }
  }

  /**
   * 清除地图内容
   */
  private clearMapContent(): void {
    this.lifecycleAnimation?.kill()
    this.lifecycleAnimation = null
    this.mapReady = false
    this.labelMaterials = []

    if (this.instance) {
      ;[this.surfaceGroup, this.strokeGroup, this.labelGroup].forEach((group) => {
        if (!group) return
        this.instance?.remove(group)
        this.disposeObject3D(group)
      })
    }

    this.surfaceGroup = null
    this.strokeGroup = null
    this.labelGroup = null
    this.topMaterial = null
    this.sideMaterial = null
    this.strokeMaterial = null
    this.boundaryMaterial = null
  }

  /**
   * 释放对象及其几何体和材质
   * @param root
   */
  private disposeObject3D(root: Object3D): void {
    const materials = new Set<Material>()

    root.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.geometry) mesh.geometry.dispose()

      const material = (object as Mesh | Sprite).material
      if (Array.isArray(material)) {
        material.forEach((item) => materials.add(item))
      } else if (material) {
        materials.add(material)
      }
    })

    materials.forEach((material) => {
      if ('map' in material && material.map instanceof Texture) {
        material.map.dispose()
      }
      material.dispose()
    })
  }

  /**
   * 侧边着色器配置项
   * @param config
   * @returns
   */
  private createSideUniforms(config: ResolvedExtrudeMapConfig): SideUniforms {
    return {
      time: { value: 0 },
      depth: { value: config.depth },
      baseTopColor: { value: new Color(config.sideColorTop) },
      baseBottomColor: { value: new Color(config.sideColorBottom) },
      scanColor: { value: new Color(config.sideScanColor) },
      opacity: { value: 0 }
    }
  }

  /**
   * 顶面着色器配置项
   * @param config
   * @returns
   */
  private createTopUniforms(config: ResolvedExtrudeMapConfig): TopUniforms {
    return {
      uColor1: { value: new Color(config.faceSideColor1) },
      uColor2: { value: new Color(config.faceSideColor2) },
      uTopColor: { value: new Color(config.faceColor) },
      uTime: { value: 0 }
    }
  }

  /**
   * 创建边界线着色器配置项
   * @param config
   * @returns
   */
  private createBoundaryUniforms(config: ResolvedExtrudeMapConfig): BoundaryUniforms {
    return {
      uColor: { value: new Color(config.faceSideColor1) },
      uOpacity: { value: 1 },
      uTime: { value: 0 }
    }
  }

  /**
   * 等待时间线播放结束
   * @param timeline
   * @param completed
   * @returns
   */
  private waitForTimeline(timeline: gsap.core.Timeline, completed?: () => void): Promise<void> {
    return new Promise((resolve) => {
      /**
       * 结束当前动画并清理运行状态。
       */
      const finish = () => {
        if (this.lifecycleAnimation === timeline) {
          this.lifecycleAnimation = null
        }
        resolve()
      }

      timeline.eventCallback('onComplete', () => {
        completed?.()
        finish()
      })
      timeline.eventCallback('onInterrupt', finish)
    })
  }
}

/**
 * 将数值限制在零到一之间
 * @param value
 * @returns
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * 判断要素是否为支持的地图几何类型
 * @param feature
 * @returns
 */
function isSupportedFeature(feature: Feature): feature is MapFeature {
  return feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon'
}
