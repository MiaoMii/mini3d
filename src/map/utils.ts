import {
  Box3,
  BufferGeometry,
  Material,
  Mesh,
  Object3D,
  Vector3,
  type Camera,
  type Scene,
} from 'three'
import { geoMercator } from 'd3-geo'
import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  MapProjectionConfig,
  Vec2,
  Vec3,
} from '@/types/map'

type MaybeMesh = Object3D & {
  geometry?: BufferGeometry
  material?: Material | Material[]
}

export interface Mini3dLike {
  canvas: HTMLCanvasElement
  scene: Scene
  camera: {
    instance: Camera
  }
  sizes: unknown
  time: unknown
}

export function toVector3(value: number | Vec3): Vector3 {
  if (Array.isArray(value)) {
    return new Vector3(value[0], value[1], value[2])
  }

  return new Vector3(value, value, value)
}

export function disposeObject3D(object: Object3D) {
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<Material>()

  object.traverse((child) => {
    const mesh = child as MaybeMesh

    if (mesh.geometry) {
      geometries.add(mesh.geometry)
    }

    const material = mesh.material
    if (Array.isArray(material)) {
      material.forEach((item) => materials.add(item))
    } else if (material) {
      materials.add(material)
    }
  })

  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}

export function projectPoint(point: Vec2, projection: MapProjectionConfig): Vec2 {
  const projected = geoMercator()
    .center(projection.center)
    .scale(projection.scale)
    .translate([0, 0])(point)

  return [projected[0], projected[1]]
}

export function parseGeoJson(text: string): GeoJsonFeatureCollection {
  return JSON.parse(text) as GeoJsonFeatureCollection
}

export interface ProjectedGeoJsonPlaneBounds {
  center: Vector3
  size: Vector3
}

export function getProjectedGeoJsonPlaneBounds(
  text: string,
  projection: MapProjectionConfig,
): ProjectedGeoJsonPlaneBounds {
  const mapData = parseGeoJson(text)
  const box = new Box3()

  mapData.features.forEach((feature) => {
    visitCoordinatePairs(feature.geometry.coordinates, (point) => {
      const [x, y] = projectPoint(point, projection)
      box.expandByPoint(new Vector3(x, -y, 0))
    })
  })

  const center = new Vector3()
  const size = new Vector3()
  box.getCenter(center)
  box.getSize(size)

  return { center, size }
}

function visitCoordinatePairs(value: unknown, callback: (point: Vec2) => void) {
  if (!Array.isArray(value)) return

  if (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    callback([value[0], value[1]])
    return
  }

  value.forEach((item) => visitCoordinatePairs(item, callback))
}

export function getFeaturePoint(feature: GeoJsonFeature, field: 'center' | 'centroid'): Vec2 | null {
  const value = feature.properties[field]

  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return [value[0], value[1]]
  }

  if (field === 'centroid') {
    return getFeaturePoint(feature, 'center')
  }

  return null
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function setRenderOrder(object: Object3D, renderOrder: number) {
  object.traverse((child) => {
    if (child instanceof Mesh) {
      child.renderOrder = renderOrder
    }
  })
}
