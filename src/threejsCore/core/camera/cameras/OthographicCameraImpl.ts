import { OrthographicCamera, Vector3 } from 'three'
import type { ResizeInfo } from '../../index'
import type { OrthographicCameraConfig, Vector3Value, ICamera } from '../../index'
import { toVector3 } from './utils'

export class OrthographicCameraImpl implements ICamera<OrthographicCamera> {
  readonly mode = 'orthographic'
  readonly instance: OrthographicCamera
  readonly target: Vector3
  private frustumSize: number

  constructor(config: OrthographicCameraConfig = {}, aspect = 1) {
    this.frustumSize = config.frustumSize ?? 20
    this.instance = new OrthographicCamera(0, 0, 0, 0, config.near ?? 0.1, config.far ?? 10000)
    this.target = toVector3(config.target, new Vector3())
    this.setPosition(config.position ?? [0, 0, 0])
    this.resize({
      width: aspect,
      height: 1,
      pixelRatio: 1,
      aspect
    })
    this.lookAt(this.target)
  }

  lookAt(target: Vector3Value): void {
    this.target.copy(toVector3(target))
    this.instance.lookAt(this.target)
    this.instance.updateProjectionMatrix()
  }

  resize(size: ResizeInfo, halfSize?: { halfWidth: number; halfHeight: number }): void {
    const halfHeight = halfSize?.halfHeight ?? this.frustumSize / 2
    const halfWidth = halfSize?.halfWidth ?? halfHeight * size.aspect
    this.instance.left = -halfWidth
    this.instance.right = halfWidth
    this.instance.top = halfHeight
    this.instance.bottom = -halfHeight
    this.instance.updateProjectionMatrix()
  }

  setPosition(position: Vector3Value): void {
    this.instance.position.copy(toVector3(position))
  }
}
