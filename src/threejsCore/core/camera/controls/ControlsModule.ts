import { MathUtils, PerspectiveCamera, Vector3, type Camera } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CoreConfig } from '../../config'
import type { CoreCanvas, IModule, TickInfo } from '../../types'
import { CameraModule } from '../CameraModule'
import {
  CameraAnimator,
  cubicInOut,
  type BoundingSphereValue,
  type CameraOrientation,
  type CameraPose,
  type FlyToBoundingSphereOptions,
  type FlyToOptions,
  type HeadingPitchRange,
  type SetViewOptions
} from '../animation'
import { toVector3 } from '../cameras/utils'
import { DEFAULT_CONTROLS_CONFIG } from './config'
import type { ControlsConfig, ResolvedControlsConfig } from './config'

export class ControlsModule implements IModule<ControlsConfig> {
  readonly id = 'controls'
  readonly name: string = 'controls'
  readonly order: number = -1000
  readonly config: ResolvedControlsConfig
  readonly canvas: CoreCanvas
  readonly camera: CameraModule
  private _instance: OrbitControls | null = null
  private animator: CameraAnimator | null = null
  private readonly worldUp: Vector3
  private started = false

  /**
   * 创建相机控制模块实例。
   */
  constructor(camera: CameraModule, config: CoreConfig) {
    this.camera = camera
    this.config = { ...DEFAULT_CONTROLS_CONFIG, ...config.controls }
    this.canvas = config.canvas
    this.worldUp = toVector3(this.config.worldUp, new Vector3(0, 1, 0))

    if (this.worldUp.lengthSq() === 0) {
      this.worldUp.set(0, 1, 0)
    }

    this.worldUp.normalize()

    this.start()
  }

  /**
   * 初始化相机控制模块所需资源。
   */
  init(): void {
    if (this._instance) return

    const controls = new OrbitControls(this.camera.camera, this.getDomElement())
    this._instance = controls
    this.animator = new CameraAnimator(this.setPose, this.worldUp)

    controls.target.copy(toVector3(this.camera.config.target))
    controls.addEventListener('start', this.handleControlStart)
    this.configureControls(controls)
    controls.update()
  }

  /**
   * 启动相机控制模块。
   */
  start(): void {
    this.init()
    this.started = true

    if (this._instance) {
      this._instance.enabled = this.config.enabled ?? true
    }
  }

  /**
   * 更新相机控制模块的运行状态。
   */
  update(tick: TickInfo): void {
    const controls = this._instance
    if (!controls) return

    this.syncActiveCamera(controls)

    if (this.animator?.isActive) {
      this.animator.update(tick.delta)
      return
    }

    controls.update(tick.delta)
  }

  /**
   * 应用相机控制模块的配置变更。
   */
  updateConfig(config: Partial<ControlsConfig>): void {
    Object.assign(this.config, config)

    if (config.worldUp) {
      const worldUp = toVector3(config.worldUp)

      if (worldUp.lengthSq() > 0) {
        this.worldUp.copy(worldUp).normalize()
        this.animator?.setWorldUp(this.worldUp)
      }
    }

    if (this._instance) {
      this.configureControls(this._instance)
    }
  }

  /**
   * 停止相机控制模块。
   */
  stop(): void {
    this.started = false
    this.cancelFlight()

    if (this._instance) {
      this._instance.enabled = false
    }
  }

  /**
   * 释放相机控制模块持有的资源。
   */
  destroy(): void {
    this.cancelFlight()
    this._instance?.removeEventListener('start', this.handleControlStart)
    this._instance?.dispose()
    this._instance = null
    this.animator = null
  }

  /**
   * 立即设置相机位置和观察目标。
   */
  setView(options: SetViewOptions = {}): void {
    this.ensureInitialized()
    this.flushControlsMotion()
    this.cancelFlight()
    this.setPose(this.resolvePose(options, this.getPose()))
  }

  /**
   * 以动画方式将相机移动到目标姿态。
   */
  flyTo(options: FlyToOptions): void {
    this.ensureInitialized()
    this.flushControlsMotion()
    this.cancelFlight()

    const from = this.getPose()
    const to = this.resolvePose(options, from)

    this.animator?.start(from, to, {
      duration: options.duration ?? this.config.flightDuration ?? 3,
      maximumHeight: options.maximumHeight,
      easingFunction: options.easingFunction ?? cubicInOut,
      complete: options.complete,
      cancel: options.cancel
    })
  }

  /**
   * 将相机朝向指定目标位置。
   */
  lookAt(target: SetViewOptions['target'], offset: HeadingPitchRange = {}): void {
    if (!target) return

    this.ensureInitialized()
    const current = this.getPose()
    const targetVector = toVector3(target)
    const range = Math.max(offset.range ?? current.position.distanceTo(current.target), 0.000001)
    const direction = this.directionFromHeadingPitch(
      offset.heading ?? 0,
      offset.pitch ?? -Math.PI / 4
    )

    this.setView({
      destination: targetVector.clone().addScaledVector(direction, -range),
      target: targetVector
    })
  }

