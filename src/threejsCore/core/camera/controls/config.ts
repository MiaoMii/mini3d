import type { Vector3Value } from '../config'

export interface ControlsConfig {
  enabled?: boolean
  enableDamping?: boolean
  dampingFactor?: number
  autoRotate?: boolean
  autoRotateSpeed?: number
  enableZoom?: boolean
  zoomSpeed?: number
  minDistance?: number
  maxDistance?: number
  minZoom?: number
  maxZoom?: number
  zoomToCursor?: boolean
  enablePan?: boolean
  panSpeed?: number
  screenSpacePanning?: boolean
  enableRotate?: boolean
  rotateSpeed?: number
  minPolarAngle?: number
  maxPolarAngle?: number
  minAzimuthAngle?: number
  maxAzimuthAngle?: number
  flightDuration?: number
  worldUp?: Vector3Value
}

export type ResolvedControlsConfig = Required<ControlsConfig>

export const DEFAULT_CONTROLS_CONFIG: ResolvedControlsConfig = {
  enabled: true,
  enableDamping: true,
  dampingFactor: 0.05,
  autoRotate: false,
  autoRotateSpeed: 2,
  enableZoom: true,
  zoomSpeed: 1,
  minDistance: 2,
  maxDistance: 20000,
  minZoom: 0,
  maxZoom: Infinity,
  zoomToCursor: false,
  enablePan: true,
  panSpeed: 1,
  screenSpacePanning: true,
  enableRotate: true,
  rotateSpeed: 1,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI,
  minAzimuthAngle: -Infinity,
  maxAzimuthAngle: Infinity,
  flightDuration: 3,
  worldUp: [0, 1, 0]
}
