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
