import { PerspectiveCamera, Vector3 } from 'three'
import type { PerspectiveCameraConfig, Vector3Value } from '../../index'
import type { ResizeInfo } from '../../index'
import { toVector3 } from './utils'
export class PrspectiveCameraImpl {
  readonly mode = 'perspective'
  readonly instance: PerspectiveCamera
  readonly target: Vector3
  constructor(config: PerspectiveCameraConfig, aspect = 1) {
    this.instance = new PerspectiveCamera(
      config.fov ?? 45,
      aspect,
      config.near ?? 0.1,
      config.far ?? 10000
    )
    this.target = toVector3(config.target, new Vector3())
    this.setPosition(config.position ?? [10, 10, 10])
    this.lookAt(this.target)
  }

  lookAt(target: Vector3Value): void {
    this.target.copy(toVector3(target))
    this.instance.lookAt(this.target)
    this.instance.updateProjectionMatrix()
  }

  resize(size: ResizeInfo): void {
    this.instance.aspect = size.aspect
    this.instance.updateProjectionMatrix()
  }

  setPosition(position: Vector3Value): void {
    this.instance.position.copy(toVector3(position))
  }

  get distance(): number {
    return this.instance.position.length()
  }
}