  /**
   * 移动相机以完整容纳指定包围球。
   */
  flyToBoundingSphere(sphere: BoundingSphereValue, options: FlyToBoundingSphereOptions = {}): void {
    const center = toVector3(sphere.center)
    const { offset = {}, ...flightOptions } = options
    const range = offset.range ?? this.getBoundingSphereRange(Math.max(0, sphere.radius))
    const direction = this.directionFromHeadingPitch(
      offset.heading ?? 0,
      offset.pitch ?? -Math.PI / 4
    )

    this.flyTo({
      ...flightOptions,
      destination: center.clone().addScaledVector(direction, -range),
      target: center
    })
  }

  /**
   * 取消正在执行的相机飞行动画。
   */
  cancelFlight(): void {
    this.animator?.cancel()
  }

  /**
   * 立即完成正在执行的相机飞行动画。
   */
  completeFlight(): void {
    this.animator?.complete()
  }

  /**
   * 获取已初始化的轨道控制器实例。
   */
  get instance(): OrbitControls | null {
    return this._instance
  }

  /**
   * 判断相机当前是否处于飞行动画中。
   */
  get isFlying(): boolean {
    return this.animator?.isActive ?? false
  }

  /**
   * 获取控制器当前观察目标的副本。
   */
  get target(): Vector3 {
    return this._instance?.target ?? toVector3(this.camera.config.target)
  }

  /**
   * 确保控制器及其依赖已完成初始化。
   */
  private ensureInitialized(): void {
    if (!this._instance) {
      this.init()
    }
  }

  /**
   * 将当前配置应用到轨道控制器。
   */
  private configureControls(controls: OrbitControls): void {
    controls.enabled = this.started && (this.config.enabled ?? true)
    controls.enableDamping = this.config.enableDamping ?? true
    controls.dampingFactor = this.config.dampingFactor ?? 0.05
    controls.autoRotate = this.config.autoRotate ?? false
    controls.autoRotateSpeed = this.config.autoRotateSpeed ?? 2
    controls.enableZoom = this.config.enableZoom ?? true
    controls.zoomSpeed = this.config.zoomSpeed ?? 1
    controls.minDistance = this.config.minDistance ?? 0
    controls.maxDistance = this.config.maxDistance ?? Infinity
    controls.minZoom = this.config.minZoom ?? 0
    controls.maxZoom = this.config.maxZoom ?? Infinity
    controls.zoomToCursor = this.config.zoomToCursor ?? false
    controls.enablePan = this.config.enablePan ?? true
    controls.panSpeed = this.config.panSpeed ?? 1
    controls.screenSpacePanning = this.config.screenSpacePanning ?? true
    controls.enableRotate = this.config.enableRotate ?? true
    controls.rotateSpeed = this.config.rotateSpeed ?? 1
    controls.minPolarAngle = this.config.minPolarAngle ?? 0
    controls.maxPolarAngle = this.config.maxPolarAngle ?? Math.PI
    controls.minAzimuthAngle = this.config.minAzimuthAngle ?? -Infinity
    controls.maxAzimuthAngle = this.config.maxAzimuthAngle ?? Infinity
  }

  /**
   * 获取控制器监听输入事件的 DOM 元素。
   */
  private getDomElement(): HTMLElement | null {
    if (typeof HTMLElement !== 'undefined' && this.canvas instanceof HTMLElement) {
      return this.canvas
    }

    return null
  }

  /**
   * 读取相机当前位置、目标和朝向信息。
   */
  private getPose(): CameraPose {
    const camera = this.camera.camera

    return {
      position: camera.position.clone(),
      target: this.target.clone(),
      up: camera.up.clone().normalize()
    }
  }

  /**
   * 将相机移动参数解析为完整姿态。
   */
  private resolvePose(options: SetViewOptions, current: CameraPose): CameraPose {
    const destination = options.destination
      ? toVector3(options.destination)
      : current.position.clone()
    const orientation = options.orientation
    const currentOffset = current.target.clone().sub(current.position)
    const currentRange = Math.max(currentOffset.length(), 0.000001)
    const translatedTarget = current.target.clone().add(destination.clone().sub(current.position))
    let target = translatedTarget

    if (options.target) {
      target = toVector3(options.target)
    } else if (orientation?.target) {
      target = toVector3(orientation.target)
    } else if (orientation?.direction) {
      const direction = this.resolveViewDirection(orientation.direction, currentOffset)
      target = destination
        .clone()
        .addScaledVector(direction, Math.max(orientation.range ?? currentRange, 0.000001))
    } else if (this.hasHeadingPitchRoll(orientation)) {
      const direction = this.directionFromHeadingPitch(
        orientation?.heading ?? 0,
        orientation?.pitch ?? -Math.PI / 2
      )
      target = destination
        .clone()
        .addScaledVector(direction, Math.max(orientation?.range ?? currentRange, 0.000001))
    }

    const direction = target.clone().sub(destination)

    if (direction.lengthSq() === 0) {
      direction.copy(currentOffset)

      if (direction.lengthSq() === 0) {
        direction.set(0, 0, -1)
      }

      direction.normalize()
      target = destination.clone().addScaledVector(direction, currentRange)
    } else {
      direction.normalize()
    }
    let up = orientation?.up ? toVector3(orientation.up).normalize() : current.up.clone()

    if (this.hasHeadingPitchRoll(orientation)) {
      up = this.upFromDirectionAndRoll(direction, orientation?.roll ?? 0)
    }

    if (up.lengthSq() === 0) {
      up.copy(this.worldUp)
    }

    return { position: destination, target, up }
  }

