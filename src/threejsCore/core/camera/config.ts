import { Vector3 } from 'three'
export type CameraMode = 'perspective' | 'orthographic'
export type Vector3Tuple = [number, number, number]
export type Vector3Value = Vector3 | Vector3Tuple | { x: number; y: number; z: number }

export interface PerspectiveCameraConfig extends CameraConfig {}

export interface OrthographicCameraConfig extends CameraConfig {
  left?: number
  right?: number
  top?: number
  bottom?: number
  frustumSize?: number
}

export interface CameraConfig {
  mod?: CameraMode
  fov?: number
  near?: number
  far?: number
  position?: Vector3Value
  target?: Vector3Value
}
