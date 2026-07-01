import gsap from 'gsap'
import {
  Box3,
  Color,
  DoubleSide,
  Group,
  LineBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  Vector3,
} from 'three'
import { ExtrudeMap, Line } from '@/mini3d'
import type { MapLayerConfig, MapLayerDiff } from '@/types/map'
import {
  disposeObject3D,
  getProjectedGeoJsonPlaneBounds,
  setRenderOrder,
  toVector3,
  type Mini3dLike,
} from '@/map/utils'

type MapMaterial = MeshLambertMaterial | LineBasicMaterial

export interface MapViewBounds {
  center: Vector3
  size: Vector3
}

export class MapLayer {
  private readonly app: Mini3dLike
  private group: Group | null = null
  private extrudeMap: InstanceType<typeof ExtrudeMap> | null = null
  private borderLine: InstanceType<typeof Line> | null = null
  private topMaterial: MeshLambertMaterial | null = null
  private sideMaterial: MeshLambertMaterial | null = null
  private borderMaterial: LineBasicMaterial | null = null
  private currentConfig: MapLayerConfig | null = null
  private geoJsonText = ''
  private focusTimeline: ReturnType<typeof gsap.timeline> | null = null

  constructor(app: Mini3dLike) {
    this.app = app
  }

  create(config: MapLayerConfig, geoJsonText: string) {
    this.currentConfig = config
    this.geoJsonText = geoJsonText
    this.group = new Group()
    this.group.name = `map-layer-${config.id}`
    this.group.rotation.x = -Math.PI / 2

    this.applyTransform(config)
    this.createMaterials(config)
    this.createGeometry(config, geoJsonText)
    this.app.scene.add(this.group)
    this.centerGeometry(config, geoJsonText)

    if (config.visible) {
      this.playEnterAnimation(config)
    } else {
      this.applyVisible(false)
    }
  }

  update(config: MapLayerConfig, diff: MapLayerDiff, geoJsonText = this.geoJsonText) {
    if (!this.group || diff.geometryChanged) {
      return this.replaceGeometry(config, geoJsonText)
    }

    this.currentConfig = config
    this.geoJsonText = geoJsonText

    if (diff.visibleChanged) {
      this.visible(config.visible)
      if (!config.visible) return Promise.resolve()
    }

    if (diff.transformChanged) {
      this.animateTransform(config)
    }

    if (diff.styleChanged) {
      this.animateMaterialTo(config)
      setRenderOrder(this.group, config.renderOrder)
    }

    if (diff.borderChanged) {
      this.animateBorderTo(config)
    }

    return Promise.resolve()
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
    if (!this.group) return

    this.group.parent?.remove(this.group)
    disposeObject3D(this.group)
    this.group.clear()
    this.group = null
    this.extrudeMap = null
    this.borderLine = null
    this.topMaterial = null
    this.sideMaterial = null
    this.borderMaterial = null
    this.currentConfig = null
  }

  destroy() {
    this.destory()
  }

  getViewBounds(): MapViewBounds | null {
    if (!this.group) return null

    this.group.updateMatrixWorld(true)
    const box = new Box3().setFromObject(this.group)
    const center = new Vector3()
    const size = new Vector3()
    box.getCenter(center)
    box.getSize(size)

    return { center, size }
  }

