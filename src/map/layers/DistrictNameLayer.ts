import gsap from 'gsap'
import { Group, Vector3 } from 'three'
import { Label3d } from '@/mini3d'
import type {
  DistrictNameLayerConfig,
  DistrictNameLayerDiff,
  GeoJsonFeature,
  MapProjectionConfig,
} from '@/types/map'
import {
  escapeHtml,
  getFeaturePoint,
  getProjectedGeoJsonPlaneBounds,
  parseGeoJson,
  projectPoint,
  type Mini3dLike,
} from '@/map/utils'

interface LabelEntry {
  feature: GeoJsonFeature
  label: ReturnType<InstanceType<typeof Label3d>['create']>
}

export class DistrictNameLayer {
  private readonly app: Mini3dLike
  private readonly group: Group
  private label3d: InstanceType<typeof Label3d> | null = null
  private labels: LabelEntry[] = []
  private currentConfig: DistrictNameLayerConfig | null = null
  private projection: MapProjectionConfig | null = null
  private planeCenter = new Vector3()
  private geoJsonText = ''

  constructor(app: Mini3dLike) {
    this.app = app
    this.group = new Group()
    this.group.name = 'district-name-layer'
    this.group.rotation.x = -Math.PI / 2
  }

  create(config: DistrictNameLayerConfig, geoJsonText: string, projection: MapProjectionConfig) {
    this.currentConfig = config
    this.projection = projection
    this.geoJsonText = geoJsonText
    this.planeCenter = getProjectedGeoJsonPlaneBounds(geoJsonText, projection).center

    if (!this.label3d) {
      this.label3d = new Label3d(this.app)
    }

    if (!this.group.parent) {
      this.app.scene.add(this.group)
    }

    this.label3d.setRenderLevel(config.zIndex)
    this.rebuildLabels(config, geoJsonText, projection)

    if (config.visible) {
      this.playEnterAnimation(config)
    } else {
      this.applyVisible(false)
    }
  }

  update(
    config: DistrictNameLayerConfig,
    diff: DistrictNameLayerDiff,
    geoJsonText = this.geoJsonText,
    projection = this.projection,
  ) {
    if (!this.label3d || !projection || diff.dataChanged) {
      this.replaceLabels(config, geoJsonText, projection as MapProjectionConfig)
      return
    }

    this.currentConfig = config
    this.projection = projection
    this.geoJsonText = geoJsonText

    if (diff.visibleChanged) {
      this.visible(config.visible)
      if (!config.visible) return
    }

    if (diff.zIndexChanged) {
      this.label3d.setRenderLevel(config.zIndex)
    }

    if (diff.positionChanged) {
      this.updateLabelPositions(config, projection)
    }

    if (diff.styleChanged) {
      this.updateLabelStyles(config)
    }
  }

  visible(visible: boolean) {
    const config = this.currentConfig
    if (!config) {
      this.applyVisible(visible)
      return
    }

    if (visible) {
      this.playEnterAnimation(config)
      return
    }

    this.playExitAnimation(config, () => {
      this.applyVisible(false)
    })
  }

  destory() {
    this.stopAnimations()
    this.clearLabels()
    this.group.parent?.remove(this.group)
    this.label3d?.destroy()
    this.label3d = null
    this.currentConfig = null
    this.projection = null
    this.geoJsonText = ''
  }

  destroy() {
    this.destory()
  }

  private replaceLabels(
    config: DistrictNameLayerConfig,
    geoJsonText: string,
    projection: MapProjectionConfig,
  ) {
    if (this.labels.length === 0) {
      this.create(config, geoJsonText, projection)
      return
    }

    const exitConfig = this.currentConfig ?? config
    this.playExitAnimation(exitConfig, () => {
      this.clearLabels()
      this.create(config, geoJsonText, projection)
    })
  }

  private rebuildLabels(
    config: DistrictNameLayerConfig,
    geoJsonText: string,
    projection: MapProjectionConfig,
  ) {
    if (!this.label3d) return

    this.clearLabels()
    const mapData = parseGeoJson(geoJsonText)
    this.labels = mapData.features
      .map((feature) => {
        const position = this.getLabelPosition(feature, config, projection)
        if (!position) return null

        const content = this.renderLabel(feature, config)
        const label = this.label3d?.create(content, config.className, false)
        if (!label) return null

        label.init(content, position)
        this.label3d?.setLabelStyle(label, config.scale, 'x')
        label.setParent(this.group)
        return { feature, label }
      })
      .filter((item): item is LabelEntry => Boolean(item))
  }

