import { MathUtils, Vector3 } from 'three'
import type { CameraFlightOptions, CameraPose } from './types'

interface ActiveFlight extends CameraFlightOptions {
  elapsed: number
  from: CameraPose
  to: CameraPose
}

const clonePose = (pose: CameraPose): CameraPose => ({
  position: pose.position.clone(),
  target: pose.target.clone(),
  up: pose.up.clone()
})

export class CameraAnimator {
  private flight: ActiveFlight | null = null
  private readonly pose: CameraPose = {
    position: new Vector3(),
    target: new Vector3(),
    up: new Vector3(0, 1, 0)
  }
  private readonly worldUp: Vector3

  constructor(
    private readonly setPose: (pose: CameraPose) => void,
    worldUp = new Vector3(0, 1, 0)
  ) {
    this.worldUp = worldUp.clone().normalize()
  }

  get isActive(): boolean {
    return this.flight !== null
  }

  setWorldUp(worldUp: Vector3): void {
    if (worldUp.lengthSq() > 0) {
      this.worldUp.copy(worldUp).normalize()
    }
  }

  start(from: CameraPose, to: CameraPose, options: CameraFlightOptions): void {
    this.cancel()

    const duration = Number.isFinite(options.duration) ? Math.max(0, options.duration) : 0

    if (duration === 0) {
      this.setPose(to)
      options.complete?.()
      return
    }

    this.flight = {
      ...options,
      duration,
      elapsed: 0,
      from: clonePose(from),
      to: clonePose(to)
    }
  }

  update(delta: number): void {
    const flight = this.flight
    if (!flight) return

    const safeDelta = Number.isFinite(delta) ? Math.max(0, delta) : 0
    flight.elapsed += safeDelta

    const progress = MathUtils.clamp(flight.elapsed / flight.duration, 0, 1)
    const easedProgress = MathUtils.clamp(flight.easingFunction(progress), 0, 1)

    this.pose.position.lerpVectors(flight.from.position, flight.to.position, easedProgress)
    this.pose.target.lerpVectors(flight.from.target, flight.to.target, easedProgress)
    this.pose.up.lerpVectors(flight.from.up, flight.to.up, easedProgress)

    if (this.pose.up.lengthSq() === 0) {
      this.pose.up.copy(this.worldUp)
    } else {
      this.pose.up.normalize()
    }

    if (typeof flight.maximumHeight === 'number') {
      this.setFlightHeight(
        this.pose.position,
        flight.from.position,
        flight.to.position,
        flight.maximumHeight,
        easedProgress
      )
    }

    this.setPose(this.pose)

    if (progress === 1) {
      this.finish(true)
    }
  }

  cancel(): void {
    this.finish(false)
  }

  complete(): void {
    const flight = this.flight
    if (!flight) return

    this.flight = null
    this.setPose(flight.to)
    flight.complete?.()
  }

  private finish(completed: boolean): void {
    const flight = this.flight
    if (!flight) return

    this.flight = null

    if (completed) {
      this.setPose(flight.to)
      flight.complete?.()
    } else {
      flight.cancel?.()
    }
  }

  private setFlightHeight(
    position: Vector3,
    start: Vector3,
    end: Vector3,
    maximumHeight: number,
    progress: number
  ): void {
    const startHeight = start.dot(this.worldUp)
    const endHeight = end.dot(this.worldUp)
    const peakHeight = Math.max(maximumHeight, startHeight, endHeight)
    const height =
      progress <= 0.5
        ? MathUtils.lerp(startHeight, peakHeight, MathUtils.smoothstep(progress * 2, 0, 1))
        : MathUtils.lerp(peakHeight, endHeight, MathUtils.smoothstep((progress - 0.5) * 2, 0, 1))

    position.addScaledVector(this.worldUp, height - position.dot(this.worldUp))
  }
}