  playFocusAnimation() {
    if (!this.group || !this.currentConfig) return

    const config = this.currentConfig
    const targetScale = toVector3(config.scale)
    const topGroup = this.extrudeMap?.mapGroup
    const borderGroup = this.borderLine?.lineGroup
    const baseTopZ = topGroup?.position.z ?? 0
    const baseBorderZ = borderGroup?.position.z ?? config.depth + config.border.elevation
    const baseBorderOpacity = config.border.opacity
    const focusBorderColor = new Color('#f9fbff')
    const baseBorderColor = new Color(config.border.color)

    this.focusTimeline?.kill()
    gsap.killTweensOf([
      this.group.scale,
      topGroup?.position,
      borderGroup?.position,
      this.borderMaterial,
      this.borderMaterial?.color,
      this.topMaterial,
      this.topMaterial?.color,
    ].filter(Boolean))

    this.group.scale.copy(targetScale.clone().multiplyScalar(0.92))
    if (topGroup) {
      topGroup.position.z = baseTopZ - 0.42
    }
    if (borderGroup) {
      borderGroup.position.z = baseBorderZ + 0.12
    }
    if (this.borderMaterial) {
      this.borderMaterial.opacity = 0.18
      this.borderMaterial.color.copy(focusBorderColor)
      this.borderMaterial.transparent = true
    }

    this.focusTimeline = gsap
      .timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          this.focusTimeline = null
        },
      })
      .to(this.group.scale, {
        x: targetScale.x,
        y: targetScale.y,
        z: targetScale.z,
        duration: 0.82,
      }, 0)
      .to(topGroup?.position ?? {}, {
        z: baseTopZ + 0.36,
        duration: 0.56,
      }, 0)
      .to(topGroup?.position ?? {}, {
        z: baseTopZ,
        duration: 0.42,
        ease: 'power2.inOut',
      }, 0.56)
      .to(this.topMaterial?.color ?? {}, {
        r: 0.18,
        g: 0.78,
        b: 1,
        duration: 0.28,
      }, 0.08)
      .to(this.topMaterial?.color ?? {}, {
        r: new Color(config.color).r,
        g: new Color(config.color).g,
        b: new Color(config.color).b,
        duration: 0.72,
      }, 0.38)
      .to(borderGroup?.position ?? {}, {
        z: baseBorderZ + 0.52,
        duration: 0.36,
      }, 0.04)
      .to(this.borderMaterial ?? {}, {
        opacity: 1,
        duration: 0.18,
        repeat: 3,
        yoyo: true,
      }, 0.12)
      .to(this.borderMaterial?.color ?? {}, {
        r: baseBorderColor.r,
        g: baseBorderColor.g,
        b: baseBorderColor.b,
        duration: 0.5,
      }, 0.62)
      .to(this.borderMaterial ?? {}, {
        opacity: baseBorderOpacity,
        duration: 0.44,
      }, 0.68)
      .to(borderGroup?.position ?? {}, {
        z: baseBorderZ,
        duration: 0.48,
        ease: 'power2.inOut',
      }, 0.64)
  }

  private replaceGeometry(config: MapLayerConfig, geoJsonText: string) {
    if (!this.group) {
      this.create(config, geoJsonText)
      return Promise.resolve()
    }

    const exitConfig = this.currentConfig ?? config
    return new Promise<void>((resolve) => {
      this.playExitAnimation(exitConfig, () => {
        this.destory()
        this.create(config, geoJsonText)
        resolve()
      })
    })
  }

  private createMaterials(config: MapLayerConfig) {
    this.topMaterial = new MeshLambertMaterial({
      color: new Color(config.color),
      transparent: true,
      opacity: config.opacity,
      fog: false,
      side: DoubleSide,
    })
    this.sideMaterial = new MeshLambertMaterial({
      color: new Color(config.sideColor),
      transparent: true,
      opacity: config.sideOpacity,
      fog: false,
      side: DoubleSide,
    })
    this.borderMaterial = new LineBasicMaterial({
      color: new Color(config.border.color),
      transparent: true,
      opacity: config.border.opacity,
      linewidth: config.border.width,
    })
  }

  private createGeometry(config: MapLayerConfig, geoJsonText: string) {
    if (!this.group || !this.topMaterial || !this.sideMaterial) return

    this.extrudeMap = new ExtrudeMap({ assets: null, time: null }, {
      geoProjectionCenter: config.projection.center,
      geoProjectionScale: config.projection.scale,
      position: new Vector3(0, 0, 0),
      data: geoJsonText,
      depth: config.depth,
      topFaceMaterial: this.topMaterial,
      sideMaterial: this.sideMaterial,
      renderOrder: config.renderOrder,
    })
    this.group.add(this.extrudeMap.mapGroup)

    if (config.border.visible) {
      this.createBorder(config, geoJsonText)
    }
  }

  private createBorder(config: MapLayerConfig, geoJsonText: string) {
    if (!this.group || !this.borderMaterial) return

    this.borderLine = new Line({}, {
      geoProjectionCenter: config.projection.center,
      geoProjectionScale: config.projection.scale,
      position: new Vector3(0, 0, config.depth + config.border.elevation),
      data: geoJsonText,
      material: this.borderMaterial,
      type: 'LineLoop',
      renderOrder: config.renderOrder + 1,
    })
    this.group.add(this.borderLine.lineGroup)
  }

  private centerGeometry(config: MapLayerConfig, geoJsonText: string) {
    const bounds = getProjectedGeoJsonPlaneBounds(geoJsonText, config.projection)
    const offsetX = -bounds.center.x
    const offsetY = -bounds.center.y

    if (this.extrudeMap?.mapGroup) {
      this.extrudeMap.mapGroup.position.x += offsetX
      this.extrudeMap.mapGroup.position.y += offsetY
    }

    if (this.borderLine?.lineGroup) {
      this.borderLine.lineGroup.position.x += offsetX
      this.borderLine.lineGroup.position.y += offsetY
    }
  }

  private playEnterAnimation(config: MapLayerConfig) {
    if (!this.group) return

    this.stopAnimations()
    const targetScale = toVector3(config.scale)
    const startScale = targetScale.clone().multiplyScalar(config.transition.initialScale)

    this.applyVisible(true)
    this.group.scale.copy(startScale)
    this.setMaterialOpacity(0)

    gsap.to(this.group.scale, {
      x: targetScale.x,
      y: targetScale.y,
      z: targetScale.z,
      duration: config.transition.duration,
      ease: config.transition.ease,
    })
    this.animateMaterialTo(config)
    this.animateBorderTo(config)
  }

  private playExitAnimation(config: MapLayerConfig, onComplete: () => void) {
    if (!this.group) {
      onComplete()
      return
    }

    this.stopAnimations()
    const endScale = this.group.scale.clone().multiplyScalar(config.transition.initialScale)
    const materials = this.getMaterials()
    materials.forEach((material) => {
      material.transparent = true
    })

    gsap
      .timeline({ onComplete })
      .to(
        this.group.scale,
        {
          x: endScale.x,
          y: endScale.y,
          z: endScale.z,
          duration: config.transition.duration * 0.5,
          ease: 'power2.in',
        },
        0,
      )
      .to(
        materials,
        {
          opacity: 0,
          duration: config.transition.duration * 0.45,
          ease: 'power2.out',
        },
        0,
      )
  }

  private animateTransform(config: MapLayerConfig) {
    if (!this.group) return

    const targetPosition = toVector3(config.position)
    const targetScale = toVector3(config.scale)
    gsap.killTweensOf([this.group.position, this.group.scale])
    gsap.to(this.group.position, {
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      duration: config.transition.duration,
      ease: config.transition.ease,
    })
    gsap.to(this.group.scale, {
      x: targetScale.x,
      y: targetScale.y,
      z: targetScale.z,
      duration: config.transition.duration,
      ease: config.transition.ease,
    })
  }

  private animateMaterialTo(config: MapLayerConfig) {
    this.animateMaterial(this.topMaterial, config.color, config.opacity, config)
    this.animateMaterial(this.sideMaterial, config.sideColor, config.sideOpacity, config)
  }

  private animateBorderTo(config: MapLayerConfig) {
    if (!this.group || !this.borderMaterial) return

    if (!this.borderLine && config.border.visible) {
      this.createBorder(config, this.geoJsonText)
      this.borderMaterial.opacity = 0
    }

    const borderGroup = this.borderLine?.lineGroup as Object3D | undefined
    if (!borderGroup) return

    borderGroup.position.z = config.depth + config.border.elevation
    setRenderOrder(borderGroup, config.renderOrder + 1)

    if (config.border.visible) {
      borderGroup.visible = true
      this.animateMaterial(this.borderMaterial, config.border.color, config.border.opacity, config)
      return
    }

    gsap.killTweensOf(this.borderMaterial)
    this.borderMaterial.transparent = true
    gsap.to(this.borderMaterial, {
      opacity: 0,
      duration: config.transition.duration * 0.45,
      ease: 'power2.out',
      onComplete: () => {
        borderGroup.visible = false
      },
    })
  }

  private animateMaterial(
    material: MapMaterial | null,
    color: MapLayerConfig['color'],
    opacity: number,
    config: MapLayerConfig,
  ) {
    if (!material) return

    const targetColor = new Color(color)
    gsap.killTweensOf([material, material.color])
    material.transparent = true
    gsap.to(material.color, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration: config.transition.duration,
      ease: config.transition.ease,
    })
    gsap.to(material, {
      opacity,
      duration: config.transition.duration,
      ease: config.transition.ease,
      onUpdate: () => {
        material.needsUpdate = true
      },
      onComplete: () => {
        material.transparent = opacity < 1
        material.needsUpdate = true
      },
    })
  }

  private applyTransform(config: MapLayerConfig) {
    if (!this.group) return

    this.group.position.copy(toVector3(config.position))
    this.group.scale.copy(toVector3(config.scale))
  }

  private applyVisible(visible: boolean) {
    if (this.group) {
      this.group.visible = visible
    }
  }

  private setMaterialOpacity(opacity: number) {
    this.getMaterials().forEach((material) => {
      material.opacity = opacity
      material.transparent = true
      material.needsUpdate = true
    })
  }

  private getMaterials() {
    return [this.topMaterial, this.sideMaterial, this.borderMaterial].filter(
      (material): material is MapMaterial => Boolean(material),
    )
  }

  private stopAnimations() {
    this.focusTimeline?.kill()
    this.focusTimeline = null

    const targets: unknown[] = []

    if (this.group) {
      targets.push(this.group.position, this.group.scale)
    }

    if (this.extrudeMap?.mapGroup) {
      targets.push(this.extrudeMap.mapGroup.position)
    }

    if (this.borderLine?.lineGroup) {
      targets.push(this.borderLine.lineGroup.position)
    }

    this.getMaterials().forEach((material) => {
      targets.push(material, material.color)
    })

    if (targets.length > 0) {
      gsap.killTweensOf(targets)
    }
  }
}