  /**
   * 根据目标点或姿态角解析观察方向。
   */
  private resolveViewDirection(
    direction: CameraOrientation['direction'],
    fallback: Vector3
  ): Vector3 {
    const normalized = toVector3(direction)

    if (normalized.lengthSq() === 0) {
      normalized.copy(fallback)
    }

    if (normalized.lengthSq() === 0) {
      normalized.set(0, 0, -1)
    }

    return normalized.normalize()
  }

  /**
   * 判断姿态是否提供完整的航向、俯仰和翻滚角。
   */
  private hasHeadingPitchRoll(orientation?: CameraOrientation): boolean {
    return Boolean(
      orientation &&
        (typeof orientation.heading === 'number' ||
          typeof orientation.pitch === 'number' ||
          typeof orientation.roll === 'number')
    )
  }

  /**
   * 根据航向角和俯仰角计算观察方向。
   */
  private directionFromHeadingPitch(heading: number, pitch: number): Vector3 {
    const cosPitch = Math.cos(pitch)

    return new Vector3(
      Math.sin(heading) * cosPitch,
      Math.sin(pitch),
      -Math.cos(heading) * cosPitch
    ).normalize()
  }

  /**
   * 根据观察方向和翻滚角计算相机向上方向。
   */
  private upFromDirectionAndRoll(direction: Vector3, roll: number): Vector3 {
    const right = new Vector3().crossVectors(direction, this.worldUp)

    if (right.lengthSq() < 0.000001) {
      right.crossVectors(direction, new Vector3(0, 0, 1))
    }

    if (right.lengthSq() < 0.000001) {
      right.set(1, 0, 0)
    }

    right.normalize()

    const up = new Vector3().crossVectors(right, direction).normalize()
    const axisCrossUp = new Vector3().crossVectors(direction, up)
    const cosine = Math.cos(roll)
    const sine = Math.sin(roll)
    const axisProjection = direction.dot(up) * (1 - cosine)

    return up
      .multiplyScalar(cosine)
      .addScaledVector(axisCrossUp, sine)
      .addScaledVector(direction, axisProjection)
      .normalize()
  }

  /**
   * 计算完整显示包围球所需的相机距离。
   */
  private getBoundingSphereRange(radius: number): number {
    const camera = this.camera.camera

    if (camera instanceof PerspectiveCamera) {
      const verticalFov = MathUtils.degToRad(camera.fov)
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
      const limitingFov = Math.min(verticalFov, horizontalFov)
      return radius / Math.max(Math.sin(limitingFov / 2), 0.000001)
    }

    return Math.max(radius * 2, camera.position.distanceTo(this.target))
  }

  /**
   * 清除控制器残留的阻尼运动。
   */
  private flushControlsMotion(): void {
    const controls = this._instance
    if (!controls) return

    const enableDamping = controls.enableDamping
    const autoRotate = controls.autoRotate
    controls.enableDamping = false
    controls.autoRotate = false
    controls.update(0)
    controls.enableDamping = enableDamping
    controls.autoRotate = autoRotate
  }

  /**
   * 将控制器切换到当前激活的相机。
   */
  private syncActiveCamera(controls: OrbitControls): void {
    const activeCamera = this.camera.camera
    if (controls.object === activeCamera) return

    const previousCamera = controls.object as Camera
    const pose: CameraPose = {
      position: previousCamera.position.clone(),
      target: controls.target.clone(),
      up: previousCamera.up.clone()
    }

    controls.object = activeCamera
    this.setPose(pose)
  }

  /**
   * 立即将相机和控制器同步到指定姿态。
   */
  private setPose = (pose: CameraPose): void => {
    const camera = this.camera.camera
    const controls = this._instance

    camera.position.copy(pose.position)
    camera.up.copy(pose.up)
    controls?.target.copy(pose.target)
    camera.lookAt(pose.target)
    camera.updateMatrixWorld()
  }

  /**
   * 在用户开始操作时中止自动相机动画。
   */
  private handleControlStart = (): void => {
    this.cancelFlight()
  }
}
