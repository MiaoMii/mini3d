import { PerspectiveCamera, Vector3 } from 'three'
import type { PerspectiveCameraConfig, Vector3Value } from '../../index'
import type { ResizeInfo } from '../../index'
import { toVector3 } from './utils'
export class PrspectiveCameraImpl {
  readonly mode = 'perspective'
  readonly instance: PerspectiveCamera
  readonly target: Vector3
  /**
   * 创建透视相机实例。
   */
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

  /**
   * 将相机朝向指定目标位置。
   */
  lookAt(target: Vector3Value): void {
    this.target.copy(toVector3(target))
    this.instance.lookAt(this.target)
    this.instance.updateProjectionMatrix()
  }

  /**
   * 根据最新尺寸更新透视相机。
   */
  resize(size: ResizeInfo): void {
    this.instance.aspect = size.aspect
    this.instance.updateProjectionMatrix()
  }

  /**
   * 设置相机位置。
   */
  setPosition(position: Vector3Value): void {
    this.instance.position.copy(toVector3(position))
  }

  /**
   * 获取相机到观察目标的距离。
   */
  get distance(): number {
    return this.instance.position.length()
  }
}
