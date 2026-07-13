import type { Camera, Vector3 } from 'three'
import type { CameraMode, Vector3Value } from '../config'
import type { ResizeInfo } from '../../types'

export interface ICamera<TCamera extends Camera = Camera> {
  readonly mode: CameraMode
  readonly instance: TCamera
  readonly target: Vector3
  lookAt(target: Vector3Value): void
  resize(size: ResizeInfo, halfSize?: { halfWidth: number; halfHeight: number }): void
  setPosition(position: Vector3Value): void
  dispose?(): void
}
