import type { ColorRepresentation, Vector3Tuple } from 'three'

export interface CubeModuleConfig {
  id?: string
  name?: string
  size?: number
  color?: ColorRepresentation
  position?: Vector3Tuple
  renderOrder?: number
  rotateSpeed?: Vector3Tuple
  transitionDuration?: number
  transitionEase?: string
}