  private clearLabels() {
    this.labels.forEach(({ label }) => {
      gsap.killTweensOf([label.position, label.element, label.element.firstElementChild])
      label.parent?.remove(label)
    })
    this.labels = []
    this.group.clear()
  }

  private playEnterAnimation(config: DistrictNameLayerConfig) {
    this.stopAnimations()
    this.applyVisible(true)

    const elements = this.getLabelElements()
    elements.forEach((element) => {
      gsap.set(element, {
        opacity: 0,
        y: config.transition.translateY,
      })
    })

    gsap.to(elements, {
      opacity: 1,
      y: 0,
      duration: config.transition.duration,
      ease: config.transition.ease,
      stagger: config.transition.stagger,
      overwrite: true,
      clearProps: 'transform',
    })
  }

  private playExitAnimation(config: DistrictNameLayerConfig, onComplete: () => void) {
    this.stopAnimations()
    const elements = this.getLabelElements()

    if (elements.length === 0) {
      onComplete()
      return
    }

    gsap.to(elements, {
      opacity: 0,
      y: -config.transition.translateY * 0.6,
      duration: config.transition.duration * 0.45,
      ease: 'power2.in',
      stagger: config.transition.stagger * 0.5,
      overwrite: true,
      onComplete,
    })
  }

  private updateLabelPositions(
    config: DistrictNameLayerConfig,
    projection: MapProjectionConfig,
  ) {
    this.labels.forEach(({ feature, label }) => {
      const position = this.getLabelPosition(feature, config, projection)
      if (!position) return

      gsap.killTweensOf(label.position)
      gsap.to(label.position, {
        x: position.x,
        y: position.y,
        z: position.z,
        duration: config.transition.duration,
        ease: config.transition.ease,
      })
    })
  }

  private updateLabelStyles(config: DistrictNameLayerConfig) {
    this.labels.forEach(({ feature, label }) => {
      label.element.className = config.className
      label.element.innerHTML = this.renderLabel(feature, config)
      this.label3d?.setLabelStyle(label, config.scale, 'x')
    })

    const elements = this.getLabelElements()
    gsap.set(elements, {
      opacity: 0.72,
      y: config.transition.translateY * 0.35,
    })
    gsap.to(elements, {
      opacity: 1,
      y: 0,
      duration: config.transition.duration * 0.75,
      ease: config.transition.ease,
      stagger: config.transition.stagger,
      overwrite: true,
      clearProps: 'transform',
    })
  }

  private applyVisible(visible: boolean) {
    this.group.visible = visible
    this.labels.forEach(({ label }) => {
      label.element.style.display = visible ? '' : 'none'
    })
  }

  private getLabelPosition(
    feature: GeoJsonFeature,
    config: DistrictNameLayerConfig,
    projection: MapProjectionConfig,
  ) {
    const point = getFeaturePoint(feature, config.positionField)
    if (!point) return null

    const [x, y] = projectPoint(point, projection)
    return new Vector3(
      x - this.planeCenter.x + config.offset[0],
      -y - this.planeCenter.y + config.offset[1],
      config.offset[2],
    )
  }

  private getLabelElements() {
    return this.labels
      .map(({ label }) => label.element.firstElementChild)
      .filter((element): element is HTMLElement => element instanceof HTMLElement)
  }

  private stopAnimations() {
    const targets: unknown[] = []

    this.labels.forEach(({ label }) => {
      targets.push(label.position, label.element)
      if (label.element.firstElementChild) {
        targets.push(label.element.firstElementChild)
      }
    })

    if (targets.length > 0) {
      gsap.killTweensOf(targets)
    }
  }

  private renderLabel(feature: GeoJsonFeature, config: DistrictNameLayerConfig) {
    const name = escapeHtml(feature.properties[config.nameField])
    const style = [
      `color:${config.color}`,
      `font-size:${config.fontSize}px`,
      `font-weight:${config.style.fontWeight}`,
      `letter-spacing:${config.style.letterSpacing}`,
      `background:${config.style.background}`,
      `border:1px solid ${config.style.borderColor}`,
      `border-radius:${config.style.borderRadius}`,
      `padding:${config.style.padding}`,
      `text-shadow:${config.style.textShadow}`,
      'will-change:opacity,transform',
    ].join(';')

    return `<span class="district-name-label__text" style="${style}">${name}</span>`
  }
}
